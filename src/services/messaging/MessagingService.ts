/**
 * VORTEX Protocol - Messaging Service
 * Handles sending, receiving, and managing messages with E2E encryption
 */

import { EventEmitter } from 'eventemitter3';
import { db, type Message, type Conversation } from '../database';
import { connectionManager, type PeerMessage } from '../p2p';
import { identityService } from '../identity';
import _sodium from 'libsodium-wrappers';

export interface SendMessageOptions {
  conversationId: string;
  content: string;
  type?: 'text' | 'image' | 'file' | 'audio' | 'video';
  replyToId?: string;
}

export interface ReceivedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  timestamp: number;
  status: 'delivered' | 'read';
}

export interface TypingState {
  peerId: string;
  isTyping: boolean;
  timestamp: number;
}

class MessagingService extends EventEmitter {
  private sodium: typeof _sodium | null = null;
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await _sodium.ready;
    this.sodium = _sodium;

    // Set up P2P message handlers
    this.setupMessageHandlers();

    this.initialized = true;
    console.log('[Messaging] Service initialized');
  }

  private setupMessageHandlers(): void {
    // Handle incoming text messages
    connectionManager.on('message', async (data: { from: string; payload: any; timestamp: number; id: string }) => {
      await this.handleIncomingMessage(data);
    });

    // Handle typing indicators
    connectionManager.on('typing', ({ peerId, isTyping }: { peerId: string; isTyping: boolean }) => {
      this.handleTypingIndicator(peerId, isTyping);
    });

    // Handle read receipts
    connectionManager.on('read-receipt', ({ peerId, messageId }: { peerId: string; messageId: string }) => {
      this.handleReadReceipt(peerId, messageId);
    });

    // Handle delivery receipts
    connectionManager.on('delivery-receipt', ({ peerId, messageId }: { peerId: string; messageId: string }) => {
      this.handleDeliveryReceipt(peerId, messageId);
    });

    // Handle peer connection status
    connectionManager.on('peer-connected', (peerId: string) => {
      this.emit('peer-online', peerId);
      // Mark pending messages as deliverable
      this.retryPendingMessages(peerId);
    });

    connectionManager.on('peer-disconnected', (peerId: string) => {
      this.emit('peer-offline', peerId);
    });
  }

  // ==================== Sending Messages ====================

  async sendMessage(options: SendMessageOptions): Promise<Message> {
    const { conversationId, content, type = 'text', replyToId } = options;

    const identity = identityService.getIdentity();
    if (!identity) throw new Error('No identity');

    // Create message object
    const message: Message = {
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
    if (!conversation) throw new Error('Conversation not found');

    // Prepare P2P message
    const peerMessage: PeerMessage = {
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
    const participants = JSON.parse(conversation.participants) as { id: string }[];
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

  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    const conversation = db.getConversation(conversationId);
    if (!conversation) return;

    const identity = identityService.getIdentity();
    if (!identity) return;

    const participants = JSON.parse(conversation.participants) as { id: string }[];
    
    for (const participant of participants) {
      if (participant.id !== identity.id) {
        connectionManager.sendTypingIndicator(participant.id, isTyping);
      }
    }
  }

  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    const conversation = db.getConversation(conversationId);
    if (!conversation) return;

    const identity = identityService.getIdentity();
    if (!identity) return;

    // Update local database
    if (messageId) {
      db.updateMessageStatus(messageId, 'read');
    }

    // Reset unread count
    conversation.unreadCount = 0;
    db.saveConversation(conversation);

    // Send read receipt to peer(s)
    if (messageId) {
      const participants = JSON.parse(conversation.participants) as { id: string }[];
      
      for (const participant of participants) {
        if (participant.id !== identity.id) {
          connectionManager.sendReadReceipt(participant.id, messageId);
        }
      }
    }

    this.emit('conversation-read', conversationId);
  }

  // ==================== Receiving Messages ====================

  private async handleIncomingMessage(data: { from: string; payload: any; timestamp: number; id: string }): Promise<void> {
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
          { id: identityService.getIdentity()!.id },
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
    const message: Message = {
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

  private handleTypingIndicator(peerId: string, isTyping: boolean): void {
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

  private handleReadReceipt(peerId: string, messageId: string): void {
    db.updateMessageStatus(messageId, 'read');
    this.emit('message-read', { messageId, peerId });
  }

  private handleDeliveryReceipt(peerId: string, messageId: string): void {
    const message = db.getMessage(messageId);
    if (message && message.status === 'sending') {
      db.updateMessageStatus(messageId, 'delivered');
      this.emit('message-delivered', { messageId, peerId });
    }
  }

  // ==================== Conversation Management ====================

  createDirectConversation(peerId: string, displayName: string): Conversation {
    // Check if conversation already exists
    const existing = this.findConversationWithPeer(peerId);
    if (existing) return existing;

    const identity = identityService.getIdentity();
    if (!identity) throw new Error('No identity');

    const conversation: Conversation = {
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

  createGroupConversation(name: string, participants: string[]): Conversation {
    const identity = identityService.getIdentity();
    if (!identity) throw new Error('No identity');

    const allParticipants = [identity.id, ...participants];

    const conversation: Conversation = {
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

  getConversations(): Conversation[] {
    return db.getAllConversations();
  }

  getConversation(id: string): Conversation | null {
    return db.getConversation(id);
  }

  getMessages(conversationId: string, limit = 50, beforeId?: string): Message[] {
    return db.getMessages(conversationId, limit, beforeId);
  }

  deleteConversation(id: string): void {
    db.deleteConversation(id);
    this.emit('conversation-deleted', id);
  }

  // ==================== Utilities ====================

  private findConversationWithPeer(peerId: string): Conversation | null {
    const conversations = db.getAllConversations();
    
    for (const conv of conversations) {
      if (conv.type !== 'direct') continue;
      
      try {
        const participants = JSON.parse(conv.participants) as { id: string }[];
        if (participants.some(p => p.id === peerId)) {
          return conv;
        }
      } catch {
        continue;
      }
    }
    
    return null;
  }

  private async retryPendingMessages(peerId: string): Promise<void> {
    const pending = db.getPendingMessages(peerId);
    
    for (const msg of pending) {
      try {
        const message = JSON.parse(msg.encryptedPayload) as PeerMessage;
        if (connectionManager.sendToPeer(peerId, message)) {
          db.removePendingMessage(msg.id);
          
          // Update message status
          const dbMessage = db.getMessage(message.id);
          if (dbMessage) {
            db.updateMessageStatus(message.id, 'sent');
          }
        }
      } catch (error) {
        console.error('[Messaging] Failed to retry message:', error);
      }
    }
  }

  private showNotification(title: string, body: string): void {
    // Use Electron API if available
    if (window.electronAPI?.notifications) {
      window.electronAPI.notifications.show({ title, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }

  // Delete a message
  deleteMessage(conversationId: string, messageId: string, forEveryone = false): void {
    db.deleteMessage(messageId, !forEveryone);
    this.emit('message-deleted', { conversationId, messageId, forEveryone });
  }

  // Edit a message
  async editMessage(messageId: string, newContent: string): Promise<void> {
    const message = db.getMessage(messageId);
    if (!message) throw new Error('Message not found');

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
  addReaction(messageId: string, reaction: string): void {
    const message = db.getMessage(messageId);
    if (!message) return;

    const identity = identityService.getIdentity();
    if (!identity) return;

    let reactions: Record<string, string[]> = {};
    try {
      reactions = message.reactions ? JSON.parse(message.reactions) : {};
    } catch {}

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
  removeReaction(messageId: string, reaction: string): void {
    const message = db.getMessage(messageId);
    if (!message) return;

    const identity = identityService.getIdentity();
    if (!identity) return;

    let reactions: Record<string, string[]> = {};
    try {
      reactions = message.reactions ? JSON.parse(message.reactions) : {};
    } catch {}

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
