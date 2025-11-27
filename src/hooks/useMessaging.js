/**
 * VORTEX Protocol - useMessaging Hook
 * Connects UI to the messaging service
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { messagingService } from '../services/messaging';
import { connectionManager } from '../services/p2p';
import { db } from '../services/database';
export function useMessaging() {
    const [conversations, setConversations] = useState([]);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [typingPeers, setTypingPeers] = useState(new Map());
    const [unreadCount, setUnreadCount] = useState(0);
    const typingTimeoutRef = useRef(null);
    const lastTypingRef = useRef(false);
    // Initialize services
    useEffect(() => {
        const init = async () => {
            try {
                await messagingService.initialize();
                loadConversations();
            }
            catch (error) {
                console.error('[useMessaging] Init error:', error);
            }
        };
        init();
    }, []);
    // Listen to connection status changes
    useEffect(() => {
        const handleStatusChange = (status) => {
            setConnectionStatus(status);
        };
        connectionManager.on('status-change', handleStatusChange);
        return () => {
            connectionManager.off('status-change', handleStatusChange);
        };
    }, []);
    // Listen to messaging events
    useEffect(() => {
        const handleMessageReceived = (message) => {
            // Add to messages if in active conversation
            if (message.conversationId === activeConversationId) {
                setMessages(prev => [...prev, message]);
            }
            // Refresh conversations list
            loadConversations();
            updateUnreadCount();
        };
        const handleMessageSent = (message) => {
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
        const handleMessageDelivered = ({ messageId }) => {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'delivered' } : m));
        };
        const handleMessageRead = ({ messageId }) => {
            setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'read' } : m));
        };
        const handleTyping = ({ peerId, isTyping }) => {
            setTypingPeers(prev => {
                const next = new Map(prev);
                if (isTyping) {
                    next.set(peerId, true);
                }
                else {
                    next.delete(peerId);
                }
                return next;
            });
        };
        const handleConversationCreated = (conv) => {
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
        }
        else {
            setMessages([]);
        }
    }, [activeConversationId]);
    // Helper functions
    const loadConversations = () => {
        const convs = messagingService.getConversations();
        setConversations(convs);
    };
    const loadMessages = (conversationId, beforeId) => {
        const msgs = messagingService.getMessages(conversationId, 50, beforeId);
        if (beforeId) {
            setMessages(prev => [...msgs, ...prev]);
        }
        else {
            setMessages(msgs);
        }
    };
    const updateUnreadCount = () => {
        const convs = messagingService.getConversations();
        const total = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(total);
    };
    // Public API
    const setActiveConversation = useCallback((id) => {
        setActiveConversationId(id);
        if (id) {
            // Mark as read when selecting conversation
            messagingService.markAsRead(id);
            loadConversations();
        }
    }, []);
    const sendMessage = useCallback(async (content, replyToId) => {
        if (!activeConversationId)
            return;
        await messagingService.sendMessage({
            conversationId: activeConversationId,
            content,
            type: 'text',
            replyToId,
        });
    }, [activeConversationId]);
    const sendTypingIndicator = useCallback((isTyping) => {
        if (!activeConversationId)
            return;
        if (isTyping === lastTypingRef.current)
            return;
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
        if (!activeConversationId)
            return;
        messagingService.markAsRead(activeConversationId);
        loadConversations();
    }, [activeConversationId]);
    const loadMoreMessages = useCallback(() => {
        if (!activeConversationId || messages.length === 0)
            return;
        const oldestMessage = messages[0];
        loadMessages(activeConversationId, oldestMessage.id);
    }, [activeConversationId, messages]);
    const createConversation = useCallback((peerId, displayName) => {
        return messagingService.createDirectConversation(peerId, displayName);
    }, []);
    const deleteConversation = useCallback((id) => {
        messagingService.deleteConversation(id);
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
        loadConversations();
    }, [activeConversationId]);
    const deleteMessage = useCallback((messageId, forEveryone = false) => {
        if (!activeConversationId)
            return;
        messagingService.deleteMessage(activeConversationId, messageId, forEveryone);
        setMessages(prev => prev.filter(m => m.id !== messageId));
    }, [activeConversationId]);
    const addReaction = useCallback((messageId, reaction) => {
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
    const joinRoom = useCallback(async (roomId) => {
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
