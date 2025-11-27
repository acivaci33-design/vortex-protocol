/**
 * VORTEX Protocol - Sidebar Component
 * Displays conversation list, contacts, or other content based on active view
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Pin, 
  Archive, 
  Trash2,
  Bell,
  BellOff,
  ChevronLeft,
  Filter,
  SortAsc,
  MessageSquarePlus,
  UserPlus,
} from 'lucide-react';
import { cn, formatRelativeTime, getInitials, stringToColor, truncate } from '../../lib/utils';
import { useChatStore, type Conversation, type Message } from '../../stores';
import { NewChatDialog } from '../chat/NewChatDialog';
import { AddContactModal } from '../contacts/AddContactModal';
import { contactService } from '../../services/contacts';
import { connectionManager } from '../../services/p2p';
import { db, type Contact } from '../../services/database';

interface SidebarProps {
  view: 'chats' | 'contacts' | 'calls' | 'settings';
  onCollapse: () => void;
}

export function Sidebar({ view, onCollapse }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  
  return (
    <>
    <NewChatDialog isOpen={showNewChat} onClose={() => setShowNewChat(false)} />
    <AddContactModal 
      isOpen={showAddContact} 
      onClose={() => setShowAddContact(false)}
      onContactAdded={() => {
        // Refresh contacts list
        setShowAddContact(false);
      }}
    />
    <div className="h-full flex flex-col bg-surface-1 border-r border-border">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-lg font-semibold text-text-primary">
          {view === 'chats' && 'Messages'}
          {view === 'contacts' && 'Contacts'}
          {view === 'calls' && 'Calls'}
          {view === 'settings' && 'Settings'}
        </h1>
        <div className="flex items-center gap-1">
          {view === 'chats' && (
            <button 
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
              title="New conversation"
            >
              <MessageSquarePlus size={18} />
            </button>
          )}
          {view === 'contacts' && (
            <button 
              onClick={() => setShowAddContact(true)}
              className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
              title="Add contact"
            >
              <UserPlus size={18} />
            </button>
          )}
          <button 
            onClick={onCollapse}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      {view === 'chats' && (
        <div className="px-3 pb-2 flex gap-1">
          <FilterChip 
            active={!showArchived} 
            onClick={() => setShowArchived(false)}
          >
            All
          </FilterChip>
          <FilterChip 
            active={showArchived} 
            onClick={() => setShowArchived(true)}
          >
            Archived
          </FilterChip>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'chats' && (
          <ConversationList 
            searchQuery={searchQuery} 
            showArchived={showArchived}
          />
        )}
        {view === 'contacts' && <ContactList searchQuery={searchQuery} />}
        {view === 'calls' && <CallList searchQuery={searchQuery} />}
      </div>
    </div>
    </>
  );
}

function FilterChip({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-all',
        active 
          ? 'bg-primary text-white' 
          : 'bg-surface-3 text-text-secondary hover:bg-surface-4'
      )}
    >
      {children}
    </button>
  );
}

function ConversationList({ 
  searchQuery, 
  showArchived 
}: { 
  searchQuery: string; 
  showArchived: boolean;
}) {
  const { 
    conversations, 
    activeConversationId, 
    setActiveConversation,
    sortedConversations,
  } = useChatStore();

  const filteredConversations = useMemo(() => {
    let list = sortedConversations();
    
    // Filter by archived status
    list = list.filter(c => c.isArchived === showArchived);
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name?.toLowerCase().includes(query) ||
        c.lastMessage?.content.toLowerCase().includes(query)
      );
    }
    
    return list;
  }, [sortedConversations, showArchived, searchQuery]);

  if (filteredConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4">
          <MessageSquarePlus className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-secondary text-sm">
          {showArchived ? 'No archived chats' : 'No conversations yet'}
        </p>
        {!showArchived && (
          <button className="mt-3 text-primary text-sm font-medium hover:underline">
            Start a new chat
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-1">
      {filteredConversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === activeConversationId}
          onClick={() => setActiveConversation(conversation.id)}
        />
      ))}
    </div>
  );
}

function ConversationItem({ 
  conversation, 
  isActive, 
  onClick 
}: { 
  conversation: Conversation; 
  isActive: boolean;
  onClick: () => void;
}) {
  const displayName = conversation.name || conversation.participants[0]?.displayName || 'Unknown';
  const avatarColor = stringToColor(displayName);
  const lastMessageTime = conversation.lastMessage?.createdAt 
    ? formatRelativeTime(conversation.lastMessage.createdAt)
    : '';

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left',
        isActive 
          ? 'bg-primary/10 border-l-2 border-primary' 
          : 'hover:bg-surface-2 border-l-2 border-transparent'
      )}
      whileTap={{ scale: 0.98 }}
    >
      {/* Avatar */}
      <div 
        className="relative w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0"
        style={{ backgroundColor: avatarColor }}
      >
        {getInitials(displayName)}
        {/* Online indicator */}
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-surface-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium truncate',
            isActive ? 'text-text-primary' : 'text-text-primary'
          )}>
            {displayName}
          </span>
          <span className="text-[11px] text-text-muted shrink-0">
            {lastMessageTime}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-text-secondary truncate">
            {conversation.lastMessage?.content || 'No messages yet'}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="min-w-[20px] h-5 rounded-full bg-primary text-[11px] font-semibold flex items-center justify-center text-white px-1.5 shrink-0">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="flex flex-col items-center gap-1">
        {conversation.isPinned && (
          <Pin size={12} className="text-text-muted" />
        )}
        {conversation.isMuted && (
          <BellOff size={12} className="text-text-muted" />
        )}
      </div>
    </motion.button>
  );
}

function ContactList({ searchQuery }: { searchQuery: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const { setActiveConversation } = useChatStore();

  // Load contacts
  useEffect(() => {
    const loadContacts = () => {
      const allContacts = db.getAllContacts();
      setContacts(allContacts);

      // Check online status for each contact
      allContacts.forEach(async (contact) => {
        if (connectionManager.getStatus() === 'connected') {
          const isOnline = await connectionManager.checkPeerOnline(contact.identityKey);
          setOnlineStatuses(prev => ({ ...prev, [contact.id]: isOnline }));
        }
      });
    };

    loadContacts();

    // Listen for online/offline events
    const handlePeerOnline = ({ peerId }: { peerId: string }) => {
      const contact = contacts.find(c => c.identityKey === peerId);
      if (contact) {
        setOnlineStatuses(prev => ({ ...prev, [contact.id]: true }));
      }
    };

    const handlePeerOffline = ({ peerId }: { peerId: string }) => {
      const contact = contacts.find(c => c.identityKey === peerId);
      if (contact) {
        setOnlineStatuses(prev => ({ ...prev, [contact.id]: false }));
      }
    };

    connectionManager.on('peer-online', handlePeerOnline);
    connectionManager.on('peer-offline', handlePeerOffline);

    return () => {
      connectionManager.off('peer-online', handlePeerOnline);
      connectionManager.off('peer-offline', handlePeerOffline);
    };
  }, []);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.displayName.toLowerCase().includes(query) ||
      c.identityKey.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleContactClick = (contact: Contact) => {
    // Find or create conversation with this contact
    const conversations = db.getAllConversations();
    let conv = conversations.find(c => {
      const participants = JSON.parse(c.participants);
      return participants.includes(contact.identityKey);
    });

    if (!conv) {
      // Create new conversation
      conv = {
        id: crypto.randomUUID(),
        type: 'direct' as const,
        name: contact.displayName,
        participants: JSON.stringify([contact.identityKey]),
        encryptionEnabled: true,
        isPinned: false,
        isMuted: false,
        isArchived: false,
        unreadCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      db.saveConversation(conv);
    }

    setActiveConversation(conv.id);
  };

  if (filteredContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4">
          <UserPlus className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-text-secondary text-sm">
          {searchQuery ? 'No contacts found' : 'No contacts yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {filteredContacts.map((contact) => (
        <motion.button
          key={contact.id}
          onClick={() => handleContactClick(contact)}
          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-surface-2 transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: stringToColor(contact.displayName) }}
            >
              {getInitials(contact.displayName)}
            </div>
            {/* Online indicator */}
            <div
              className={cn(
                'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-1',
                onlineStatuses[contact.id] ? 'bg-success' : 'bg-text-muted'
              )}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-text-primary truncate">
              {contact.displayName}
            </p>
            <p className="text-xs text-text-muted truncate font-mono">
              {truncate(contact.identityKey, 20)}
            </p>
          </div>

          {/* Verified badge */}
          {contact.verified && (
            <div className="text-success" title="Verified">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}

function CallList({ searchQuery }: { searchQuery: string }) {
  // Placeholder for calls
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <p className="text-text-secondary text-sm">No call history</p>
    </div>
  );
}
