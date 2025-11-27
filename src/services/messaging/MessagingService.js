/**
 * VORTEX Protocol - Messaging Service
 * Handles sending, receiving, and managing messages with E2E encryption
 */
import { EventEmitter } from 'eventemitter3';
import { db } from '../database';
import { connectionManager } from '../p2p';
import { identityService } from '../identity';
import _sodium from 'libsodium-wrappers';
class MessagingService extends EventEmitter {
    constructor() {
        super(...arguments);
        this.sodium = null;
        this.typingTimers = new Map();
        this.initialized = false;
    }
    async initialize() {
        if (this.initialized)
            return;
        await _sodium.ready;
        this.sodium = _sodium;
        // Set up P2P message handlers
        this.setupMessageHandlers();
        this.initialized = true;
        console.log('[Messaging] Service initialized');
    }
    setupMessageHandlers() {
        // Handle incoming text messages
        connectionManager.on('message', async (data) => {
            await this.handleIncomingMessage(data);
        });
        // Handle typing indicators
        connectionManager.on('typing', ({ peerId, isTyping }) => {
            this.handleTypingIndicator(peerId, isTyping);
        });
        // Handle read receipts
        connectionManager.on('read-receipt', ({ peerId, messageId }) => {
            this.handleReadReceipt(peerId, messageId);
        });
        // Handle delivery receipts
        connectionManager.on('delivery-receipt', ({ peerId, messageId }) => {
            this.handleDeliveryReceipt(peerId, messageId);
        });
        // Handle peer connection status
        connectionManager.on('peer-connected', (peerId) => {
            this.emit('peer-online', peerId);
            // Mark pending messages as deliverable
            this.retryPendingMessages(peerId);
        });
        connectionManager.on('peer-disconnected', (peerId) => {
            this.emit('peer-offline', peerId);
        });
    }
    // ==================== Sending Messages ====================
    async sendMessage(options) {
        const { conversationId, content, type = 'text', replyToId } = options;
        const identity = identityService.getIdentity();
        if (!identity)
            throw new Error('No identity');
        // Create message object
        const message = {
            id: crypto.randomUUID(),
            conversationId,
            senderId: identity.id,
            type,
            content,
            replyToId,
            status: 'sending',
            isEdited: false,
            isDeleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        // Save to database immediately
        db.saveMessage(message);
        this.emit('message-sent', message);
        // Get conversation to find peer(s)
        const conversation = db.getConversation(conversationId);
        if (!conversation)
            throw new Error('Conversation not found');
        // Prepare P2P message
        const peerMessage = {
            type: 'text',
            id: message.id,
            payload: {
                content,
                type,
                replyToId,
                senderName: identity.displayName,
            },
            timestamp: message.createdAt,
        };
        // Send to peer(s)
        const participants = JSON.parse(conversation.participants);
        let delivered = false;
        for (const participant of participants) {
            if (participant.id !== identity.id) {
                if (connectionManager.sendToPeer(participant.id, peerMessage)) {
                    delivered = true;
                }
            }
        }
        // Update status
        message.status = delivered ? 'sent' : 'sending';
        message.updatedAt = Date.now();
        db.saveMessage(message);
        return message;
    }
    async sendTypingIndicator(conversationId, isTyping) {
        const conversation = db.getConversation(conversationId);
        if (!conversation)
            return;
        const identity = identityService.getIdentity();
        if (!identity)
            return;
        const participants = JSON.parse(conversation.participants);
        for (const participant of participants) {
            if (participant.id !== identity.id) {
                connectionManager.sendTypingIndicator(participant.id, isTyping);
            }
        }
    }
    async markAsRead(conversationId, messageId) {
        const conversation = db.getConversation(conversationId);
        if (!conversation)
            return;
        const identity = identityService.getIdentity();
        if (!identity)
            return;
        // Update local database
        if (messageId) {
            db.updateMessageStatus(messageId, 'read');
        }
        // Reset unread count
        conversation.unreadCount = 0;
        db.saveConversation(conversation);
        // Send read receipt to peer(s)
        if (messageId) {
            const participants = JSON.parse(conversation.participants);
            for (const participant of participants) {
                if (participant.id !== identity.id) {
                    connectionManager.sendReadReceipt(participant.id, messageId);
                }
            }
        }
        this.emit('conversation-read', conversationId);
    }
    // ==================== Receiving Messages ====================
    async handleIncomingMessage(data) {
        const { from, payload, timestamp, id } = data;
        // Find or create conversation with this peer
        let conversation = this.findConversationWithPeer(from);
        if (!conversation) {
            // Create new conversation
            const contact = db.getContactByIdentityKey(from) || db.getContact(from);
            const displayName = contact?.displayName || payload.senderName || 'Unknown';
            conversation = {
                id: crypto.randomUUID(),
                type: 'direct',
                name: displayName,
                participants: JSON.stringify([
                    { id: from },
                    { id: identityService.getIdentity().id },
                ]),
                encryptionEnabled: true,
                isPinned: false,
                isMuted: false,
                isArchived: false,
                unreadCount: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            db.saveConversation(conversation);
        }
        // Create message
        const message = {
            id,
            conversationId: conversation.id,
            senderId: from,
            type: payload.type || 'text',
            content: payload.content,
            replyToId: payload.replyToId,
            status: 'delivered',
            isEdited: false,
            isDeleted: false,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        // Save message
        db.saveMessage(message);
        // Update conversation
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        conversation.updatedAt = timestamp;
        conversation.lastMessageId = id;
        db.saveConversation(conversation);
        // Send delivery receipt
        connectionManager.sendDeliveryReceipt(from, id);
        // Emit event for UI
        this.emit('message-received', {
            ...message,
            senderName: payload.senderName || 'Unknown',
        });
        // Show notification if not focused
        this.showNotification(payload.senderName || 'New Message', payload.content);
    }
    handleTypingIndicator(peerId, isTyping) {
        // Clear existing timer
        const existingTimer = this.typingTimers.get(peerId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.typingTimers.delete(peerId);
        }
        if (isTyping) {
            // Auto-clear typing after 5 seconds
            const timer = setTimeout(() => {
                this.emit('typing', { peerId, isTyping: false });
                this.typingTimers.delete(peerId);
            }, 5000);
            this.typingTimers.set(peerId, timer);
        }
        this.emit('typing', { peerId, isTyping });
    }
    handleReadReceipt(peerId, messageId) {
        db.updateMessageStatus(messageId, 'read');
        this.emit('message-read', { messageId, peerId });
    }
    handleDeliveryReceipt(peerId, messageId) {
        const message = db.getMessage(messageId);
        if (message && message.status === 'sending') {
            db.updateMessageStatus(messageId, 'delivered');
            this.emit('message-delivered', { messageId, peerId });
        }
    }
    // ==================== Conversation Management ====================
    createDirectConversation(peerId, displayName) {
        // Check if conversation already exists
        const existing = this.findConversationWithPeer(peerId);
        if (existing)
            return existing;
        const identity = identityService.getIdentity();
        if (!identity)
            throw new Error('No identity');
        const conversation = {
            id: crypto.randomUUID(),
            type: 'direct',
            name: displayName,
            participants: JSON.stringify([
                { id: peerId },
                { id: identity.id },
            ]),
            encryptionEnabled: true,
            isPinned: false,
            isMuted: false,
            isArchived: false,
            unreadCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        db.saveConversation(conversation);
        this.emit('conversation-created', conversation);
        return conversation;
    }
    createGroupConversation(name, participants) {
        const identity = identityService.getIdentity();
        if (!identity)
            throw new Error('No identity');
        const allParticipants = [identity.id, ...participants];
        const conversation = {
            id: crypto.randomUUID(),
            type: 'group',
            name,
            participants: JSON.stringify(allParticipants.map(id => ({ id }))),
            encryptionEnabled: true,
            isPinned: false,
            isMuted: false,
            isArchived: false,
            unreadCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        db.saveConversation(conversation);
        this.emit('conversation-created', conversation);
        return conversation;
    }
    getConversations() {
        return db.getAllConversations();
    }
    getConversation(id) {
        return db.getConversation(id);
    }
    getMessages(conversationId, limit = 50, beforeId) {
        return db.getMessages(conversationId, limit, beforeId);
    }
    deleteConversation(id) {
        db.deleteConversation(id);
        this.emit('conversation-deleted', id);
    }
    // ==================== Utilities ====================
    findConversationWithPeer(peerId) {
        const conversations = db.getAllConversations();
        for (const conv of conversations) {
            if (conv.type !== 'direct')
                continue;
            try {
                const participants = JSON.parse(conv.participants);
                if (participants.some(p => p.id === peerId)) {
                    return conv;
                }
            }
            catch {
                continue;
            }
        }
        return null;
    }
    async retryPendingMessages(peerId) {
        const pending = db.getPendingMessages(peerId);
        for (const msg of pending) {
            try {
                const message = JSON.parse(msg.encryptedPayload);
                if (connectionManager.sendToPeer(peerId, message)) {
                    db.removePendingMessage(msg.id);
                    // Update message status
                    const dbMessage = db.getMessage(message.id);
                    if (dbMessage) {
                        db.updateMessageStatus(message.id, 'sent');
                    }
                }
            }
            catch (error) {
                console.error('[Messaging] Failed to retry message:', error);
            }
        }
    }
    showNotification(title, body) {
        // Use Electron API if available
        if (window.electronAPI?.notifications) {
            window.electronAPI.notifications.show({ title, body });
        }
        else if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }
    // Delete a message
    deleteMessage(conversationId, messageId, forEveryone = false) {
        db.deleteMessage(messageId, !forEveryone);
        this.emit('message-deleted', { conversationId, messageId, forEveryone });
    }
    // Edit a message
    async editMessage(messageId, newContent) {
        const message = db.getMessage(messageId);
        if (!message)
            throw new Error('Message not found');
        const identity = identityService.getIdentity();
        if (!identity || message.senderId !== identity.id) {
            throw new Error('Cannot edit this message');
        }
        message.content = newContent;
        message.isEdited = true;
        message.updatedAt = Date.now();
        db.saveMessage(message);
        this.emit('message-edited', message);
    }
    // Add reaction to message
    addReaction(messageId, reaction) {
        const message = db.getMessage(messageId);
        if (!message)
            return;
        const identity = identityService.getIdentity();
        if (!identity)
            return;
        let reactions = {};
        try {
            reactions = message.reactions ? JSON.parse(message.reactions) : {};
        }
        catch { }
        if (!reactions[reaction]) {
            reactions[reaction] = [];
        }
        if (!reactions[reaction].includes(identity.id)) {
            reactions[reaction].push(identity.id);
        }
        message.reactions = JSON.stringify(reactions);
        message.updatedAt = Date.now();
        db.saveMessage(message);
        this.emit('message-reaction', { messageId, reaction, userId: identity.id });
    }
    // Remove reaction from message
    removeReaction(messageId, reaction) {
        const message = db.getMessage(messageId);
        if (!message)
            return;
        const identity = identityService.getIdentity();
        if (!identity)
            return;
        let reactions = {};
        try {
            reactions = message.reactions ? JSON.parse(message.reactions) : {};
        }
        catch { }
        if (reactions[reaction]) {
            reactions[reaction] = reactions[reaction].filter(id => id !== identity.id);
            if (reactions[reaction].length === 0) {
                delete reactions[reaction];
            }
        }
        message.reactions = JSON.stringify(reactions);
        message.updatedAt = Date.now();
        db.saveMessage(message);
        this.emit('message-reaction-removed', { messageId, reaction, userId: identity.id });
    }
}
// Singleton instance
export const messagingService = new MessagingService();
export default messagingService;
