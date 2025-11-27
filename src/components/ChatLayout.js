import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar } from './ui/avatar';
import { useP2P } from '../hooks/useP2P';
import { useMedia } from '../hooks/useMedia';
import { FileSender } from '../services/file/FileSender';
import { MessageSquare, Shield, Send, MonitorUp, Mic, MicOff, Square } from 'lucide-react';
export function ChatLayout() {
    const [roomId, setRoomId] = useState('vortex-lab');
    const [connected, setConnected] = useState(false);
    const { micStream, screenStream, startMic, stopMic, startScreen, stopScreen } = useMedia();
    const { peers, messages, sendMessage } = useP2P(roomId, { enabled: connected, micStream, screenStream });
    const peersList = useMemo(() => Object.keys(peers), [peers]);
    const [text, setText] = useState('');
    const [muted, setMuted] = useState(false);
    const [sharing, setSharing] = useState(false);
    return (_jsxs("div", { className: "grid h-screen grid-cols-[280px_1fr_320px]", children: [_jsxs("aside", { className: "border-r border-zinc-800 bg-zinc-950/80 p-4", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2 text-slate-300", children: [_jsx(Shield, { size: 18, className: "text-blue-500" }), _jsx("span", { className: "text-sm", children: "VORTEX SECURE" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Input, { value: roomId, onChange: (e) => setRoomId(e.target.value), placeholder: "Room ID" }), _jsx(Button, { onClick: async () => { setConnected(true); await startMic().catch(() => { }); }, disabled: connected, children: "Join Room" })] }), _jsx("div", { className: "mt-6 text-xs uppercase text-zinc-500", children: "Peers" }), _jsxs("div", { className: "mt-2 space-y-2", children: [peersList.length === 0 && _jsx("div", { className: "text-zinc-600 text-sm", children: "No peers" }), peersList.map((p) => (_jsxs("div", { className: "flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 p-2", children: [_jsx(Avatar, { name: p }), _jsx("div", { className: "truncate text-sm", children: p })] }, p)))] })] }), _jsxs("main", { className: "flex h-screen flex-col", children: [_jsxs("header", { className: "flex items-center justify-between border-b border-zinc-800 px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2 text-slate-200", children: [_jsx(MessageSquare, { size: 18 }), _jsx("span", { className: "font-medium", children: "Room" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "outline", title: "Share Screen", onClick: async () => {
                                            if (!sharing) {
                                                await startScreen().catch(() => { });
                                                setSharing(true);
                                            }
                                            else {
                                                stopScreen();
                                                setSharing(false);
                                            }
                                        }, children: _jsx(MonitorUp, { size: 16 }) }), _jsx(Button, { variant: "outline", title: "Mute", onClick: () => {
                                            if (!muted) {
                                                micStream?.getAudioTracks().forEach((t) => (t.enabled = false));
                                                setMuted(true);
                                            }
                                            else {
                                                micStream?.getAudioTracks().forEach((t) => (t.enabled = true));
                                                setMuted(false);
                                            }
                                        }, children: muted ? _jsx(MicOff, { size: 16 }) : _jsx(Mic, { size: 16 }) }), _jsx(Button, { variant: "outline", title: "Stop Mic", onClick: () => stopMic(), children: _jsx(Square, { size: 16 }) }), _jsx("input", { type: "file", onChange: async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file)
                                                return;
                                            const firstPeerId = peersList[0];
                                            const st = firstPeerId ? peers[firstPeerId] : undefined;
                                            if (firstPeerId && st?.ready && st.sessionKey) {
                                                const sender = new FileSender(st.peer, st.sessionKey, file, 16 * 1024, 64, () => { });
                                                await sender.start();
                                            }
                                            e.currentTarget.value = '';
                                        } })] })] }), _jsx(ScrollArea, { className: "flex-1 bg-zinc-950 p-4", children: _jsx("div", { className: "space-y-3", children: messages.map((m) => (_jsxs("div", { className: "rounded-md border border-zinc-800 bg-zinc-900/60 p-3", children: [_jsxs("div", { className: "text-xs text-zinc-500", children: [new Date(m.createdAt).toLocaleTimeString(), " \u2022 ", m.status] }), _jsx("div", { className: "mt-1 whitespace-pre-wrap break-words text-slate-50", children: m.body })] }, m.id))) }) }), _jsx("div", { className: "border-t border-zinc-800 p-3", children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { value: text, onChange: (e) => setText(e.target.value), placeholder: "Type encrypted message...", onKeyDown: (e) => {
                                        if (e.key === 'Enter' && text.trim() && peersList[0]) {
                                            void sendMessage(peersList[0], text.trim());
                                            setText('');
                                        }
                                    } }), _jsx(Button, { onClick: () => {
                                        if (text.trim() && peersList[0]) {
                                            void sendMessage(peersList[0], text.trim());
                                            setText('');
                                        }
                                    }, children: _jsx(Send, { size: 16 }) })] }) })] }), _jsxs("aside", { className: "border-l border-zinc-800 bg-zinc-950/80 p-4", children: [_jsx("div", { className: "text-sm text-zinc-400", children: "Encrypted. Blind signaling only." }), _jsx("div", { className: "mt-4 text-xs text-zinc-500", children: "Session keys are ephemeral per-peer. Messages use ChaCha20-Poly1305." })] })] }));
}
