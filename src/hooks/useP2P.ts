import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import SimplePeer, { Instance as Peer, SignalData } from 'simple-peer';
import { CryptoService, Role } from '../services/CryptoService';

export interface ChatMessage {
  id: string;
  from: string;
  to?: string;
  createdAt: number;
  body: string;
  status: 'sent' | 'delivered' | 'read';
  ttlMs?: number;
}

export interface FileChunkMeta {
  fileId: string;
  name: string;
  size: number;
  mime: string;
  totalChunks: number;
  chunkSize: number;
}

type SignalPayload = { roomId: string; data: unknown; targetId?: string };

interface PeerState {
  peer: Peer;
  sessionKey?: Uint8Array; // tx/rx will be same size, we use tx for outgoing, rx for incoming depending on role
  role?: Role;
  ephemeral?: { pub: Uint8Array; sec: Uint8Array };
  ready: boolean;
}

export function useP2P(
  roomId: string,
  options?: {
    enabled?: boolean;
    micStream?: MediaStream | null;
    screenStream?: MediaStream | null;
  }
) {
  const signalingUrl = (import.meta as any).env?.VITE_SIGNALING_URL || 'http://localhost:8443';
  const [socket, setSocket] = useState<Socket | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerState>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const myIdRef = useRef<string>('');

  // deterministic role selection
  const selectRole = useCallback((a: string, b: string): Role => {
    return a < b ? 'client' : 'server';
  }, []);

  useEffect(() => {
    if (!options?.enabled) return;
    CryptoService.init();
    const s = io(signalingUrl, { transports: ['websocket'] });
    setSocket(s);

    s.on('connect', () => {
      myIdRef.current = s.id || '';
      s.emit('join-room', { roomId }, (resp: { ok: true; peers: string[] } | { ok: false; error: string }) => {
        if ('ok' in resp && resp.ok) {
          for (const pid of resp.peers) createPeer(pid, true);
        }
      });
    });

    s.on('peer-joined', ({ peerId }: { peerId: string }) => {
      createPeer(peerId, true);
    });

    s.on('peer-left', ({ peerId }: { peerId: string }) => {
      destroyPeer(peerId);
    });

    s.on('signal', ({ from, data, targetId }: { from: string; data: unknown; targetId?: string }) => {
      const st = peersRef.current[from];
      if (st) {
        st.peer.signal(data as SignalData);
      } else {
        // late peer
        createPeer(from, false, data as SignalData);
      }
    });

    return () => {
      s.emit('leave-room', { roomId });
      s.disconnect();
      setSocket(null);
      for (const id of Object.keys(peersRef.current)) destroyPeer(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, signalingUrl, options?.enabled]);

  const peersRef = useRef<Record<string, PeerState>>({});

  const setPeerState = useCallback((id: string, updater: (prev: PeerState) => PeerState) => {
    peersRef.current[id] = updater(peersRef.current[id]);
    setPeers({ ...peersRef.current });
  }, []);

  const createPeer = useCallback((peerId: string, initiator: boolean, initialSignal?: SignalData) => {
    const stun = (import.meta as any).env?.VITE_STUN_URL || 'stun:stun.l.google.com:19302';
    const turnUrl = (import.meta as any).env?.VITE_TURN_URL as string | undefined;
    const turnUser = (import.meta as any).env?.VITE_TURN_USER as string | undefined;
    const turnPass = (import.meta as any).env?.VITE_TURN_PASS as string | undefined;
    const iceServers: RTCIceServer[] = [{ urls: stun }];
    if (turnUrl && turnUser && turnPass) iceServers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
    const p = new SimplePeer({ initiator, trickle: true, config: { iceServers } });
    const role = selectRole(myIdRef.current, peerId);

    const eph = CryptoService.generateKeyPair();

    const state: PeerState = { peer: p, role, ephemeral: { pub: eph.publicKey, sec: eph.privateKey }, ready: false };
    peersRef.current[peerId] = state;
    setPeers({ ...peersRef.current });

    p.on('signal', (data) => {
      const payload: SignalPayload = { roomId, data, targetId: peerId };
      socket?.emit('signal', payload);
    });

    p.on('connect', async () => {
      // send ephemeral pubkey
      const msg = {
        t: 'key_exchange' as const,
        pub: CryptoService.encode(state.ephemeral!.pub),
      };
      p.send(JSON.stringify(msg));

      // attach media tracks if present
      if (options?.micStream) {
        for (const track of options.micStream.getTracks()) p.addTrack(track, options.micStream);
      }
      if (options?.screenStream) {
        for (const track of options.screenStream.getTracks()) p.addTrack(track, options.screenStream);
      }
    });

    const receivers: Record<string, any> = {};
    p.on('data', async (raw: Uint8Array) => {
      try {
        const decoded = new TextDecoder().decode(raw);
        const json = JSON.parse(decoded) as any;
        if (json.t === 'key_exchange') {
          const theirPub = CryptoService.decode(json.pub);
          const { rx, tx } = CryptoService.deriveSessionKeys(
            { publicKey: state.ephemeral!.pub, privateKey: state.ephemeral!.sec },
            theirPub,
            state.role!
          );
          // choose a single symmetric by hashing rx||tx
          const key = await (async () => {
            const concat = new Uint8Array(rx.length + tx.length);
            concat.set(rx, 0); concat.set(tx, rx.length);
            return crypto.subtle.digest('SHA-256', concat).then((buf) => new Uint8Array(buf));
          })();
          state.sessionKey = key;
          state.ready = true;
          setPeers({ ...peersRef.current });
        } else if (json.t === 'cipher') {
          const msgId = json.id as string;
          const nonce = json.n as string; const payload = json.c as string;
          const text = await CryptoService.decryptText(nonce, payload, state.sessionKey!);
          const msg: ChatMessage = {
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
        } else if (json.t === 'ack') {
          const id = json.id as string; const status = json.s as 'delivered' | 'read';
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
        } else if (json.t === 'file_meta') {
          const { FileReceiver } = await import('../services/file/FileReceiver');
          receivers[json.fileId] = new FileReceiver(
            json.fileId,
            json.name,
            json.size,
            json.mime,
            json.totalChunks,
            json.chunkSize,
            state.sessionKey!,
            () => {},
            () => {}
          );
        } else if (json.t === 'file_chunk') {
          const r = receivers[json.fileId];
          if (r) {
            await r.push(json.idx, json.n, json.c);
            p.send(JSON.stringify({ t: 'file_ack', fileId: json.fileId }));
          }
        } else if (json.t === 'file_complete') {
          const r = receivers[json.fileId];
          if (r) await r.assemble();
        }
      } catch (e) {
        // ignore malformed
      }
    });

    p.on('close', () => destroyPeer(peerId));
    p.on('error', () => destroyPeer(peerId));

    if (initialSignal) p.signal(initialSignal);
  }, [roomId, selectRole, socket]);

  const destroyPeer = useCallback((peerId: string) => {
    const st = peersRef.current[peerId];
    if (st) {
      try { st.peer.destroy(); } catch {}
      delete peersRef.current[peerId];
      setPeers({ ...peersRef.current });
    }
  }, []);

  const sendMessage = useCallback(async (peerId: string, body: string, ttlMs?: number) => {
    const st = peersRef.current[peerId];
    if (!st || !st.ready || !st.sessionKey) return false;
    const id = crypto.randomUUID();
    const { nonceB64, payloadB64 } = await CryptoService.encryptText(body, st.sessionKey);
    const packet = JSON.stringify({ t: 'cipher', id, n: nonceB64, c: payloadB64, ttlMs });
    st.peer.send(packet);
    const msg: ChatMessage = {
      id, from: myIdRef.current, to: peerId, createdAt: Date.now(), body, status: 'sent', ttlMs,
    };
    setMessages((prev) => [...prev, msg]);
    if (ttlMs && ttlMs > 0) setTimeout(() => {
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
