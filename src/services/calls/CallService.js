/**
 * VORTEX Protocol - Call Service
 * Manages voice and video calls over WebRTC
 */
import { EventEmitter } from 'eventemitter3';
import SimplePeer from 'simple-peer';
import { identityService } from '../identity';
import { notificationService } from '../notifications';
class CallService extends EventEmitter {
    constructor() {
        super(...arguments);
        this.activeCall = null;
        this.localStream = null;
        this.screenStream = null;
        this.peer = null;
        this.ringtoneInterval = null;
        this.callTimeout = null;
        this.settings = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        };
    }
    // ==================== Call Initiation ====================
    async startCall(peerId, peerName, type) {
        if (this.activeCall) {
            throw new Error('Already in a call');
        }
        const identity = identityService.getIdentity();
        if (!identity)
            throw new Error('No identity');
        // Get local media
        this.localStream = await this.getMediaStream(type);
        // Create call object
        this.activeCall = {
            id: crypto.randomUUID(),
            type,
            status: 'outgoing',
            initiator: true,
            participants: [
                {
                    id: identity.id,
                    displayName: identity.displayName,
                    stream: this.localStream,
                    isMuted: false,
                    isVideoOff: type === 'audio',
                    isScreenSharing: false,
                },
                {
                    id: peerId,
                    displayName: peerName,
                    isMuted: false,
                    isVideoOff: true,
                    isScreenSharing: false,
                },
            ],
            startedAt: Date.now(),
        };
        // Create peer connection
        this.peer = new SimplePeer({
            initiator: true,
            stream: this.localStream,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });
        this.setupPeerListeners();
        // Set timeout for unanswered call
        this.callTimeout = setTimeout(() => {
            if (this.activeCall?.status === 'outgoing') {
                this.endCall('timeout');
            }
        }, 60000); // 60 seconds timeout
        this.emit('call-started', this.activeCall);
        return this.activeCall;
    }
    async answerCall(callId, signalData) {
        if (!this.activeCall || this.activeCall.id !== callId) {
            throw new Error('No matching incoming call');
        }
        // Get local media
        this.localStream = await this.getMediaStream(this.activeCall.type);
        // Update local participant
        const identity = identityService.getIdentity();
        if (identity) {
            const localParticipant = this.activeCall.participants.find(p => p.id === identity.id);
            if (localParticipant) {
                localParticipant.stream = this.localStream;
            }
        }
        // Create peer connection (answerer)
        this.peer = new SimplePeer({
            initiator: false,
            stream: this.localStream,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });
        this.setupPeerListeners();
        this.peer.signal(signalData);
        this.activeCall.status = 'connecting';
        this.stopRingtone();
        this.emit('call-answered', this.activeCall);
    }
    declineCall() {
        if (!this.activeCall || this.activeCall.status !== 'incoming') {
            return;
        }
        this.endCall('declined');
    }
    // ==================== Incoming Call Handling ====================
    handleIncomingCall(callId, callerId, callerName, type, signalData) {
        if (this.activeCall) {
            // Already in a call - send busy signal
            this.emit('call-busy', { callId, callerId });
            return;
        }
        const identity = identityService.getIdentity();
        if (!identity)
            return;
        this.activeCall = {
            id: callId,
            type,
            status: 'incoming',
            initiator: false,
            participants: [
                {
                    id: identity.id,
                    displayName: identity.displayName,
                    isMuted: false,
                    isVideoOff: type === 'audio',
                    isScreenSharing: false,
                },
                {
                    id: callerId,
                    displayName: callerName,
                    isMuted: false,
                    isVideoOff: true,
                    isScreenSharing: false,
                },
            ],
            startedAt: Date.now(),
        };
        // Store signal data for when user answers
        this.activeCall._pendingSignal = signalData;
        // Start ringtone
        this.startRingtone();
        // Show notification
        notificationService.showCall(callerName, type === 'video');
        // Set timeout for unanswered call
        this.callTimeout = setTimeout(() => {
            if (this.activeCall?.status === 'incoming') {
                this.endCall('timeout');
            }
        }, 45000); // 45 seconds timeout
        this.emit('incoming-call', this.activeCall);
    }
    // ==================== Call Control ====================
    endCall(reason = 'ended') {
        if (!this.activeCall)
            return;
        this.activeCall.status = 'ended';
        this.activeCall.endedAt = Date.now();
        this.activeCall.endReason = reason;
        this.cleanup();
        this.emit('call-ended', this.activeCall);
        this.activeCall = null;
    }
    toggleMute() {
        if (!this.localStream)
            return false;
        const audioTracks = this.localStream.getAudioTracks();
        const newState = !audioTracks[0]?.enabled;
        audioTracks.forEach(track => {
            track.enabled = !newState;
        });
        // Update participant state
        const identity = identityService.getIdentity();
        if (identity && this.activeCall) {
            const participant = this.activeCall.participants.find(p => p.id === identity.id);
            if (participant) {
                participant.isMuted = newState;
            }
        }
        this.emit('mute-changed', newState);
        return newState;
    }
    toggleVideo() {
        if (!this.localStream)
            return false;
        const videoTracks = this.localStream.getVideoTracks();
        const newState = !videoTracks[0]?.enabled;
        videoTracks.forEach(track => {
            track.enabled = !newState;
        });
        // Update participant state
        const identity = identityService.getIdentity();
        if (identity && this.activeCall) {
            const participant = this.activeCall.participants.find(p => p.id === identity.id);
            if (participant) {
                participant.isVideoOff = newState;
            }
        }
        this.emit('video-changed', newState);
        return newState;
    }
    async toggleScreenShare() {
        const identity = identityService.getIdentity();
        if (!identity || !this.activeCall)
            return false;
        const participant = this.activeCall.participants.find(p => p.id === identity.id);
        if (!participant)
            return false;
        if (participant.isScreenSharing) {
            // Stop screen sharing
            this.screenStream?.getTracks().forEach(track => track.stop());
            this.screenStream = null;
            participant.isScreenSharing = false;
            // Revert to camera
            if (this.localStream && this.peer) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                if (videoTrack) {
                    const peerAny = this.peer;
                    if (peerAny._senderMap) {
                        this.peer.replaceTrack(peerAny.streams?.[0]?.getVideoTracks()[0], videoTrack, this.localStream);
                    }
                }
            }
            this.emit('screen-share-changed', false);
            return false;
        }
        else {
            // Start screen sharing
            try {
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false,
                });
                participant.isScreenSharing = true;
                // Replace video track
                if (this.peer && this.localStream) {
                    const screenTrack = this.screenStream.getVideoTracks()[0];
                    const peerAny = this.peer;
                    this.peer.replaceTrack(peerAny.streams?.[0]?.getVideoTracks()[0], screenTrack, this.localStream);
                    // Handle screen share end
                    screenTrack.onended = () => {
                        this.toggleScreenShare();
                    };
                }
                this.emit('screen-share-changed', true);
                return true;
            }
            catch (error) {
                console.error('[Call] Screen share error:', error);
                return false;
            }
        }
    }
    // ==================== Media Management ====================
    async getMediaStream(type) {
        const constraints = {
            audio: {
                echoCancellation: this.settings.echoCancellation,
                noiseSuppression: this.settings.noiseSuppression,
                autoGainControl: this.settings.autoGainControl,
                deviceId: this.settings.audioInput ? { exact: this.settings.audioInput } : undefined,
            },
            video: type === 'video' ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                deviceId: this.settings.videoInput ? { exact: this.settings.videoInput } : undefined,
            } : false,
        };
        return navigator.mediaDevices.getUserMedia(constraints);
    }
    async getAvailableDevices() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInputs: devices.filter(d => d.kind === 'audioinput'),
            audioOutputs: devices.filter(d => d.kind === 'audiooutput'),
            videoInputs: devices.filter(d => d.kind === 'videoinput'),
        };
    }
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    getSettings() {
        return { ...this.settings };
    }
    // ==================== Peer Connection ====================
    setupPeerListeners() {
        if (!this.peer)
            return;
        this.peer.on('signal', (data) => {
            this.emit('signal', {
                callId: this.activeCall?.id,
                signal: data,
            });
        });
        this.peer.on('connect', () => {
            if (this.activeCall) {
                this.activeCall.status = 'connected';
                this.activeCall.connectedAt = Date.now();
                this.clearTimeout();
                this.emit('call-connected', this.activeCall);
            }
        });
        this.peer.on('stream', (stream) => {
            if (this.activeCall) {
                const remotePeer = this.activeCall.participants.find(p => p.id !== identityService.getIdentity()?.id);
                if (remotePeer) {
                    remotePeer.stream = stream;
                    this.emit('remote-stream', { peerId: remotePeer.id, stream });
                }
            }
        });
        this.peer.on('close', () => {
            this.endCall('ended');
        });
        this.peer.on('error', (error) => {
            console.error('[Call] Peer error:', error);
            this.endCall('failed');
        });
    }
    handleSignal(signalData) {
        if (this.peer) {
            this.peer.signal(signalData);
        }
    }
    // ==================== Utilities ====================
    cleanup() {
        // Stop all tracks
        this.localStream?.getTracks().forEach(track => track.stop());
        this.screenStream?.getTracks().forEach(track => track.stop());
        // Destroy peer
        this.peer?.destroy();
        // Clear timers
        this.stopRingtone();
        this.clearTimeout();
        // Reset state
        this.localStream = null;
        this.screenStream = null;
        this.peer = null;
    }
    startRingtone() {
        // In a real app, play an audio file
        this.ringtoneInterval = setInterval(() => {
            notificationService.playSound('call');
        }, 2000);
        notificationService.playSound('call');
    }
    stopRingtone() {
        if (this.ringtoneInterval) {
            clearInterval(this.ringtoneInterval);
            this.ringtoneInterval = null;
        }
    }
    clearTimeout() {
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }
    }
    getActiveCall() {
        return this.activeCall;
    }
    isInCall() {
        return this.activeCall !== null &&
            ['outgoing', 'incoming', 'connecting', 'connected'].includes(this.activeCall.status);
    }
    getCallDuration() {
        if (!this.activeCall?.connectedAt)
            return 0;
        const endTime = this.activeCall.endedAt || Date.now();
        return endTime - this.activeCall.connectedAt;
    }
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }
}
// Singleton instance
export const callService = new CallService();
export default callService;
