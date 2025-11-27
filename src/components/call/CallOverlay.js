import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Call Overlay Component
 * Full-screen overlay for voice/video calls
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, MonitorUp, Maximize2, Minimize2, Lock, Signal, Clock, } from 'lucide-react';
import { cn, formatDuration, getInitials, stringToColor } from '../../lib/utils';
import { usePeerStore } from '../../stores';
export function CallOverlay() {
    const { activeCall, answerCall, endCall, toggleMute, toggleVideo, toggleScreenShare, toggleSpeaker, } = usePeerStore();
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Auto-hide controls after inactivity
    useEffect(() => {
        if (!activeCall || activeCall.status !== 'active')
            return;
        let timeout;
        const resetTimeout = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);
        };
        resetTimeout();
        window.addEventListener('mousemove', resetTimeout);
        window.addEventListener('touchstart', resetTimeout);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousemove', resetTimeout);
            window.removeEventListener('touchstart', resetTimeout);
        };
    }, [activeCall]);
    // Toggle fullscreen
    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        }
        else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };
    if (!activeCall)
        return null;
    const isRinging = activeCall.status === 'ringing';
    const isCalling = activeCall.status === 'calling';
    const isActive = activeCall.status === 'active';
    const isEnded = activeCall.status === 'ended';
    const isIncoming = activeCall.direction === 'incoming';
    const isVideo = activeCall.type === 'video';
    const avatarColor = stringToColor(activeCall.peerId);
    return (_jsx(AnimatePresence, { children: _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: cn('fixed inset-0 z-50 bg-surface-0 flex flex-col', isVideo ? 'bg-black' : 'bg-gradient-to-br from-surface-1 to-surface-0'), children: [isVideo && isActive && (_jsxs("div", { className: "absolute inset-0", children: [_jsx("div", { className: "w-full h-full bg-black flex items-center justify-center", children: activeCall.remoteVideoEnabled ? (_jsx("video", { autoPlay: true, playsInline: true, className: "w-full h-full object-cover" })) : (_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-semibold", style: { backgroundColor: avatarColor }, children: getInitials(activeCall.peerId) }), _jsx("p", { className: "mt-4 text-white/60", children: "Camera is off" })] })) }), activeCall.isVideoEnabled && (_jsx(motion.div, { drag: true, dragMomentum: false, className: "absolute bottom-24 right-4 w-40 h-56 rounded-xl overflow-hidden bg-surface-2 border border-border shadow-glass cursor-move", children: _jsx("video", { autoPlay: true, playsInline: true, muted: true, className: "w-full h-full object-cover" }) }))] })), !isVideo && (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-center", children: [_jsxs(motion.div, { animate: isCalling || isRinging ? { scale: [1, 1.05, 1] } : {}, transition: { repeat: Infinity, duration: 2 }, className: "relative", children: [_jsx("div", { className: "w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-semibold", style: { backgroundColor: avatarColor }, children: getInitials(activeCall.peerId) }), (isCalling || isRinging) && (_jsx(motion.div, { className: "absolute inset-0 rounded-full border-4 border-primary", animate: { scale: [1, 1.5], opacity: [0.8, 0] }, transition: { repeat: Infinity, duration: 1.5 } }))] }), _jsx("h2", { className: "mt-6 text-2xl font-semibold text-text-primary", children: activeCall.peerId }), _jsxs("p", { className: "mt-2 text-text-secondary", children: [isRinging && isIncoming && 'Incoming call...', isRinging && !isIncoming && 'Ringing...', isCalling && 'Calling...', isActive && formatDuration(activeCall.duration / 1000), isEnded && 'Call ended'] }), _jsxs("div", { className: "mt-4 flex items-center gap-2 text-xs text-text-muted", children: [_jsx(Lock, { size: 12, className: "text-success" }), _jsx("span", { children: "End-to-end encrypted" })] })] })), _jsx(AnimatePresence, { children: (showControls || !isActive) && (_jsxs(motion.div, { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Lock, { size: 14, className: "text-success" }), _jsx("span", { className: "text-sm text-white/70", children: "Encrypted" })] }), isActive && (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-1 text-white/70", children: [_jsx(Signal, { size: 14 }), _jsx("span", { className: "text-xs", children: "Good" })] }), _jsxs("div", { className: "flex items-center gap-1 text-white/70", children: [_jsx(Clock, { size: 14 }), _jsx("span", { className: "text-sm font-mono", children: formatDuration(activeCall.duration / 1000) })] })] })), _jsx("button", { onClick: handleFullscreen, className: "p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors", children: isFullscreen ? _jsx(Minimize2, { size: 18 }) : _jsx(Maximize2, { size: 18 }) })] })) }), _jsx(AnimatePresence, { children: (showControls || !isActive) && (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, className: "absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent", children: _jsxs("div", { className: "flex items-center justify-center gap-4", children: [_jsx(ControlButton, { icon: activeCall.isMuted ? MicOff : Mic, active: activeCall.isMuted, onClick: toggleMute, label: activeCall.isMuted ? 'Unmute' : 'Mute' }), isVideo && (_jsx(ControlButton, { icon: activeCall.isVideoEnabled ? Video : VideoOff, active: !activeCall.isVideoEnabled, onClick: toggleVideo, label: activeCall.isVideoEnabled ? 'Stop video' : 'Start video' })), isActive && (_jsx(ControlButton, { icon: MonitorUp, active: activeCall.isScreenSharing, onClick: toggleScreenShare, label: activeCall.isScreenSharing ? 'Stop sharing' : 'Share screen' })), _jsx(ControlButton, { icon: activeCall.isSpeakerOn ? Volume2 : VolumeX, active: !activeCall.isSpeakerOn, onClick: toggleSpeaker, label: activeCall.isSpeakerOn ? 'Speaker off' : 'Speaker on' }), isRinging && isIncoming && (_jsx("button", { onClick: answerCall, className: "w-16 h-16 rounded-full bg-success hover:bg-success-hover flex items-center justify-center shadow-glow-green transition-colors", children: _jsx(Phone, { size: 24, className: "text-white" }) })), _jsx("button", { onClick: endCall, className: "w-16 h-16 rounded-full bg-danger hover:bg-danger-hover flex items-center justify-center shadow-lg transition-colors", children: _jsx(PhoneOff, { size: 24, className: "text-white" }) })] }) })) })] }) }));
}
function ControlButton({ icon: Icon, active, onClick, label, }) {
    return (_jsx("button", { onClick: onClick, title: label, className: cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors', active
            ? 'bg-white/20 text-white'
            : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'), children: _jsx(Icon, { size: 20 }) }));
}
