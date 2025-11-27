/**
 * VORTEX Protocol - useCall Hook
 * Manages voice/video call state and integrates with signaling
 */

import { useEffect, useCallback, useRef } from 'react';
import { callService } from '../services/calls';
import { connectionManager } from '../services/p2p';
import { usePeerStore } from '../stores';
import toast from 'react-hot-toast';

export function useCall() {
  const {
    activeCall,
    startCall: storeStartCall,
    answerCall: storeAnswerCall,
    endCall: storeEndCall,
    setIncomingCall,
    setCallStatus,
    toggleMute: storeToggleMute,
    toggleVideo: storeToggleVideo,
    toggleScreenShare: storeToggleScreenShare,
    toggleSpeaker: storeToggleSpeaker,
  } = usePeerStore();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Start an outgoing call
  const startCall = useCallback(async (peerId: string, conversationId: string, type: 'audio' | 'video') => {
    try {
      // Check if peer is online
      const isOnline = await connectionManager.checkPeerOnline(peerId);
      if (!isOnline) {
        toast.error('User is offline');
        return;
      }

      // Update store first
      storeStartCall(peerId, conversationId, type);

      // Start call via service
      const call = await callService.startCall(peerId, 'Peer', type);

      // Send call request via signaling
      const socket = connectionManager.getSocket();
      if (socket) {
        socket.emit('call-request', {
          targetPeerId: peerId,
          fromPeerId: connectionManager.getMyPeerId(),
          callType: type,
          callId: call.id,
        });
      }

      toast.success('Calling...');
    } catch (error: any) {
      console.error('[useCall] Start call error:', error);
      toast.error(error.message || 'Failed to start call');
      storeEndCall();
    }
  }, [storeStartCall, storeEndCall]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    if (!activeCall || activeCall.direction !== 'incoming') return;

    try {
      storeAnswerCall();

      // Notify caller via signaling
      const socket = connectionManager.getSocket();
      if (socket) {
        socket.emit('call-accept', {
          targetPeerId: activeCall.peerId,
          fromPeerId: connectionManager.getMyPeerId(),
          callId: activeCall.id,
        });
      }

      toast.success('Call connected');
    } catch (error: any) {
      console.error('[useCall] Answer call error:', error);
      toast.error(error.message || 'Failed to answer call');
    }
  }, [activeCall, storeAnswerCall]);

  // End/reject call
  const endCall = useCallback(() => {
    if (!activeCall) return;

    try {
      // Notify peer via signaling
      const socket = connectionManager.getSocket();
      if (socket) {
        socket.emit('call-end', {
          targetPeerId: activeCall.peerId,
          fromPeerId: connectionManager.getMyPeerId(),
          callId: activeCall.id,
        });
      }

      storeEndCall();
      toast('Call ended', { icon: '📞' });
    } catch (error: any) {
      console.error('[useCall] End call error:', error);
    }
  }, [activeCall, storeEndCall]);

  // Set up signaling listeners for incoming calls
  useEffect(() => {
    const socket = connectionManager.getSocket();
    if (!socket) return;

    // Handle incoming call request
    const handleCallRequest = ({ fromPeerId, callType, callId, displayName }: any) => {
      console.log('[useCall] Incoming call from:', fromPeerId);
      
      // If already in a call, auto-reject
      if (activeCall) {
        socket.emit('call-reject', {
          targetPeerId: fromPeerId,
          fromPeerId: connectionManager.getMyPeerId(),
          callId,
          reason: 'busy',
        });
        return;
      }

      // Set incoming call state
      setIncomingCall(fromPeerId, '', callType);

      // Show notification
      toast(`Incoming ${callType} call from ${displayName || 'Unknown'}`, {
        icon: '📞',
        duration: 30000,
      });
    };

    // Handle call accepted
    const handleCallAccepted = ({ fromPeerId, callId }: any) => {
      console.log('[useCall] Call accepted by:', fromPeerId);
      if (activeCall) {
        setCallStatus('active');
        toast.success('Call connected');
      }
    };

    // Handle call rejected
    const handleCallRejected = ({ fromPeerId, callId, reason }: any) => {
      console.log('[useCall] Call rejected:', reason);
      if (activeCall) {
        storeEndCall();
        toast.error(reason === 'busy' ? 'User is busy' : 'Call declined');
      }
    };

    // Handle call ended by peer
    const handleCallEnded = ({ fromPeerId, callId }: any) => {
      console.log('[useCall] Call ended by peer');
      if (activeCall) {
        storeEndCall();
        toast('Call ended', { icon: '📞' });
      }
    };

    socket.on('call-request', handleCallRequest);
    socket.on('call-accepted', handleCallAccepted);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('call-request', handleCallRequest);
      socket.off('call-accepted', handleCallAccepted);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-ended', handleCallEnded);
    };
  }, [activeCall, setIncomingCall, setCallStatus, storeEndCall]);

  // Handle local/remote streams
  useEffect(() => {
    const handleLocalStream = (stream: MediaStream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    const handleRemoteStream = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    callService.on('local-stream', handleLocalStream);
    callService.on('remote-stream', handleRemoteStream);

    return () => {
      callService.off('local-stream', handleLocalStream);
      callService.off('remote-stream', handleRemoteStream);
    };
  }, []);

  return {
    activeCall,
    localVideoRef,
    remoteVideoRef,
    startCall,
    answerCall,
    endCall,
    toggleMute: storeToggleMute,
    toggleVideo: storeToggleVideo,
    toggleScreenShare: storeToggleScreenShare,
    toggleSpeaker: storeToggleSpeaker,
  };
}
