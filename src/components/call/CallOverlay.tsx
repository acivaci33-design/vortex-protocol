/**
 * VORTEX Protocol - Call Overlay Component
 * Full-screen overlay for voice/video calls
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  MonitorUp,
  Maximize2,
  Minimize2,
  MoreVertical,
  User,
  Lock,
  Signal,
  Clock,
} from 'lucide-react';
import { cn, formatDuration, getInitials, stringToColor } from '../../lib/utils';
import { usePeerStore } from '../../stores';

export function CallOverlay() {
  const {
    activeCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleSpeaker,
  } = usePeerStore();

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-hide controls after inactivity
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'active') return;

    let timeout: NodeJS.Timeout;
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
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (!activeCall) return null;

  const isRinging = activeCall.status === 'ringing';
  const isCalling = activeCall.status === 'calling';
  const isActive = activeCall.status === 'active';
  const isEnded = activeCall.status === 'ended';
  const isIncoming = activeCall.direction === 'incoming';
  const isVideo = activeCall.type === 'video';

  const avatarColor = stringToColor(activeCall.peerId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-50 bg-surface-0 flex flex-col',
          isVideo ? 'bg-black' : 'bg-gradient-to-br from-surface-1 to-surface-0'
        )}
      >
        {/* Video Container */}
        {isVideo && isActive && (
          <div className="absolute inset-0">
            {/* Remote Video */}
            <div className="w-full h-full bg-black flex items-center justify-center">
              {activeCall.remoteVideoEnabled ? (
                <video
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  // ref would be set to remote stream
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-semibold"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(activeCall.peerId)}
                  </div>
                  <p className="mt-4 text-white/60">Camera is off</p>
                </div>
              )}
            </div>

            {/* Local Video (PiP) */}
            {activeCall.isVideoEnabled && (
              <motion.div
                drag
                dragMomentum={false}
                className="absolute bottom-24 right-4 w-40 h-56 rounded-xl overflow-hidden bg-surface-2 border border-border shadow-glass cursor-move"
              >
                <video
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  // ref would be set to local stream
                />
              </motion.div>
            )}
          </div>
        )}

        {/* Audio Call UI */}
        {!isVideo && (
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Avatar */}
            <motion.div
              animate={isCalling || isRinging ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="relative"
            >
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-semibold"
                style={{ backgroundColor: avatarColor }}
              >
                {getInitials(activeCall.peerId)}
              </div>
              {(isCalling || isRinging) && (
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-primary"
                  animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.div>

            {/* Name */}
            <h2 className="mt-6 text-2xl font-semibold text-text-primary">
              {activeCall.peerId}
            </h2>

            {/* Status */}
            <p className="mt-2 text-text-secondary">
              {isRinging && isIncoming && 'Incoming call...'}
              {isRinging && !isIncoming && 'Ringing...'}
              {isCalling && 'Calling...'}
              {isActive && formatDuration(activeCall.duration / 1000)}
              {isEnded && 'Call ended'}
            </p>

            {/* Encryption Badge */}
            <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
              <Lock size={12} className="text-success" />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}

        {/* Top Bar */}
        <AnimatePresence>
          {(showControls || !isActive) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent"
            >
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-success" />
                <span className="text-sm text-white/70">Encrypted</span>
              </div>

              {isActive && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-white/70">
                    <Signal size={14} />
                    <span className="text-xs">Good</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/70">
                    <Clock size={14} />
                    <span className="text-sm font-mono">
                      {formatDuration(activeCall.duration / 1000)}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleFullscreen}
                className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Bar */}
        <AnimatePresence>
          {(showControls || !isActive) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent"
            >
              <div className="flex items-center justify-center gap-4">
                {/* Mute */}
                <ControlButton
                  icon={activeCall.isMuted ? MicOff : Mic}
                  active={activeCall.isMuted}
                  onClick={toggleMute}
                  label={activeCall.isMuted ? 'Unmute' : 'Mute'}
                />

                {/* Video Toggle */}
                {isVideo && (
                  <ControlButton
                    icon={activeCall.isVideoEnabled ? Video : VideoOff}
                    active={!activeCall.isVideoEnabled}
                    onClick={toggleVideo}
                    label={activeCall.isVideoEnabled ? 'Stop video' : 'Start video'}
                  />
                )}

                {/* Screen Share */}
                {isActive && (
                  <ControlButton
                    icon={MonitorUp}
                    active={activeCall.isScreenSharing}
                    onClick={toggleScreenShare}
                    label={activeCall.isScreenSharing ? 'Stop sharing' : 'Share screen'}
                  />
                )}

                {/* Speaker */}
                <ControlButton
                  icon={activeCall.isSpeakerOn ? Volume2 : VolumeX}
                  active={!activeCall.isSpeakerOn}
                  onClick={toggleSpeaker}
                  label={activeCall.isSpeakerOn ? 'Speaker off' : 'Speaker on'}
                />

                {/* Accept (incoming only) */}
                {isRinging && isIncoming && (
                  <button
                    onClick={answerCall}
                    className="w-16 h-16 rounded-full bg-success hover:bg-success-hover flex items-center justify-center shadow-glow-green transition-colors"
                  >
                    <Phone size={24} className="text-white" />
                  </button>
                )}

                {/* End Call */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-danger hover:bg-danger-hover flex items-center justify-center shadow-lg transition-colors"
                >
                  <PhoneOff size={24} className="text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function ControlButton({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: React.ElementType;
  active?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
        active
          ? 'bg-white/20 text-white'
          : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
      )}
    >
      <Icon size={20} />
    </button>
  );
}
