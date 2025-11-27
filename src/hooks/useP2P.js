import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { CryptoService } from '../services/CryptoService';
export function useP2P(roomId, options) {
    const signalingUrl = import.meta.env?.VITE_SIGNALING_URL || 'http://localhost:8443';
    const [socket, setSocket] = useState(null);
    const [peers, setPeers] = useState({});
    const [messages, setMessages] = useState([]);
    const myIdRef = useRef('');
    // deterministic role selection
    const selectRole = useCallback((a, b) => {
        return a < b ? 'client' : 'server';
    }, []);
    useEffect(() => {
        if (!options?.enabled)
            return;
        CryptoService.init();
        const s = io(signalingUrl, { transports: ['websocket'] });
        setSocket(s);
        s.on('connect', () => {
            myIdRef.current = s.id || '';
            s.emit('join-room', { roomId }, (resp) => {
                if ('ok' in resp && resp.ok) {
                    for (const pid of resp.peers)
                        createPeer(pid, true);
                }
            });
        });
        s.on('peer-joined', ({ peerId }) => {
            createPeer(peerId, true);
        });
        s.on('peer-left', ({ peerId }) => {
            destroyPeer(peerId);
        });
        s.on('signal', ({ from, data, targetId }) => {
            const st = peersRef.current[from];
            if (st) {
                st.peer.signal(data);
            }
            else {
                // late peer
                createPeer(from, false, data);
            }
        });
        return () => {
            s.emit('leave-room', { roomId });
            s.disconnect();
            setSocket(null);
            for (const id of Object.keys(peersRef.current))
                destroyPeer(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId, signalingUrl, options?.enabled]);
    const peersRef = useRef({});
    const setPeerState = useCallback((id, updater) => {
        peersRef.current[id] = updater(peersRef.current[id]);
        setPeers({ ...peersRef.current });
    }, []);
    const createPeer = useCallback((peerId, initiator, initialSignal) => {
        const stun = import.meta.env?.VITE_STUN_URL || 'stun:stun.l.google.com:19302';
        const turnUrl = import.meta.env?.VITE_TURN_URL;
        const turnUser = import.meta.env?.VITE_TURN_USER;
        const turnPass = import.meta.env?.VITE_TURN_PASS;
        const iceServers = [{ urls: stun }];
        if (turnUrl && turnUser && turnPass)
            iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
        const p = new SimplePeer({ initiator, trickle: true, config: { iceServers } });
        const role = selectRole(myIdRef.current, peerId);
        const eph = CryptoService.generateKeyPair();
        const state = { peer: p, role, ephemeral: { pub: eph.publicKey, sec: eph.privateKey }, ready: false };
        peersRef.current[peerId] = state;
        setPeers({ ...peersRef.current });
        p.on('signal', (data) => {
            const payload = { roomId, data, targetId: peerId };
            socket?.emit('signal', payload);
        });
        p.on('connect', async () => {
            // send ephemeral pubkey
            const msg = {
                t: 'key_exchange',
                pub: CryptoService.encode(state.ephemeral.pub),
            };
            p.send(JSON.stringify(msg));
            // attach media tracks if present
            if (options?.micStream) {
                for (const track of options.micStream.getTracks())
                    p.addTrack(track, options.micStream);
            }
            if (options?.screenStream) {
                for (const track of options.screenStream.getTracks())
                    p.addTrack(track, options.screenStream);
            }
        });
        const receivers = {};
        p.on('data', async (raw) => {
            try {
                const decoded = new TextDecoder().decode(raw);
                const json = JSON.parse(decoded);
                if (json.t === 'key_exchange') {
                    const theirPub = CryptoService.decode(json.pub);
                    const { rx, tx } = CryptoService.deriveSessionKeys({ publicKey: state.ephemeral.pub, privateKey: state.ephemeral.sec }, theirPub, state.role);
                    // choose a single symmetric by hashing rx||tx
                    const key = await (async () => {
                        const concat = new Uint8Array(rx.length + tx.length);
                        concat.set(rx, 0);
                        concat.set(tx, rx.length);
                        return crypto.subtle.digest('SHA-256', concat).then((buf) => new Uint8Array(buf));
                    })();
                    state.sessionKey = key;
                    state.ready = true;
                    setPeers({ ...peersRef.current });
                }
                else if (json.t === 'cipher') {
                    const msgId = json.id;
                    const nonce = json.n;
                    const payload = json.c;
                    const text = await CryptoService.decryptText(nonce, payload, state.sessionKey);
                    const msg = {
                        id: msgId,
                        from: peerId,
                        createdAt: Date.now(),
                        body: text,
                        status: 'delivered',
                    };
                    setMessages((prev) => [...prev, msg]);
                    // delivered ACK
                    p.send(JSON.stringify({ t: 'ack', id: msgId, s: 'delivered' }));
                    if (json.ttlMs && typeof json.ttlMs === 'number' && json.ttlMs > 0) {
                        setTimeout(() => {
                            setMessages((prev) => prev.filter((m) => m.id !== msgId));
                        }, json.ttlMs);
                    }
                }
                else if (json.t === 'ack') {
                    const id = json.id;
                    const status = json.s;
                    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
                }
                else if (json.t === 'file_meta') {
                    const { FileReceiver } = await import('../services/file/FileReceiver');
                    receivers[json.fileId] = new FileReceiver(json.fileId, json.name, json.size, json.mime, json.totalChunks, json.chunkSize, state.sessionKey, () => { }, () => { });
                }
                else if (json.t === 'file_chunk') {
                    const r = receivers[json.fileId];
                    if (r) {
                        await r.push(json.idx, json.n, json.c);
                        p.send(JSON.stringify({ t: 'file_ack', fileId: json.fileId }));
                    }
                }
                else if (json.t === 'file_complete') {
                    const r = receivers[json.fileId];
                    if (r)
                        await r.assemble();
                }
            }
            catch (e) {
                // ignore malformed
            }
        });
        p.on('close', () => destroyPeer(peerId));
        p.on('error', () => destroyPeer(peerId));
        if (initialSignal)
            p.signal(initialSignal);
    }, [roomId, selectRole, socket]);
    const destroyPeer = useCallback((peerId) => {
        const st = peersRef.current[peerId];
        if (st) {
            try {
                st.peer.destroy();
            }
            catch { }
            delete peersRef.current[peerId];
            setPeers({ ...peersRef.current });
        }
    }, []);
    const sendMessage = useCallback(async (peerId, body, ttlMs) => {
        const st = peersRef.current[peerId];
        if (!st || !st.ready || !st.sessionKey)
            return false;
        const id = crypto.randomUUID();
        const { nonceB64, payloadB64 } = await CryptoService.encryptText(body, st.sessionKey);
        const packet = JSON.stringify({ t: 'cipher', id, n: nonceB64, c: payloadB64, ttlMs });
        st.peer.send(packet);
        const msg = {
            id, from: myIdRef.current, to: peerId, createdAt: Date.now(), body, status: 'sent', ttlMs,
        };
        setMessages((prev) => [...prev, msg]);
        if (ttlMs && ttlMs > 0)
            setTimeout(() => {
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            }, ttlMs);
        return true;
    }, []);
    return useMemo(() => ({
        socket,
        peers,
        messages,
        sendMessage,
    }), [socket, peers, messages, sendMessage]);
}
