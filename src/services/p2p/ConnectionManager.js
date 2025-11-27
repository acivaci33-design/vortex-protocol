/**
 * VORTEX Protocol - P2P Connection Manager
 * Manages WebRTC peer connections and signaling
 */
import SimplePeer from 'simple-peer';
import { io } from 'socket.io-client';
import { identityService } from '../identity';
import { db } from '../database';
import { EventEmitter } from 'eventemitter3';
class ConnectionManager extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.peers = new Map();
        this.status = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.myPeerId = '';
        this.currentRoom = null;
        this.signalingUrl = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001';
    }
    // ==================== Connection Management ====================
    async connect() {
        if (this.status === 'connected' || this.status === 'connecting')
            return;
        this.status = 'connecting';
        this.emit('status-change', this.status);
        try {
            const identity = identityService.getIdentity();
            if (!identity)
                throw new Error('No identity');
            this.myPeerId = identity.id;
            console.log('[P2P] Connecting to signaling server:', this.signalingUrl);
            this.socket = io(this.signalingUrl, {
                transports: ['websocket', 'polling'],
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                auth: {
                    peerId: this.myPeerId,
                    publicKey: identity.publicKey,
                },
            });
            this.setupSocketListeners();
            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
                this.socket.once('connect', () => {
                    clearTimeout(timeout);
                    this.status = 'connected';
                    this.reconnectAttempts = 0;
                    this.emit('status-change', this.status);
                    console.log('[P2P] Connected to signaling server');
                    resolve();
                });
                this.socket.once('connect_error', (err) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });
        }
        catch (error) {
            console.error('[P2P] Connection failed:', error);
            this.status = 'disconnected';
            this.emit('status-change', this.status);
            throw error;
        }
    }
    disconnect() {
        this.socket?.disconnect();
        this.peers.forEach((conn) => conn.peer.destroy());
        this.peers.clear();
        this.status = 'disconnected';
        this.currentRoom = null;
        this.emit('status-change', this.status);
        console.log('[P2P] Disconnected');
    }
    getStatus() {
        return this.status;
    }
    getMyPeerId() {
        return this.myPeerId;
    }
    // ==================== Room Management ====================
    async joinRoom(roomId) {
        if (!this.socket || this.status !== 'connected') {
            throw new Error('Not connected to signaling server');
        }
        return new Promise((resolve, reject) => {
            this.socket.emit('join-room', { roomId }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }
                this.currentRoom = roomId;
                console.log('[P2P] Joined room:', roomId, 'peers:', response.peers);
                // Initiate connections to existing peers
                response.peers.forEach((peerId) => {
                    if (peerId !== this.myPeerId) {
                        this.initiatePeerConnection(peerId, true);
                    }
                });
                resolve(response.peers);
            });
        });
    }
    leaveRoom() {
        if (!this.socket || !this.currentRoom)
            return;
        this.socket.emit('leave-room', { roomId: this.currentRoom });
        // Close all peer connections
        this.peers.forEach((conn) => conn.peer.destroy());
        this.peers.clear();
        this.currentRoom = null;
        console.log('[P2P] Left room');
    }
    getCurrentRoom() {
        return this.currentRoom;
    }
    // ==================== Peer Connections ====================
    initiatePeerConnection(peerId, initiator) {
        if (this.peers.has(peerId)) {
            console.log('[P2P] Already connected to peer:', peerId);
            return;
        }
        console.log('[P2P] Initiating connection to peer:', peerId, 'initiator:', initiator);
        const peer = new SimplePeer({
            initiator,
            trickle: true,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                ],
            },
        });
        const connection = {
            id: crypto.randomUUID(),
            peerId,
            peer,
            status: 'connecting',
            lastSeen: Date.now(),
        };
        this.peers.set(peerId, connection);
        this.setupPeerListeners(connection);
    }
    setupPeerListeners(connection) {
        const { peer, peerId } = connection;
        peer.on('signal', (data) => {
            // Send signal to peer through signaling server
            if (!this.socket)
                return;
            // Determine signal type and send appropriately
            if (data.type === 'offer') {
                this.socket.emit('signal-offer', {
                    targetPeerId: peerId,
                    signal: data,
                    fromPeerId: this.myPeerId,
                });
            }
            else if (data.type === 'answer') {
                this.socket.emit('signal-answer', {
                    targetPeerId: peerId,
                    signal: data,
                    fromPeerId: this.myPeerId,
                });
            }
            else if (data.candidate) {
                this.socket.emit('signal-ice', {
                    targetPeerId: peerId,
                    candidate: data.candidate,
                    fromPeerId: this.myPeerId,
                });
            }
            else {
                // Fallback for other signal types
                this.socket.emit('signal', {
                    to: peerId,
                    signal: data,
                });
            }
        });
        peer.on('connect', () => {
            console.log('[P2P] Connected to peer:', peerId);
            connection.status = 'connected';
            connection.lastSeen = Date.now();
            this.emit('peer-connected', peerId);
            // Send any pending messages
            this.sendPendingMessages(peerId);
        });
        peer.on('data', (data) => {
            try {
                const message = JSON.parse(new TextDecoder().decode(data));
                this.handlePeerMessage(peerId, message);
            }
            catch (error) {
                console.error('[P2P] Failed to parse message:', error);
            }
        });
        peer.on('close', () => {
            console.log('[P2P] Peer connection closed:', peerId);
            connection.status = 'disconnected';
            this.emit('peer-disconnected', peerId);
            this.peers.delete(peerId);
        });
        peer.on('error', (error) => {
            console.error('[P2P] Peer error:', peerId, error);
            connection.status = 'failed';
            this.emit('peer-error', peerId, error);
        });
    }
    setupSocketListeners() {
        if (!this.socket)
            return;
        // Register with signaling server
        const identity = identityService.getIdentity();
        if (identity) {
            this.socket.emit('register', {
                peerId: this.myPeerId,
                publicKey: identity.publicKey,
                displayName: identity.displayName,
            });
        }
        // Registration confirmed
        this.socket.on('registered', ({ peerId, onlineCount }) => {
            console.log('[P2P] Registered with signaling server, online users:', onlineCount);
            this.emit('registered', { peerId, onlineCount });
        });
        // Handle incoming WebRTC offer
        this.socket.on('signal-offer', ({ fromPeerId, signal }) => {
            console.log('[P2P] Received offer from:', fromPeerId);
            let connection = this.peers.get(fromPeerId);
            if (!connection) {
                this.initiatePeerConnection(fromPeerId, false);
                connection = this.peers.get(fromPeerId);
            }
            if (connection) {
                connection.peer.signal(signal);
            }
        });
        // Handle incoming WebRTC answer
        this.socket.on('signal-answer', ({ fromPeerId, signal }) => {
            console.log('[P2P] Received answer from:', fromPeerId);
            const connection = this.peers.get(fromPeerId);
            if (connection) {
                connection.peer.signal(signal);
            }
        });
        // Handle incoming ICE candidate
        this.socket.on('signal-ice', ({ fromPeerId, candidate }) => {
            const connection = this.peers.get(fromPeerId);
            if (connection) {
                connection.peer.signal({ candidate });
            }
        });
        // Handle peer online status
        this.socket.on('user-online', ({ peerId, displayName }) => {
            console.log('[P2P] User came online:', peerId, displayName);
            this.emit('peer-online', { peerId, displayName });
        });
        this.socket.on('user-offline', ({ peerId }) => {
            console.log('[P2P] User went offline:', peerId);
            const connection = this.peers.get(peerId);
            if (connection) {
                connection.peer.destroy();
                this.peers.delete(peerId);
            }
            this.emit('peer-offline', { peerId });
        });
        // Handle peer offline response
        this.socket.on('peer-offline', ({ peerId }) => {
            console.log('[P2P] Peer is offline:', peerId);
            this.emit('peer-offline', { peerId });
        });
        // Handle online status check response
        this.socket.on('online-status', ({ peerId, online, publicKey }) => {
            this.emit('online-status', { peerId, online, publicKey });
        });
        // Handle relayed messages (fallback when P2P fails)
        this.socket.on('relayed-message', ({ fromPeerId, message }) => {
            this.handlePeerMessage(fromPeerId, message);
        });
        // Handle message relay failure
        this.socket.on('message-failed', ({ targetPeerId, reason, messageId }) => {
            console.log('[P2P] Message failed:', messageId, reason);
            this.emit('message-failed', { targetPeerId, reason, messageId });
        });
        // Handle typing indicators via relay
        this.socket.on('typing', ({ fromPeerId, isTyping }) => {
            this.emit('typing', { peerId: fromPeerId, isTyping });
        });
        // Legacy room-based events
        this.socket.on('signal', ({ from, signal }) => {
            let connection = this.peers.get(from);
            if (!connection) {
                this.initiatePeerConnection(from, false);
                connection = this.peers.get(from);
            }
            if (connection) {
                connection.peer.signal(signal);
            }
        });
        this.socket.on('peer-joined', ({ peerId }) => {
            if (peerId !== this.myPeerId) {
                this.initiatePeerConnection(peerId, true);
            }
        });
        this.socket.on('peer-left', ({ peerId }) => {
            const connection = this.peers.get(peerId);
            if (connection) {
                connection.peer.destroy();
                this.peers.delete(peerId);
                this.emit('peer-disconnected', peerId);
            }
        });
        // Handle reconnection
        this.socket.on('disconnect', () => {
            console.log('[P2P] Disconnected from signaling server');
            this.status = 'reconnecting';
            this.emit('status-change', this.status);
        });
        this.socket.on('reconnect', () => {
            console.log('[P2P] Reconnected to signaling server');
            this.status = 'connected';
            this.emit('status-change', this.status);
            // Re-register
            const identity = identityService.getIdentity();
            if (identity) {
                this.socket?.emit('register', {
                    peerId: this.myPeerId,
                    publicKey: identity.publicKey,
                    displayName: identity.displayName,
                });
            }
            // Rejoin room if we were in one
            if (this.currentRoom) {
                this.joinRoom(this.currentRoom).catch(console.error);
            }
        });
        this.socket.on('reconnect_failed', () => {
            console.log('[P2P] Reconnection failed');
            this.status = 'disconnected';
            this.emit('status-change', this.status);
        });
    }
    // Connect directly to a peer by their ID
    async connectToPeer(targetPeerId) {
        if (!this.socket || this.status !== 'connected') {
            throw new Error('Not connected to signaling server');
        }
        if (this.peers.has(targetPeerId)) {
            const existing = this.peers.get(targetPeerId);
            if (existing?.status === 'connected') {
                return true;
            }
        }
        // Check if peer is online
        return new Promise((resolve) => {
            this.socket.emit('check-online', { peerId: targetPeerId });
            const timeout = setTimeout(() => {
                this.socket.off('online-status', handler);
                resolve(false);
            }, 5000);
            const handler = ({ peerId, online }) => {
                if (peerId === targetPeerId) {
                    clearTimeout(timeout);
                    this.socket.off('online-status', handler);
                    if (online) {
                        this.initiatePeerConnection(targetPeerId, true);
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
            };
            this.socket.on('online-status', handler);
        });
    }
    // Check if a peer is online
    async checkPeerOnline(peerId) {
        if (!this.socket || this.status !== 'connected') {
            return false;
        }
        return new Promise((resolve) => {
            this.socket.emit('check-online', { peerId });
            const timeout = setTimeout(() => {
                this.socket.off('online-status', handler);
                resolve(false);
            }, 3000);
            const handler = (data) => {
                if (data.peerId === peerId) {
                    clearTimeout(timeout);
                    this.socket.off('online-status', handler);
                    resolve(data.online);
                }
            };
            this.socket.on('online-status', handler);
        });
    }
    // Send message via relay (fallback)
    sendViaRelay(targetPeerId, message) {
        if (!this.socket || this.status !== 'connected') {
            this.queueMessage(targetPeerId, message);
            return;
        }
        this.socket.emit('relay-message', {
            targetPeerId,
            message,
            fromPeerId: this.myPeerId,
        });
    }
    // Send typing indicator via relay
    sendTypingViaRelay(targetPeerId, isTyping) {
        if (!this.socket || this.status !== 'connected')
            return;
        this.socket.emit('typing', {
            targetPeerId,
            fromPeerId: this.myPeerId,
            isTyping,
        });
    }
    // ==================== Messaging ====================
    sendToPeer(peerId, message) {
        const connection = this.peers.get(peerId);
        if (!connection || connection.status !== 'connected') {
            // Queue message for later
            this.queueMessage(peerId, message);
            return false;
        }
        try {
            const data = new TextEncoder().encode(JSON.stringify(message));
            connection.peer.send(data);
            connection.lastSeen = Date.now();
            return true;
        }
        catch (error) {
            console.error('[P2P] Failed to send message:', error);
            this.queueMessage(peerId, message);
            return false;
        }
    }
    broadcast(message) {
        this.peers.forEach((connection, peerId) => {
            this.sendToPeer(peerId, message);
        });
    }
    handlePeerMessage(peerId, message) {
        const connection = this.peers.get(peerId);
        if (connection) {
            connection.lastSeen = Date.now();
        }
        switch (message.type) {
            case 'text':
                this.emit('message', { from: peerId, ...message });
                break;
            case 'typing':
                this.emit('typing', { peerId, isTyping: message.payload.isTyping });
                break;
            case 'read-receipt':
                this.emit('read-receipt', { peerId, messageId: message.payload.messageId });
                break;
            case 'delivery-receipt':
                this.emit('delivery-receipt', { peerId, messageId: message.payload.messageId });
                break;
            case 'key-exchange':
                this.emit('key-exchange', { peerId, ...message.payload });
                break;
            case 'file-meta':
                this.emit('file-meta', { peerId, ...message.payload });
                break;
            case 'file-chunk':
                this.emit('file-chunk', { peerId, ...message.payload });
                break;
            default:
                console.warn('[P2P] Unknown message type:', message.type);
        }
    }
    queueMessage(peerId, message) {
        db.addPendingMessage({
            id: message.id,
            conversationId: '', // Will be set by caller
            peerId,
            encryptedPayload: JSON.stringify(message),
            nonce: '',
            createdAt: Date.now(),
            retryCount: 0,
        });
    }
    async sendPendingMessages(peerId) {
        const pending = db.getPendingMessages(peerId);
        for (const msg of pending) {
            try {
                const message = JSON.parse(msg.encryptedPayload);
                if (this.sendToPeer(peerId, message)) {
                    db.removePendingMessage(msg.id);
                }
            }
            catch (error) {
                console.error('[P2P] Failed to send pending message:', error);
                db.incrementPendingRetry(msg.id);
            }
        }
    }
    // ==================== Utility Methods ====================
    getPeerStatus(peerId) {
        const connection = this.peers.get(peerId);
        if (!connection)
            return 'disconnected';
        return connection.status === 'connected' ? 'connected' :
            connection.status === 'connecting' ? 'connecting' : 'disconnected';
    }
    getConnectedPeers() {
        return Array.from(this.peers.entries())
            .filter(([_, conn]) => conn.status === 'connected')
            .map(([peerId]) => peerId);
    }
    getPeerCount() {
        return this.peers.size;
    }
    // Get socket for direct signaling (used for calls)
    getSocket() {
        return this.socket;
    }
    // Send typing indicator
    sendTypingIndicator(peerId, isTyping) {
        this.sendToPeer(peerId, {
            type: 'typing',
            id: crypto.randomUUID(),
            payload: { isTyping },
            timestamp: Date.now(),
        });
    }
    // Send read receipt
    sendReadReceipt(peerId, messageId) {
        this.sendToPeer(peerId, {
            type: 'read-receipt',
            id: crypto.randomUUID(),
            payload: { messageId },
            timestamp: Date.now(),
        });
    }
    // Send delivery receipt
    sendDeliveryReceipt(peerId, messageId) {
        this.sendToPeer(peerId, {
            type: 'delivery-receipt',
            id: crypto.randomUUID(),
            payload: { messageId },
            timestamp: Date.now(),
        });
    }
}
// Singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;
