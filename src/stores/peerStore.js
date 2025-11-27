/**
 * VORTEX Protocol - Peer Store
 * Manages P2P connections, WebRTC state, and peer presence
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
const initialSignalingState = {
    connected: false,
    socketId: null,
    serverUrl: 'http://localhost:8443',
    reconnectAttempts: 0,
};
const initialMediaState = {
    microphoneEnabled: false,
    cameraEnabled: false,
    screenShareEnabled: false,
    microphoneStream: null,
    cameraStream: null,
    screenStream: null,
    selectedMicrophoneId: null,
    selectedCameraId: null,
    selectedSpeakerId: null,
    availableDevices: [],
};
const initialState = {
    connections: {},
    activeCall: null,
    signaling: initialSignalingState,
    media: initialMediaState,
    currentRoomId: null,
};
export const usePeerStore = create()(immer((set, get) => ({
    ...initialState,
    // Computed
    connectedPeers: () => {
        const { connections } = get();
        return Object.values(connections).filter(c => c.status === 'connected' && c.isReady);
    },
    isInCall: () => {
        const { activeCall } = get();
        return activeCall !== null && ['calling', 'ringing', 'active'].includes(activeCall.status);
    },
    // Connection Actions
    addConnection: (peerId, role) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => {
            state.connections[id] = {
                id,
                peerId,
                peer: null,
                status: 'connecting',
                role,
                isReady: false,
                createdAt: now,
                lastActivity: now,
                iceCandidates: [],
                localStreams: [],
                remoteStreams: [],
                dataChannelOpen: false,
            };
        });
        return id;
    },
    updateConnection: (connectionId, updates) => {
        set((state) => {
            if (state.connections[connectionId]) {
                Object.assign(state.connections[connectionId], updates, {
                    lastActivity: Date.now(),
                });
            }
        });
    },
    removeConnection: (connectionId) => {
        set((state) => {
            const conn = state.connections[connectionId];
            if (conn) {
                // Cleanup streams
                conn.localStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
                conn.remoteStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
                // Destroy peer
                try {
                    conn.peer?.destroy();
                }
                catch { }
                delete state.connections[connectionId];
            }
        });
    },
    setConnectionReady: (connectionId, sessionKey) => {
        set((state) => {
            if (state.connections[connectionId]) {
                state.connections[connectionId].sessionKey = sessionKey;
                state.connections[connectionId].isReady = true;
                state.connections[connectionId].status = 'connected';
                state.connections[connectionId].connectedAt = Date.now();
            }
        });
    },
    setPeerInstance: (connectionId, peer) => {
        set((state) => {
            if (state.connections[connectionId]) {
                state.connections[connectionId].peer = peer;
            }
        });
    },
    addRemoteStream: (connectionId, stream) => {
        set((state) => {
            if (state.connections[connectionId]) {
                const existing = state.connections[connectionId].remoteStreams.find((s) => s.id === stream.id);
                if (!existing) {
                    state.connections[connectionId].remoteStreams.push(stream);
                }
            }
        });
    },
    removeRemoteStream: (connectionId, streamId) => {
        set((state) => {
            if (state.connections[connectionId]) {
                state.connections[connectionId].remoteStreams =
                    state.connections[connectionId].remoteStreams.filter((s) => s.id !== streamId);
            }
        });
    },
    // Signaling Actions
    setSignalingConnected: (connected, socketId) => {
        set((state) => {
            state.signaling.connected = connected;
            state.signaling.socketId = socketId ?? null;
            if (connected) {
                state.signaling.lastError = undefined;
            }
        });
    },
    setSignalingError: (error) => {
        set((state) => {
            state.signaling.lastError = error;
        });
    },
    incrementReconnectAttempts: () => {
        set((state) => {
            state.signaling.reconnectAttempts++;
        });
    },
    resetReconnectAttempts: () => {
        set((state) => {
            state.signaling.reconnectAttempts = 0;
        });
    },
    setServerUrl: (url) => {
        set((state) => {
            state.signaling.serverUrl = url;
        });
    },
    // Room Actions
    joinRoom: (roomId) => {
        set((state) => {
            state.currentRoomId = roomId;
        });
    },
    leaveRoom: () => {
        const { connections } = get();
        // Cleanup all connections
        Object.keys(connections).forEach(id => {
            get().removeConnection(id);
        });
        set((state) => {
            state.currentRoomId = null;
        });
    },
    // Call Actions
    startCall: (peerId, conversationId, type) => {
        set((state) => {
            state.activeCall = {
                id: crypto.randomUUID(),
                peerId,
                conversationId,
                type,
                status: 'calling',
                direction: 'outgoing',
                startedAt: Date.now(),
                duration: 0,
                isMuted: false,
                isVideoEnabled: type === 'video',
                isScreenSharing: false,
                isSpeakerOn: true,
                remoteAudioEnabled: true,
                remoteVideoEnabled: type === 'video',
            };
        });
    },
    setIncomingCall: (peerId, conversationId, type) => {
        set((state) => {
            state.activeCall = {
                id: crypto.randomUUID(),
                peerId,
                conversationId,
                type,
                status: 'ringing',
                direction: 'incoming',
                startedAt: Date.now(),
                duration: 0,
                isMuted: false,
                isVideoEnabled: type === 'video',
                isScreenSharing: false,
                isSpeakerOn: true,
                remoteAudioEnabled: true,
                remoteVideoEnabled: type === 'video',
            };
        });
    },
    answerCall: () => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.status = 'active';
                state.activeCall.connectedAt = Date.now();
            }
        });
    },
    endCall: () => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.status = 'ended';
                state.activeCall.endedAt = Date.now();
            }
            // Clear after brief delay for UI
            setTimeout(() => {
                set((s) => {
                    s.activeCall = null;
                });
            }, 1000);
        });
    },
    setCallStatus: (status) => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.status = status;
                if (status === 'active' && !state.activeCall.connectedAt) {
                    state.activeCall.connectedAt = Date.now();
                }
            }
        });
    },
    toggleMute: () => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.isMuted = !state.activeCall.isMuted;
            }
        });
        // Actually mute/unmute the microphone track
        const { media, activeCall } = get();
        if (media.microphoneStream && activeCall) {
            media.microphoneStream.getAudioTracks().forEach((track) => {
                track.enabled = !activeCall.isMuted;
            });
        }
    },
    toggleVideo: () => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.isVideoEnabled = !state.activeCall.isVideoEnabled;
            }
        });
        const { media, activeCall } = get();
        if (media.cameraStream && activeCall) {
            media.cameraStream.getVideoTracks().forEach((track) => {
                track.enabled = activeCall.isVideoEnabled;
            });
        }
    },
    toggleScreenShare: () => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.isScreenSharing = !state.activeCall.isScreenSharing;
            }
        });
    },
    toggleSpeaker: () => {
        set((state) => {
            if (state.activeCall) {
                state.activeCall.isSpeakerOn = !state.activeCall.isSpeakerOn;
            }
        });
    },
    updateCallDuration: () => {
        set((state) => {
            if (state.activeCall?.connectedAt) {
                state.activeCall.duration = Date.now() - state.activeCall.connectedAt;
            }
        });
    },
    // Media Actions
    setMicrophoneStream: (stream) => {
        set((state) => {
            // Stop old stream
            state.media.microphoneStream?.getTracks().forEach((t) => t.stop());
            state.media.microphoneStream = stream;
            state.media.microphoneEnabled = stream !== null;
        });
    },
    setCameraStream: (stream) => {
        set((state) => {
            state.media.cameraStream?.getTracks().forEach((t) => t.stop());
            state.media.cameraStream = stream;
            state.media.cameraEnabled = stream !== null;
        });
    },
    setScreenStream: (stream) => {
        set((state) => {
            state.media.screenStream?.getTracks().forEach((t) => t.stop());
            state.media.screenStream = stream;
            state.media.screenShareEnabled = stream !== null;
        });
    },
    setSelectedDevices: (devices) => {
        set((state) => {
            if (devices.mic !== undefined)
                state.media.selectedMicrophoneId = devices.mic;
            if (devices.camera !== undefined)
                state.media.selectedCameraId = devices.camera;
            if (devices.speaker !== undefined)
                state.media.selectedSpeakerId = devices.speaker;
        });
    },
    updateAvailableDevices: (devices) => {
        set((state) => {
            state.media.availableDevices = devices;
        });
    },
    enableMicrophone: (enabled) => {
        set((state) => {
            state.media.microphoneEnabled = enabled;
            state.media.microphoneStream?.getAudioTracks().forEach((t) => {
                t.enabled = enabled;
            });
        });
    },
    enableCamera: (enabled) => {
        set((state) => {
            state.media.cameraEnabled = enabled;
            state.media.cameraStream?.getVideoTracks().forEach((t) => {
                t.enabled = enabled;
            });
        });
    },
    enableScreenShare: (enabled) => {
        set((state) => {
            state.media.screenShareEnabled = enabled;
        });
    },
    // Cleanup
    reset: () => {
        const { connections, media } = get();
        // Cleanup all connections
        Object.keys(connections).forEach(id => {
            get().removeConnection(id);
        });
        // Cleanup media streams
        media.microphoneStream?.getTracks().forEach((t) => t.stop());
        media.cameraStream?.getTracks().forEach((t) => t.stop());
        media.screenStream?.getTracks().forEach((t) => t.stop());
        set(initialState);
    },
    cleanupStaleConnections: () => {
        const threshold = Date.now() - 60000; // 1 minute
        const { connections } = get();
        Object.entries(connections).forEach(([id, conn]) => {
            if (conn.status === 'connecting' && conn.createdAt < threshold) {
                get().removeConnection(id);
            }
        });
    },
})));
// Call duration update interval
let callDurationInterval = null;
usePeerStore.subscribe((state, prevState) => {
    if (state.activeCall?.status === 'active' && prevState.activeCall?.status !== 'active') {
        callDurationInterval = setInterval(() => {
            usePeerStore.getState().updateCallDuration();
        }, 1000);
    }
    else if (state.activeCall?.status !== 'active' && callDurationInterval) {
        clearInterval(callDurationInterval);
        callDurationInterval = null;
    }
});
// Stale connection cleanup
setInterval(() => {
    usePeerStore.getState().cleanupStaleConnections();
}, 30000);
