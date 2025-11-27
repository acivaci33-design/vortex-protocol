/**
 * VORTEX Protocol - useMessaging Hook
 * Connects UI to the messaging service
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { messagingService, type SendMessageOptions } from '../services/messaging';
import { connectionManager, type ConnectionStatus } from '../services/p2p';
import { identityService } from '../services/identity';
import { db, type Message, type Conversation } from '../services/database';

export interface UseMessagingReturn {
  // State
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  typingPeers: Map<string, boolean>;
  unreadCount: number;

  // Actions
  setActiveConversation: (id: string | null) => void;
  sendMessage: (content: string, replyToId?: string) => Promise<void>;
  sendTypingIndicator: (isTyping: boolean) => void;
  markAsRead: () => void;
  loadMoreMessages: () => void;
  createConversation: (peerId: string, displayName: string) => Conversation;
  deleteConversation: (id: string) => void;
  deleteMessage: (messageId: string, forEveryone?: boolean) => void;
  addReaction: (messageId: string, reaction: string) => void;

  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string) => Promise<void>;
}

export function useMessaging(): UseMessagingReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [typingPeers, setTypingPeers] = useState<Map<string, boolean>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef(false);

  // Initialize services
  useEffect(() => {
    const init = async () => {
      try {
        await messagingService.initialize();
        loadConversations();
      } catch (error) {
        console.error('[useMessaging] Init error:', error);
      }
    };

    init();
  }, []);

  // Listen to connection status changes
  useEffect(() => {
    const handleStatusChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
    };

    connectionManager.on('status-change', handleStatusChange);
    return () => {
      connectionManager.off('status-change', handleStatusChange);
    };
  }, []);

  // Listen to messaging events
  useEffect(() => {
    const handleMessageReceived = (message: Message & { senderName?: string }) => {
      // Add to messages if in active conversation
      if (message.conversationId === activeConversationId) {
        setMessages(prev => [...prev, message]);
      }
      // Refresh conversations list
      loadConversations();
      updateUnreadCount();
    };

    const handleMessageSent = (message: Message) => {
      if (message.conversationId === activeConversationId) {
        setMessages(prev => {
          const existing = prev.find(m => m.id === message.id);
          if (existing) {
            return prev.map(m => m.id === message.id ? message : m);
          }
          return [...prev, message];
        });
      }
    };

    const handleMessageDelivered = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, status: 'delivered' } : m
      ));
    };

    const handleMessageRead = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, status: 'read' } : m
      ));
    };

    const handleTyping = ({ peerId, isTyping }: { peerId: string; isTyping: boolean }) => {
      setTypingPeers(prev => {
        const next = new Map(prev);
        if (isTyping) {
          next.set(peerId, true);
        } else {
          next.delete(peerId);
        }
        return next;
      });
    };

    const handleConversationCreated = (conv: Conversation) => {
      setConversations(prev => [conv, ...prev]);
    };

    messagingService.on('message-received', handleMessageReceived);
    messagingService.on('message-sent', handleMessageSent);
    messagingService.on('message-delivered', handleMessageDelivered);
    messagingService.on('message-read', handleMessageRead);
    messagingService.on('typing', handleTyping);
    messagingService.on('conversation-created', handleConversationCreated);

    return () => {
      messagingService.off('message-received', handleMessageReceived);
      messagingService.off('message-sent', handleMessageSent);
      messagingService.off('message-delivered', handleMessageDelivered);
      messagingService.off('message-read', handleMessageRead);
      messagingService.off('typing', handleTyping);
      messagingService.off('conversation-created', handleConversationCreated);
    };
  }, [activeConversationId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Helper functions
  const loadConversations = () => {
    const convs = messagingService.getConversations();
    setConversations(convs);
  };

  const loadMessages = (conversationId: string, beforeId?: string) => {
    const msgs = messagingService.getMessages(conversationId, 50, beforeId);
    if (beforeId) {
      setMessages(prev => [...msgs, ...prev]);
    } else {
      setMessages(msgs);
    }
  };

  const updateUnreadCount = () => {
    const convs = messagingService.getConversations();
    const total = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    setUnreadCount(total);
  };

  // Public API
  const setActiveConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      // Mark as read when selecting conversation
      messagingService.markAsRead(id);
      loadConversations();
    }
  }, []);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!activeConversationId) return;

    await messagingService.sendMessage({
      conversationId: activeConversationId,
      content,
      type: 'text',
      replyToId,
    });
  }, [activeConversationId]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!activeConversationId) return;
    if (isTyping === lastTypingRef.current) return;

    lastTypingRef.current = isTyping;
    messagingService.sendTypingIndicator(activeConversationId, isTyping);

    // Auto-clear typing indicator after 3 seconds of no activity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        lastTypingRef.current = false;
        messagingService.sendTypingIndicator(activeConversationId, false);
      }, 3000);
    }
  }, [activeConversationId]);

  const markAsRead = useCallback(() => {
    if (!activeConversationId) return;
    messagingService.markAsRead(activeConversationId);
    loadConversations();
  }, [activeConversationId]);

  const loadMoreMessages = useCallback(() => {
    if (!activeConversationId || messages.length === 0) return;
    const oldestMessage = messages[0];
    loadMessages(activeConversationId, oldestMessage.id);
  }, [activeConversationId, messages]);

  const createConversation = useCallback((peerId: string, displayName: string) => {
    return messagingService.createDirectConversation(peerId, displayName);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    messagingService.deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    loadConversations();
  }, [activeConversationId]);

  const deleteMessage = useCallback((messageId: string, forEveryone = false) => {
    if (!activeConversationId) return;
    messagingService.deleteMessage(activeConversationId, messageId, forEveryone);
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [activeConversationId]);

  const addReaction = useCallback((messageId: string, reaction: string) => {
    messagingService.addReaction(messageId, reaction);
    // Refresh message to show reaction
    const updated = db.getMessage(messageId);
    if (updated) {
      setMessages(prev => prev.map(m => m.id === messageId ? updated : m));
    }
  }, []);

  const connect = useCallback(async () => {
    await connectionManager.connect();
  }, []);

  const disconnect = useCallback(() => {
    connectionManager.disconnect();
  }, []);

  const joinRoom = useCallback(async (roomId: string) => {
    await connectionManager.joinRoom(roomId);
  }, []);

  // Derived state
  const activeConversation = activeConversationId 
    ? conversations.find(c => c.id === activeConversationId) || null 
    : null;

  const isConnected = connectionStatus === 'connected';

  return {
    conversations,
    activeConversation,
    messages,
    isConnected,
    connectionStatus,
    typingPeers,
    unreadCount,

    setActiveConversation,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    loadMoreMessages,
    createConversation,
    deleteConversation,
    deleteMessage,
    addReaction,

    connect,
    disconnect,
    joinRoom,
  };
}
