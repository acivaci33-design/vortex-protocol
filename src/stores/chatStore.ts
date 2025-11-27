/**
 * VORTEX Protocol - Chat Store
 * Manages conversations, messages, and chat state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'file' 
  | 'audio' 
  | 'video' 
  | 'voice' 
  | 'location' 
  | 'contact'
  | 'system';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: number;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  thumbnailUrl?: string;
  duration?: number; // for audio/video
  width?: number;    // for images/video
  height?: number;   // for images/video
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  type: MessageType;
  content: string;
  attachments?: MessageAttachment[];
  replyTo?: string;
  forwardedFrom?: string;
  reactions: Reaction[];
  status: MessageStatus;
  isEdited: boolean;
  isDeleted: boolean;
  ttlMs?: number;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
  readAt?: number;
  deliveredAt?: number;
  encryptedPayload?: string;
  nonce?: string;
}

export interface TypingIndicator {
  peerId: string;
  conversationId: string;
  timestamp: number;
}

export interface Draft {
  conversationId: string;
  content: string;
  replyTo?: string;
  attachments?: MessageAttachment[];
  updatedAt: number;
}

export type ConversationType = 'direct' | 'group' | 'channel';

export interface Participant {
  id: string;
  displayName: string;
  publicKey: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  lastSeen?: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  participants: Participant[];
  createdAt: number;
  updatedAt: number;
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  mutedUntil?: number;
  isArchived: boolean;
  encryptionEnabled: boolean;
  disappearingMessagesTimeout?: number;
}

interface ChatState {
  // State
  conversations: Record<string, Conversation>;
  messages: Record<string, Message[]>;
  activeConversationId: string | null;
  typingIndicators: TypingIndicator[];
  drafts: Record<string, Draft>;
  searchQuery: string;
  isSearching: boolean;
  searchResults: Message[];
  
  // Computed
  sortedConversations: () => Conversation[];
  activeConversation: () => Conversation | null;
  activeMessages: () => Message[];
  unreadTotal: () => number;
  
  // Actions
  setActiveConversation: (id: string | null) => void;
  createConversation: (conversation: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt' | 'unreadCount'>> & { type: ConversationType; participants: Participant[] }) => string;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  archiveConversation: (id: string, archived: boolean) => void;
  pinConversation: (id: string, pinned: boolean) => void;
  muteConversation: (id: string, until?: number) => void;
  
  addMessage: (message: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'reactions' | 'isEdited' | 'isDeleted'>) => string;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string, forEveryone?: boolean) => void;
  markAsRead: (conversationId: string, messageId?: string) => void;
  markAsDelivered: (conversationId: string, messageId: string) => void;
  
  addReaction: (conversationId: string, messageId: string, emoji: string, userId: string) => void;
  removeReaction: (conversationId: string, messageId: string, userId: string) => void;
  
  setTyping: (peerId: string, conversationId: string, isTyping: boolean) => void;
  clearStaleTypingIndicators: () => void;
  
  setDraft: (conversationId: string, content: string, replyTo?: string) => void;
  clearDraft: (conversationId: string) => void;
  
  search: (query: string) => void;
  clearSearch: () => void;
  
  clearExpiredMessages: () => void;
  reset: () => void;
}

const initialState = {
  conversations: {} as Record<string, Conversation>,
  messages: {} as Record<string, Message[]>,
  activeConversationId: null as string | null,
  typingIndicators: [] as TypingIndicator[],
  drafts: {} as Record<string, Draft>,
  searchQuery: '',
  isSearching: false,
  searchResults: [] as Message[],
};

export const useChatStore = create<ChatState>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      
      // Computed
      sortedConversations: () => {
        const { conversations } = get();
        return Object.values(conversations)
          .filter(c => !c.isArchived)
          .sort((a, b) => {
            // Pinned first
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
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
        if (!activeConversationId) return [];
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
        const fullMessage: Message = {
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
            if (
              state.activeConversationId !== message.conversationId &&
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
              } else {
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
              if (msg) msg.readAt = now;
            } else {
              // Mark all as read
              messages.forEach(m => {
                if (!m.readAt) m.readAt = now;
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
          state.typingIndicators = state.typingIndicators.filter(
            t => !(t.peerId === peerId && t.conversationId === conversationId)
          );
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
          state.typingIndicators = state.typingIndicators.filter(
            t => t.timestamp > threshold
          );
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
        const results = allMessages.filter(m => 
          m.content.toLowerCase().includes(query.toLowerCase()) && !m.isDeleted
        );
        
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
            state.messages[conversationId] = state.messages[conversationId].filter(
              m => !m.expiresAt || m.expiresAt > now
            );
          }
        });
      },
      
      reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'vortex-chat',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        messages: state.messages,
        drafts: state.drafts,
      }),
    }
  )
);

// Typing indicator cleanup interval
setInterval(() => {
  useChatStore.getState().clearStaleTypingIndicators();
}, 3000);

// Expired messages cleanup interval
setInterval(() => {
  useChatStore.getState().clearExpiredMessages();
}, 10000);
