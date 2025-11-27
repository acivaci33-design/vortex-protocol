/**
 * VORTEX Protocol - Service Sync Hook
 * Syncs service events with Zustand stores
 */
import { useEffect, useCallback } from 'react';
import { messagingService } from '../services/messaging';
import { connectionManager } from '../services/p2p';
import { db } from '../services/database';
import { useChatStore } from '../stores';
import toast from 'react-hot-toast';
/**
 * This hook syncs the messaging service events with the Zustand chat store.
 * It should be used once at the app level (e.g., in App.tsx or MainLayout).
 */
export function useServiceSync() {
    const { addMessage, updateMessage, createConversation, updateConversation, setTyping, conversations, } = useChatStore();
    // Handle incoming messages
    const handleMessageReceived = useCallback((data) => {
        console.log('[ServiceSync] Message received:', data.id);
        // Add message to store
        addMessage({
            conversationId: data.conversationId,
            senderId: data.senderId,
            type: data.type,
            content: data.content,
            status: 'delivered',
            replyTo: data.replyToId,
        });
        // Update conversation unread count
        updateConversation(data.conversationId, {
            unreadCount: (conversations[data.conversationId]?.unreadCount || 0) + 1
        });
        // Show toast notification
        toast(data.senderName || 'New message', {
            icon: '💬',
            duration: 3000,
        });
    }, [addMessage, updateConversation, conversations]);
    // Handle message sent confirmation
    const handleMessageSent = useCallback((data) => {
        console.log('[ServiceSync] Message sent:', data.id);
        updateMessage(data.conversationId, data.id, { status: 'sent' });
    }, [updateMessage]);
    // Handle delivery receipt
    const handleMessageDelivered = useCallback(({ messageId, peerId }) => {
        console.log('[ServiceSync] Message delivered:', messageId);
        // Find the conversation with this message
        const msg = db.getMessage(messageId);
        if (msg) {
            updateMessage(msg.conversationId, messageId, { status: 'delivered' });
        }
    }, [updateMessage]);
    // Handle read receipt
    const handleMessageRead = useCallback(({ messageId, peerId }) => {
        console.log('[ServiceSync] Message read:', messageId);
        const msg = db.getMessage(messageId);
        if (msg) {
            updateMessage(msg.conversationId, messageId, { status: 'read' });
        }
    }, [updateMessage]);
    // Handle typing indicator
    const handleTyping = useCallback(({ peerId, isTyping }) => {
        console.log('[ServiceSync] Typing:', peerId, isTyping);
        // Find conversation with this peer
        const dbConversations = db.getAllConversations();
        const conv = dbConversations.find((c) => {
            const participants = typeof c.participants === 'string'
                ? JSON.parse(c.participants)
                : c.participants;
            return participants.some((p) => (typeof p === 'string' ? p : p.id) === peerId);
        });
        if (conv) {
            setTyping(peerId, conv.id, isTyping);
        }
    }, [setTyping]);
    // Handle new conversation created
    const handleConversationCreated = useCallback((conv) => {
        console.log('[ServiceSync] Conversation created:', conv.id);
        const participants = typeof conv.participants === 'string'
            ? JSON.parse(conv.participants)
            : conv.participants;
        createConversation({
            type: conv.type,
            name: conv.name,
            participants: participants.map((p) => ({
                id: typeof p === 'string' ? p : p.id,
                displayName: typeof p === 'string' ? conv.name || 'Unknown' : p.displayName || 'Unknown',
                publicKey: '',
                role: 'member',
                joinedAt: Date.now(),
            })),
        });
    }, [createConversation]);
    // Handle peer online/offline
    const handlePeerOnline = useCallback(({ peerId, displayName }) => {
        console.log('[ServiceSync] Peer online:', peerId, displayName);
        toast.success(`${displayName || 'Contact'} is now online`, { duration: 2000 });
    }, []);
    const handlePeerOffline = useCallback(({ peerId }) => {
        console.log('[ServiceSync] Peer offline:', peerId);
    }, []);
    // Set up event listeners
    useEffect(() => {
        console.log('[ServiceSync] Setting up event listeners');
        // Messaging service events
        messagingService.on('message-received', handleMessageReceived);
        messagingService.on('message-sent', handleMessageSent);
        messagingService.on('message-delivered', handleMessageDelivered);
        messagingService.on('message-read', handleMessageRead);
        messagingService.on('typing', handleTyping);
        messagingService.on('conversation-created', handleConversationCreated);
        // Connection manager events
        connectionManager.on('peer-online', handlePeerOnline);
        connectionManager.on('peer-offline', handlePeerOffline);
        return () => {
            console.log('[ServiceSync] Cleaning up event listeners');
            messagingService.off('message-received', handleMessageReceived);
            messagingService.off('message-sent', handleMessageSent);
            messagingService.off('message-delivered', handleMessageDelivered);
            messagingService.off('message-read', handleMessageRead);
            messagingService.off('typing', handleTyping);
            messagingService.off('conversation-created', handleConversationCreated);
            connectionManager.off('peer-online', handlePeerOnline);
            connectionManager.off('peer-offline', handlePeerOffline);
        };
    }, [
        handleMessageReceived,
        handleMessageSent,
        handleMessageDelivered,
        handleMessageRead,
        handleTyping,
        handleConversationCreated,
        handlePeerOnline,
        handlePeerOffline,
    ]);
    // Load initial data from database on mount
    useEffect(() => {
        const loadInitialData = () => {
            console.log('[ServiceSync] Loading initial data from database');
            // Load conversations from database
            const dbConversations = db.getAllConversations();
            dbConversations.forEach((conv) => {
                const participants = typeof conv.participants === 'string'
                    ? JSON.parse(conv.participants)
                    : conv.participants;
                // Check if conversation already exists in store
                const state = useChatStore.getState();
                if (!state.conversations[conv.id]) {
                    createConversation({
                        type: conv.type,
                        name: conv.name,
                        participants: participants.map((p) => ({
                            id: typeof p === 'string' ? p : p.id,
                            displayName: typeof p === 'string' ? conv.name || 'Unknown' : p.displayName || 'Unknown',
                            publicKey: '',
                            role: 'member',
                            joinedAt: Date.now(),
                        })),
                    });
                }
            });
        };
        // Small delay to ensure services are initialized
        const timer = setTimeout(loadInitialData, 500);
        return () => clearTimeout(timer);
    }, [createConversation]);
}
