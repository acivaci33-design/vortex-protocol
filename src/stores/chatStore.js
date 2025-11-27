/**
 * VORTEX Protocol - Chat Store
 * Manages conversations, messages, and chat state
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
const initialState = {
    conversations: {},
    messages: {},
    activeConversationId: null,
    typingIndicators: [],
    drafts: {},
    searchQuery: '',
    isSearching: false,
    searchResults: [],
};
export const useChatStore = create()(persist(immer((set, get) => ({
    ...initialState,
    // Computed
    sortedConversations: () => {
        const { conversations } = get();
        return Object.values(conversations)
            .filter(c => !c.isArchived)
            .sort((a, b) => {
            // Pinned first
            if (a.isPinned && !b.isPinned)
                return -1;
            if (!a.isPinned && b.isPinned)
                return 1;
            // Then by last activity
            const aTime = a.lastMessage?.createdAt ?? a.updatedAt;
            const bTime = b.lastMessage?.createdAt ?? b.updatedAt;
            return bTime - aTime;
        });
    },
    activeConversation: () => {
        const { conversations, activeConversationId } = get();
        return activeConversationId ? conversations[activeConversationId] ?? null : null;
    },
    activeMessages: () => {
        const { messages, activeConversationId } = get();
        if (!activeConversationId)
            return [];
        return (messages[activeConversationId] ?? [])
            .filter(m => !m.isDeleted)
            .sort((a, b) => a.createdAt - b.createdAt);
    },
    unreadTotal: () => {
        const { conversations } = get();
        return Object.values(conversations).reduce((sum, c) => sum + c.unreadCount, 0);
    },
    // Actions
    setActiveConversation: (id) => {
        set((state) => {
            state.activeConversationId = id;
        });
    },
    createConversation: (conversation) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        set((state) => {
            state.conversations[id] = {
                id,
                type: conversation.type,
                participants: conversation.participants,
                name: conversation.name,
                description: conversation.description,
                avatarUrl: conversation.avatarUrl,
                isPinned: conversation.isPinned ?? false,
                isMuted: conversation.isMuted ?? false,
                isArchived: conversation.isArchived ?? false,
                encryptionEnabled: conversation.encryptionEnabled ?? true,
                disappearingMessagesTimeout: conversation.disappearingMessagesTimeout,
                lastMessage: undefined,
                createdAt: now,
                updatedAt: now,
                unreadCount: 0,
            };
            state.messages[id] = [];
        });
        return id;
    },
    updateConversation: (id, updates) => {
        set((state) => {
            if (state.conversations[id]) {
                Object.assign(state.conversations[id], updates, { updatedAt: Date.now() });
            }
        });
    },
    deleteConversation: (id) => {
        set((state) => {
            delete state.conversations[id];
            delete state.messages[id];
            delete state.drafts[id];
            if (state.activeConversationId === id) {
                state.activeConversationId = null;
            }
        });
    },
    archiveConversation: (id, archived) => {
        set((state) => {
            if (state.conversations[id]) {
                state.conversations[id].isArchived = archived;
                state.conversations[id].updatedAt = Date.now();
            }
        });
    },
    pinConversation: (id, pinned) => {
        set((state) => {
            if (state.conversations[id]) {
                state.conversations[id].isPinned = pinned;
            }
        });
    },
    muteConversation: (id, until) => {
        set((state) => {
            if (state.conversations[id]) {
                state.conversations[id].isMuted = true;
                state.conversations[id].mutedUntil = until;
            }
        });
    },
    addMessage: (message) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const fullMessage = {
            ...message,
            id,
            reactions: [],
            isEdited: false,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
            expiresAt: message.ttlMs ? now + message.ttlMs : undefined,
        };
        set((state) => {
            if (!state.messages[message.conversationId]) {
                state.messages[message.conversationId] = [];
            }
            state.messages[message.conversationId].push(fullMessage);
            if (state.conversations[message.conversationId]) {
                state.conversations[message.conversationId].lastMessage = fullMessage;
                state.conversations[message.conversationId].updatedAt = now;
                // Increment unread if not active conversation and not sent by us
                if (state.activeConversationId !== message.conversationId &&
                    message.senderId !== 'self' // Replace with actual user ID check
                ) {
                    state.conversations[message.conversationId].unreadCount++;
                }
            }
        });
        return id;
    },
    updateMessage: (conversationId, messageId, updates) => {
        set((state) => {
            const messages = state.messages[conversationId];
            if (messages) {
                const index = messages.findIndex(m => m.id === messageId);
                if (index !== -1) {
                    Object.assign(messages[index], updates, {
                        updatedAt: Date.now(),
                        isEdited: updates.content !== undefined ? true : messages[index].isEdited,
                    });
                }
            }
        });
    },
    deleteMessage: (conversationId, messageId, forEveryone = false) => {
        set((state) => {
            const messages = state.messages[conversationId];
            if (messages) {
                const index = messages.findIndex(m => m.id === messageId);
                if (index !== -1) {
                    if (forEveryone) {
                        messages[index].isDeleted = true;
                        messages[index].content = '';
                        messages[index].attachments = [];
                    }
                    else {
                        messages.splice(index, 1);
                    }
                }
            }
        });
    },
    markAsRead: (conversationId, messageId) => {
        const now = Date.now();
        set((state) => {
            const messages = state.messages[conversationId];
            if (messages) {
                if (messageId) {
                    const msg = messages.find(m => m.id === messageId);
                    if (msg)
                        msg.readAt = now;
                }
                else {
                    // Mark all as read
                    messages.forEach(m => {
                        if (!m.readAt)
                            m.readAt = now;
                    });
                }
            }
            if (state.conversations[conversationId]) {
                state.conversations[conversationId].unreadCount = 0;
            }
        });
    },
    markAsDelivered: (conversationId, messageId) => {
        set((state) => {
            const messages = state.messages[conversationId];
            if (messages) {
                const msg = messages.find(m => m.id === messageId);
                if (msg && msg.status !== 'read') {
                    msg.status = 'delivered';
                    msg.deliveredAt = Date.now();
                }
            }
        });
    },
    addReaction: (conversationId, messageId, emoji, userId) => {
        set((state) => {
            const messages = state.messages[conversationId];
            if (messages) {
                const msg = messages.find(m => m.id === messageId);
                if (msg) {
                    // Remove existing reaction from same user
                    msg.reactions = msg.reactions.filter(r => r.userId !== userId);
                    msg.reactions.push({ emoji, userId, timestamp: Date.now() });
                }
            }
        });
    },
    removeReaction: (conversationId, messageId, userId) => {
        set((state) => {
            const messages = state.messages[conversationId];
            if (messages) {
                const msg = messages.find(m => m.id === messageId);
                if (msg) {
                    msg.reactions = msg.reactions.filter(r => r.userId !== userId);
                }
            }
        });
    },
    setTyping: (peerId, conversationId, isTyping) => {
        set((state) => {
            state.typingIndicators = state.typingIndicators.filter(t => !(t.peerId === peerId && t.conversationId === conversationId));
            if (isTyping) {
                state.typingIndicators.push({
                    peerId,
                    conversationId,
                    timestamp: Date.now(),
                });
            }
        });
    },
    clearStaleTypingIndicators: () => {
        const threshold = Date.now() - 5000; // 5 seconds
        set((state) => {
            state.typingIndicators = state.typingIndicators.filter(t => t.timestamp > threshold);
        });
    },
    setDraft: (conversationId, content, replyTo) => {
        set((state) => {
            state.drafts[conversationId] = {
                conversationId,
                content,
                replyTo,
                updatedAt: Date.now(),
            };
        });
    },
    clearDraft: (conversationId) => {
        set((state) => {
            delete state.drafts[conversationId];
        });
    },
    search: (query) => {
        set((state) => {
            state.searchQuery = query;
            state.isSearching = true;
        });
        // Perform search
        const allMessages = Object.values(get().messages).flat();
        const results = allMessages.filter(m => m.content.toLowerCase().includes(query.toLowerCase()) && !m.isDeleted);
        set((state) => {
            state.searchResults = results;
            state.isSearching = false;
        });
    },
    clearSearch: () => {
        set((state) => {
            state.searchQuery = '';
            state.searchResults = [];
            state.isSearching = false;
        });
    },
    clearExpiredMessages: () => {
        const now = Date.now();
        set((state) => {
            for (const conversationId of Object.keys(state.messages)) {
                state.messages[conversationId] = state.messages[conversationId].filter(m => !m.expiresAt || m.expiresAt > now);
            }
        });
    },
    reset: () => {
        set(initialState);
    },
})), {
    name: 'vortex-chat',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        conversations: state.conversations,
        messages: state.messages,
        drafts: state.drafts,
    }),
}));
// Typing indicator cleanup interval
setInterval(() => {
    useChatStore.getState().clearStaleTypingIndicators();
}, 3000);
// Expired messages cleanup interval
setInterval(() => {
    useChatStore.getState().clearExpiredMessages();
}, 10000);
