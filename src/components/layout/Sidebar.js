import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Sidebar Component
 * Displays conversation list, contacts, or other content based on active view
 */
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Pin, BellOff, ChevronLeft, MessageSquarePlus, UserPlus, } from 'lucide-react';
import { cn, formatRelativeTime, getInitials, stringToColor, truncate } from '../../lib/utils';
import { useChatStore } from '../../stores';
import { NewChatDialog } from '../chat/NewChatDialog';
import { AddContactModal } from '../contacts/AddContactModal';
import { connectionManager } from '../../services/p2p';
import { db } from '../../services/database';
export function Sidebar({ view, onCollapse }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [showNewChat, setShowNewChat] = useState(false);
    const [showAddContact, setShowAddContact] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx(NewChatDialog, { isOpen: showNewChat, onClose: () => setShowNewChat(false) }), _jsx(AddContactModal, { isOpen: showAddContact, onClose: () => setShowAddContact(false), onContactAdded: () => {
                    // Refresh contacts list
                    setShowAddContact(false);
                } }), _jsxs("div", { className: "h-full flex flex-col bg-surface-1 border-r border-border", children: [_jsxs("header", { className: "flex items-center justify-between px-4 py-3 border-b border-border", children: [_jsxs("h1", { className: "text-lg font-semibold text-text-primary", children: [view === 'chats' && 'Messages', view === 'contacts' && 'Contacts', view === 'calls' && 'Calls', view === 'settings' && 'Settings'] }), _jsxs("div", { className: "flex items-center gap-1", children: [view === 'chats' && (_jsx("button", { onClick: () => setShowNewChat(true), className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "New conversation", children: _jsx(MessageSquarePlus, { size: 18 }) })), view === 'contacts' && (_jsx("button", { onClick: () => setShowAddContact(true), className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "Add contact", children: _jsx(UserPlus, { size: 18 }) })), _jsx("button", { onClick: onCollapse, className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "Collapse sidebar", children: _jsx(ChevronLeft, { size: 18 }) })] })] }), _jsx("div", { className: "px-3 py-2", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" }), _jsx("input", { type: "text", placeholder: "Search...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full h-9 pl-9 pr-3 rounded-lg bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" })] }) }), view === 'chats' && (_jsxs("div", { className: "px-3 pb-2 flex gap-1", children: [_jsx(FilterChip, { active: !showArchived, onClick: () => setShowArchived(false), children: "All" }), _jsx(FilterChip, { active: showArchived, onClick: () => setShowArchived(true), children: "Archived" })] })), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [view === 'chats' && (_jsx(ConversationList, { searchQuery: searchQuery, showArchived: showArchived })), view === 'contacts' && _jsx(ContactList, { searchQuery: searchQuery }), view === 'calls' && _jsx(CallList, { searchQuery: searchQuery })] })] })] }));
}
function FilterChip({ children, active, onClick }) {
    return (_jsx("button", { onClick: onClick, className: cn('px-3 py-1 rounded-full text-xs font-medium transition-all', active
            ? 'bg-primary text-white'
            : 'bg-surface-3 text-text-secondary hover:bg-surface-4'), children: children }));
}
function ConversationList({ searchQuery, showArchived }) {
    const { conversations, activeConversationId, setActiveConversation, sortedConversations, } = useChatStore();
    const filteredConversations = useMemo(() => {
        let list = sortedConversations();
        // Filter by archived status
        list = list.filter(c => c.isArchived === showArchived);
        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(c => c.name?.toLowerCase().includes(query) ||
                c.lastMessage?.content.toLowerCase().includes(query));
        }
        return list;
    }, [sortedConversations, showArchived, searchQuery]);
    if (filteredConversations.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-4 text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4", children: _jsx(MessageSquarePlus, { className: "w-8 h-8 text-text-muted" }) }), _jsx("p", { className: "text-text-secondary text-sm", children: showArchived ? 'No archived chats' : 'No conversations yet' }), !showArchived && (_jsx("button", { className: "mt-3 text-primary text-sm font-medium hover:underline", children: "Start a new chat" }))] }));
    }
    return (_jsx("div", { className: "py-1", children: filteredConversations.map((conversation) => (_jsx(ConversationItem, { conversation: conversation, isActive: conversation.id === activeConversationId, onClick: () => setActiveConversation(conversation.id) }, conversation.id))) }));
}
function ConversationItem({ conversation, isActive, onClick }) {
    const displayName = conversation.name || conversation.participants[0]?.displayName || 'Unknown';
    const avatarColor = stringToColor(displayName);
    const lastMessageTime = conversation.lastMessage?.createdAt
        ? formatRelativeTime(conversation.lastMessage.createdAt)
        : '';
    return (_jsxs(motion.button, { onClick: onClick, className: cn('w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left', isActive
            ? 'bg-primary/10 border-l-2 border-primary'
            : 'hover:bg-surface-2 border-l-2 border-transparent'), whileTap: { scale: 0.98 }, children: [_jsxs("div", { className: "relative w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0", style: { backgroundColor: avatarColor }, children: [getInitials(displayName), _jsx("span", { className: "absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-surface-1" })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: cn('font-medium truncate', isActive ? 'text-text-primary' : 'text-text-primary'), children: displayName }), _jsx("span", { className: "text-[11px] text-text-muted shrink-0", children: lastMessageTime })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 mt-0.5", children: [_jsx("p", { className: "text-sm text-text-secondary truncate", children: conversation.lastMessage?.content || 'No messages yet' }), conversation.unreadCount > 0 && (_jsx("span", { className: "min-w-[20px] h-5 rounded-full bg-primary text-[11px] font-semibold flex items-center justify-center text-white px-1.5 shrink-0", children: conversation.unreadCount > 99 ? '99+' : conversation.unreadCount }))] })] }), _jsxs("div", { className: "flex flex-col items-center gap-1", children: [conversation.isPinned && (_jsx(Pin, { size: 12, className: "text-text-muted" })), conversation.isMuted && (_jsx(BellOff, { size: 12, className: "text-text-muted" }))] })] }));
}
function ContactList({ searchQuery }) {
    const [contacts, setContacts] = useState([]);
    const [onlineStatuses, setOnlineStatuses] = useState({});
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
        const handlePeerOnline = ({ peerId }) => {
            const contact = contacts.find(c => c.identityKey === peerId);
            if (contact) {
                setOnlineStatuses(prev => ({ ...prev, [contact.id]: true }));
            }
        };
        const handlePeerOffline = ({ peerId }) => {
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
        if (!searchQuery.trim())
            return contacts;
        const query = searchQuery.toLowerCase();
        return contacts.filter(c => c.displayName.toLowerCase().includes(query) ||
            c.identityKey.toLowerCase().includes(query));
    }, [contacts, searchQuery]);
    const handleContactClick = (contact) => {
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
                type: 'direct',
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
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-12 px-4 text-center", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4", children: _jsx(UserPlus, { className: "w-8 h-8 text-text-muted" }) }), _jsx("p", { className: "text-text-secondary text-sm", children: searchQuery ? 'No contacts found' : 'No contacts yet' })] }));
    }
    return (_jsx("div", { className: "py-1", children: filteredContacts.map((contact) => (_jsxs(motion.button, { onClick: () => handleContactClick(contact), className: "w-full px-3 py-2 flex items-center gap-3 hover:bg-surface-2 transition-colors", whileTap: { scale: 0.98 }, children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium", style: { backgroundColor: stringToColor(contact.displayName) }, children: getInitials(contact.displayName) }), _jsx("div", { className: cn('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-1', onlineStatuses[contact.id] ? 'bg-success' : 'bg-text-muted') })] }), _jsxs("div", { className: "flex-1 min-w-0 text-left", children: [_jsx("p", { className: "text-sm font-medium text-text-primary truncate", children: contact.displayName }), _jsx("p", { className: "text-xs text-text-muted truncate font-mono", children: truncate(contact.identityKey, 20) })] }), contact.verified && (_jsx("div", { className: "text-success", title: "Verified", children: _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }) }))] }, contact.id))) }));
}
function CallList({ searchQuery }) {
    // Placeholder for calls
    return (_jsx("div", { className: "flex flex-col items-center justify-center py-12 px-4 text-center", children: _jsx("p", { className: "text-text-secondary text-sm", children: "No call history" }) }));
}
