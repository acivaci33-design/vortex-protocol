import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Chat Panel
 * Main chat interface with message list and input
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso } from 'react-virtuoso';
import { Phone, Video, Paperclip, Smile, Send, Mic, File, X, Reply, Lock, Shield, Info, Search, ChevronDown, } from 'lucide-react';
import { cn, getInitials, stringToColor } from '../../lib/utils';
import { useChatStore, usePeerStore } from '../../stores';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { EmojiPicker } from './EmojiPicker';
import { messagingService } from '../../services/messaging';
import { identityService } from '../../services/identity';
import toast from 'react-hot-toast';
export function ChatPanel({ onToggleDetail }) {
    const { activeConversation, activeMessages, typingIndicators, drafts, setDraft, clearDraft, addMessage, } = useChatStore();
    const { connectedPeers, startCall } = usePeerStore();
    const [inputValue, setInputValue] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const virtuosoRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const conversation = activeConversation();
    const messages = activeMessages();
    const draft = conversation ? drafts[conversation.id] : null;
    // Load draft on conversation change
    useEffect(() => {
        if (draft) {
            setInputValue(draft.content);
        }
        else {
            setInputValue('');
        }
    }, [draft, conversation?.id]);
    // Save draft on input change
    useEffect(() => {
        if (conversation && inputValue.trim()) {
            setDraft(conversation.id, inputValue, replyingTo?.id);
        }
    }, [inputValue, conversation, setDraft, replyingTo]);
    // Typing indicators for current conversation
    const activeTypers = typingIndicators.filter(t => t.conversationId === conversation?.id);
    // Handle scroll state
    const handleScroll = useCallback((scrolling) => {
        // Implementation for detecting if user is at bottom
    }, []);
    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        virtuosoRef.current?.scrollToIndex({
            index: messages.length - 1,
            behavior: 'smooth',
        });
        setShowScrollButton(false);
    }, [messages.length]);
    // Send message using real messaging service
    const sendMessage = useCallback(async () => {
        if (!inputValue.trim() && attachments.length === 0)
            return;
        if (!conversation)
            return;
        const identity = identityService.getIdentity();
        if (!identity) {
            toast.error('No identity found');
            return;
        }
        // Get peer ID from conversation participants
        const participants = typeof conversation.participants === 'string'
            ? JSON.parse(conversation.participants)
            : conversation.participants;
        const peerId = Array.isArray(participants)
            ? (typeof participants[0] === 'string' ? participants[0] : participants[0]?.id)
            : null;
        if (!peerId) {
            toast.error('No recipient found');
            return;
        }
        try {
            // Use messaging service to send
            await messagingService.sendMessage({
                conversationId: conversation.id,
                content: inputValue.trim(),
                type: 'text',
                replyToId: replyingTo?.id,
            });
            // Also add to local store for immediate display
            addMessage({
                conversationId: conversation.id,
                senderId: identity.id,
                type: 'text',
                content: inputValue.trim(),
                status: 'sent',
                replyTo: replyingTo?.id,
            });
            setInputValue('');
            setReplyingTo(null);
            setAttachments([]);
            clearDraft(conversation.id);
            // Scroll to bottom
            setTimeout(() => scrollToBottom(), 100);
        }
        catch (error) {
            console.error('[Chat] Send error:', error);
            toast.error(error.message || 'Failed to send message');
        }
    }, [inputValue, attachments, conversation, addMessage, replyingTo, clearDraft, scrollToBottom]);
    // Handle key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    // Handle emoji select
    const handleEmojiSelect = (emoji) => {
        setInputValue(prev => prev + emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };
    // Handle file selection
    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        setAttachments(prev => [...prev, ...files]);
        e.target.value = '';
    };
    // No conversation selected
    if (!conversation) {
        return (_jsx("div", { className: "flex-1 flex items-center justify-center bg-surface-0", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4", children: _jsx(Lock, { className: "w-10 h-10 text-text-muted" }) }), _jsx("h2", { className: "text-xl font-semibold text-text-primary mb-2", children: "VORTEX Protocol" }), _jsx("p", { className: "text-text-secondary text-sm max-w-sm", children: "Select a conversation to start messaging with end-to-end encryption" }), _jsxs("div", { className: "flex items-center justify-center gap-2 mt-4 text-xs text-text-muted", children: [_jsx(Shield, { size: 14, className: "text-success" }), _jsx("span", { children: "All messages are encrypted" })] })] }) }));
    }
    const displayName = conversation.name || conversation.participants[0]?.displayName || 'Unknown';
    const avatarColor = stringToColor(displayName);
    return (_jsxs("div", { className: "flex-1 flex flex-col min-h-0", children: [_jsxs("header", { className: "flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1/50 backdrop-blur-sm", children: [_jsxs("button", { onClick: onToggleDetail, className: "flex items-center gap-3 hover:bg-surface-2 -ml-2 px-2 py-1 rounded-lg transition-colors", children: [_jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm", style: { backgroundColor: avatarColor }, children: getInitials(displayName) }), _jsxs("div", { className: "text-left", children: [_jsx("h2", { className: "font-semibold text-text-primary", children: displayName }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-text-secondary", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-online" }), _jsx("span", { children: "Online" }), _jsx("span", { className: "text-text-muted", children: "\u2022" }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Lock, { size: 10 }), "Encrypted"] })] })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => startCall(conversation.participants[0]?.id, conversation.id, 'audio'), className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "Voice call", children: _jsx(Phone, { size: 18 }) }), _jsx("button", { onClick: () => startCall(conversation.participants[0]?.id, conversation.id, 'video'), className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "Video call", children: _jsx(Video, { size: 18 }) }), _jsx("button", { className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "Search in conversation", children: _jsx(Search, { size: 18 }) }), _jsx("button", { onClick: onToggleDetail, className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", title: "Conversation info", children: _jsx(Info, { size: 18 }) })] })] }), _jsxs("div", { className: "flex-1 relative", children: [_jsx(Virtuoso, { ref: virtuosoRef, data: messages, className: "h-full", followOutput: "smooth", alignToBottom: true, itemContent: (index, message) => (_jsx(MessageBubble, { message: message, isOwn: message.senderId === 'self', showAvatar: index === 0 || messages[index - 1]?.senderId !== message.senderId, onReply: () => setReplyingTo(message) }, message.id)), components: {
                            Footer: () => (_jsx(AnimatePresence, { children: activeTypers.length > 0 && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 }, className: "px-4 pb-3", children: _jsx(TypingIndicator, { names: activeTypers.map(t => t.peerId) }) })) })),
                        } }), _jsx(AnimatePresence, { children: showScrollButton && (_jsx(motion.button, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.8 }, onClick: scrollToBottom, className: "absolute bottom-4 right-4 w-10 h-10 rounded-full bg-surface-3 border border-border shadow-float flex items-center justify-center hover:bg-surface-4 transition-colors", children: _jsx(ChevronDown, { size: 20 }) })) })] }), _jsx(AnimatePresence, { children: replyingTo && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "border-t border-border bg-surface-1/50 overflow-hidden", children: _jsxs("div", { className: "flex items-center gap-3 px-4 py-2", children: [_jsx(Reply, { size: 16, className: "text-primary shrink-0" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("p", { className: "text-xs text-primary font-medium", children: ["Reply to ", replyingTo.senderId === 'self' ? 'yourself' : displayName] }), _jsx("p", { className: "text-sm text-text-secondary truncate", children: replyingTo.content })] }), _jsx("button", { onClick: () => setReplyingTo(null), className: "p-1 hover:bg-surface-3 rounded transition-colors", children: _jsx(X, { size: 16, className: "text-text-muted" }) })] }) })) }), _jsx(AnimatePresence, { children: attachments.length > 0 && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, className: "border-t border-border bg-surface-1/50 overflow-hidden", children: _jsx("div", { className: "flex gap-2 px-4 py-2 overflow-x-auto", children: attachments.map((file, index) => (_jsxs("div", { className: "relative flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-lg border border-border", children: [_jsx(File, { size: 16, className: "text-text-muted" }), _jsx("span", { className: "text-sm text-text-secondary max-w-[100px] truncate", children: file.name }), _jsx("button", { onClick: () => setAttachments(prev => prev.filter((_, i) => i !== index)), className: "p-0.5 hover:bg-surface-3 rounded transition-colors", children: _jsx(X, { size: 14, className: "text-text-muted" }) })] }, index))) }) })) }), _jsxs("div", { className: "border-t border-border bg-surface-1/50 px-4 py-3", children: [_jsxs("div", { className: "flex items-end gap-2", children: [_jsx("button", { onClick: () => fileInputRef.current?.click(), className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors shrink-0", children: _jsx(Paperclip, { size: 20 }) }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", onChange: handleFileSelect }), _jsx("div", { className: "flex-1 relative", children: _jsx("textarea", { ref: inputRef, value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyDown: handleKeyPress, placeholder: "Type a message...", rows: 1, className: "w-full max-h-32 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all", style: { minHeight: '42px' } }) }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => setShowEmojiPicker(!showEmojiPicker), className: cn('p-2 rounded-lg transition-colors shrink-0', showEmojiPicker
                                            ? 'bg-primary text-white'
                                            : 'hover:bg-surface-3 text-text-tertiary hover:text-text-primary'), children: _jsx(Smile, { size: 20 }) }), _jsx(AnimatePresence, { children: showEmojiPicker && (_jsx(EmojiPicker, { onSelect: handleEmojiSelect, onClose: () => setShowEmojiPicker(false) })) })] }), inputValue.trim() || attachments.length > 0 ? (_jsx("button", { onClick: sendMessage, className: "p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors shrink-0 shadow-glow-sm", children: _jsx(Send, { size: 20 }) })) : (_jsx("button", { className: "p-2.5 rounded-xl hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors shrink-0", children: _jsx(Mic, { size: 20 }) }))] }), _jsxs("div", { className: "flex items-center justify-center gap-1.5 mt-2 text-2xs text-text-muted", children: [_jsx(Lock, { size: 10 }), _jsx("span", { children: "End-to-end encrypted" })] })] })] }));
}
