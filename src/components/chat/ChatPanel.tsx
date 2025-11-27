/**
 * VORTEX Protocol - Chat Panel
 * Main chat interface with message list and input
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Send, 
  Mic, 
  Image,
  File,
  X,
  Reply,
  Forward,
  Copy,
  Trash2,
  Pin,
  Check,
  CheckCheck,
  Clock,
  Lock,
  Shield,
  Info,
  Search,
  ChevronDown,
  AtSign,
  Hash,
  Timer,
} from 'lucide-react';
import { cn, formatChatTime, getInitials, stringToColor, copyToClipboard } from '../../lib/utils';
import { useChatStore, usePeerStore, type Message, type Conversation } from '../../stores';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { EmojiPicker } from './EmojiPicker';
import { messagingService } from '../../services/messaging';
import { connectionManager } from '../../services/p2p';
import { identityService } from '../../services/identity';
import { db } from '../../services/database';
import toast from 'react-hot-toast';

interface ChatPanelProps {
  onToggleDetail: () => void;
}

export function ChatPanel({ onToggleDetail }: ChatPanelProps) {
  const { 
    activeConversation, 
    activeMessages,
    typingIndicators,
    drafts,
    setDraft,
    clearDraft,
    addMessage,
  } = useChatStore();
  
  const { connectedPeers, startCall } = usePeerStore();
  
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversation = activeConversation();
  const messages = activeMessages();
  const draft = conversation ? drafts[conversation.id] : null;

  // Load draft on conversation change
  useEffect(() => {
    if (draft) {
      setInputValue(draft.content);
    } else {
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
  const activeTypers = typingIndicators.filter(
    t => t.conversationId === conversation?.id
  );

  // Handle scroll state
  const handleScroll = useCallback((scrolling: boolean) => {
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
    if (!inputValue.trim() && attachments.length === 0) return;
    if (!conversation) return;

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
    } catch (error: any) {
      console.error('[Chat] Send error:', error);
      toast.error(error.message || 'Failed to send message');
    }
  }, [inputValue, attachments, conversation, addMessage, replyingTo, clearDraft, scrollToBottom]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle emoji select
  const handleEmojiSelect = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  // No conversation selected
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-0">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-10 h-10 text-text-muted" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            VORTEX Protocol
          </h2>
          <p className="text-text-secondary text-sm max-w-sm">
            Select a conversation to start messaging with end-to-end encryption
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-text-muted">
            <Shield size={14} className="text-success" />
            <span>All messages are encrypted</span>
          </div>
        </div>
      </div>
    );
  }

  const displayName = conversation.name || conversation.participants[0]?.displayName || 'Unknown';
  const avatarColor = stringToColor(displayName);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1/50 backdrop-blur-sm">
        <button 
          onClick={onToggleDetail}
          className="flex items-center gap-3 hover:bg-surface-2 -ml-2 px-2 py-1 rounded-lg transition-colors"
        >
          {/* Avatar */}
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(displayName)}
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-text-primary">{displayName}</h2>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-2 h-2 rounded-full bg-online" />
              <span>Online</span>
              <span className="text-text-muted">•</span>
              <span className="flex items-center gap-1">
                <Lock size={10} />
                Encrypted
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => startCall(conversation.participants[0]?.id, conversation.id, 'audio')}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            title="Voice call"
          >
            <Phone size={18} />
          </button>
          <button 
            onClick={() => startCall(conversation.participants[0]?.id, conversation.id, 'video')}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            title="Video call"
          >
            <Video size={18} />
          </button>
          <button 
            className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            title="Search in conversation"
          >
            <Search size={18} />
          </button>
          <button 
            onClick={onToggleDetail}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            title="Conversation info"
          >
            <Info size={18} />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 relative">
        <Virtuoso
          ref={virtuosoRef}
          data={messages}
          className="h-full"
          followOutput="smooth"
          alignToBottom
          itemContent={(index, message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === 'self'}
              showAvatar={index === 0 || messages[index - 1]?.senderId !== message.senderId}
              onReply={() => setReplyingTo(message)}
            />
          )}
          components={{
            Footer: () => (
              <AnimatePresence>
                {activeTypers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="px-4 pb-3"
                  >
                    <TypingIndicator names={activeTypers.map(t => t.peerId)} />
                  </motion.div>
                )}
              </AnimatePresence>
            ),
          }}
        />

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-surface-3 border border-border shadow-float flex items-center justify-center hover:bg-surface-4 transition-colors"
            >
              <ChevronDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-surface-1/50 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-2">
              <Reply size={16} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary font-medium">
                  Reply to {replyingTo.senderId === 'self' ? 'yourself' : displayName}
                </p>
                <p className="text-sm text-text-secondary truncate">
                  {replyingTo.content}
                </p>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="p-1 hover:bg-surface-3 rounded transition-colors"
              >
                <X size={16} className="text-text-muted" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border bg-surface-1/50 overflow-hidden"
          >
            <div className="flex gap-2 px-4 py-2 overflow-x-auto">
              {attachments.map((file, index) => (
                <div 
                  key={index}
                  className="relative flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-lg border border-border"
                >
                  <File size={16} className="text-text-muted" />
                  <span className="text-sm text-text-secondary max-w-[100px] truncate">
                    {file.name}
                  </span>
                  <button 
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                    className="p-0.5 hover:bg-surface-3 rounded transition-colors"
                  >
                    <X size={14} className="text-text-muted" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-border bg-surface-1/50 px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Input Field */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full max-h-32 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              style={{ minHeight: '42px' }}
            />
          </div>

          {/* Emoji Button */}
          <div className="relative">
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={cn(
                'p-2 rounded-lg transition-colors shrink-0',
                showEmojiPicker 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-surface-3 text-text-tertiary hover:text-text-primary'
              )}
            >
              <Smile size={20} />
            </button>
            <AnimatePresence>
              {showEmojiPicker && (
                <EmojiPicker 
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Send/Voice Button */}
          {inputValue.trim() || attachments.length > 0 ? (
            <button 
              onClick={sendMessage}
              className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors shrink-0 shadow-glow-sm"
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              className="p-2.5 rounded-xl hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
            >
              <Mic size={20} />
            </button>
          )}
        </div>

        {/* Encryption indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-2xs text-text-muted">
          <Lock size={10} />
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
}
