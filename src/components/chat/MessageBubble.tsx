/**
 * VORTEX Protocol - Message Bubble Component
 * Individual message display with reactions, status, and context menu
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  CheckCheck,
  Clock,
  Reply,
  Forward,
  Copy,
  Trash2,
  MoreHorizontal,
  Smile,
  Download,
  Play,
  Pause,
  File,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import { cn, formatChatTime, copyToClipboard, getInitials, stringToColor } from '../../lib/utils';
import type { Message, MessageStatus } from '../../stores';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  onReply,
  onForward,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(message.content);
  };

  const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group flex gap-2 px-4 py-1',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Avatar */}
      {!isOwn && showAvatar ? (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 mt-auto"
          style={{ backgroundColor: stringToColor(message.senderId) }}
        >
          {getInitials(message.senderId)}
        </div>
      ) : !isOwn ? (
        <div className="w-8 shrink-0" />
      ) : null}

      {/* Message Content */}
      <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        {/* Reply Preview */}
        {message.replyTo && (
          <div
            className={cn(
              'text-xs px-3 py-1.5 rounded-t-lg border-l-2 mb-0.5 max-w-full truncate',
              isOwn
                ? 'bg-primary/20 border-primary/50 text-primary-foreground/70'
                : 'bg-surface-3 border-text-muted text-text-secondary'
            )}
          >
            <span className="opacity-70">Replying to message</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'relative px-3 py-2 rounded-2xl max-w-full break-words',
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-surface-2 text-text-primary rounded-bl-md',
            message.isDeleted && 'italic opacity-60'
          )}
        >
          {message.isDeleted ? (
            <span className="text-sm">This message was deleted</span>
          ) : (
            <>
              {/* Text Content */}
              {message.type === 'text' && (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}

              {/* Image Content */}
              {message.type === 'image' && message.attachments?.[0] && (
                <div className="relative">
                  <img
                    src={message.attachments[0].url}
                    alt={message.attachments[0].name}
                    className="max-w-[300px] rounded-lg"
                  />
                </div>
              )}

              {/* File Content */}
              {message.type === 'file' && message.attachments?.[0] && (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <File size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.attachments[0].name}
                    </p>
                    <p className="text-xs opacity-70">
                      {formatFileSize(message.attachments[0].size)}
                    </p>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <Download size={16} />
                  </button>
                </div>
              )}

              {/* Voice Message */}
              {message.type === 'voice' && (
                <div className="flex items-center gap-3 min-w-[200px]">
                  <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                    <Play size={14} fill="currentColor" />
                  </button>
                  <div className="flex-1">
                    <div className="h-1 bg-white/30 rounded-full">
                      <div className="h-1 bg-white rounded-full w-0" />
                    </div>
                  </div>
                  <span className="text-xs opacity-70">0:00</span>
                </div>
              )}

              {/* Timestamp & Status */}
              <div
                className={cn(
                  'flex items-center gap-1 mt-1',
                  isOwn ? 'justify-end' : 'justify-start'
                )}
              >
                <span className={cn('text-[10px]', isOwn ? 'text-white/60' : 'text-text-muted')}>
                  {formatChatTime(message.createdAt)}
                </span>
                {message.isEdited && (
                  <span className={cn('text-[10px]', isOwn ? 'text-white/60' : 'text-text-muted')}>
                    (edited)
                  </span>
                )}
                {isOwn && <MessageStatusIcon status={message.status} />}
              </div>
            </>
          )}
        </div>

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1 mt-1',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            {groupReactions(message.reactions).map(({ emoji, count }) => (
              <span
                key={emoji}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-3 text-xs"
              >
                {emoji}
                {count > 1 && <span className="text-text-muted">{count}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {showActions && !message.isDeleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'flex items-center gap-0.5 bg-surface-2 rounded-lg border border-border shadow-float p-0.5 self-center',
            isOwn ? 'mr-2' : 'ml-2'
          )}
        >
          <ActionButton
            icon={Smile}
            onClick={() => setShowReactions(!showReactions)}
            title="React"
          />
          <ActionButton icon={Reply} onClick={onReply} title="Reply" />
          <ActionButton icon={Copy} onClick={handleCopy} title="Copy" />
          <ActionButton icon={MoreHorizontal} onClick={() => {}} title="More" />
        </motion.div>
      )}

      {/* Quick Reactions Popup */}
      {showReactions && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'absolute bg-surface-2 rounded-full border border-border shadow-float p-1 flex gap-0.5',
            isOwn ? 'right-20' : 'left-20'
          )}
        >
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              className="w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-lg transition-colors"
              onClick={() => {
                // Add reaction
                setShowReactions(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: React.ElementType;
  onClick?: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
    >
      <Icon size={14} />
    </button>
  );
}

function MessageStatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <Clock size={12} className="text-white/40" />;
    case 'sent':
      return <Check size={12} className="text-white/60" />;
    case 'delivered':
      return <CheckCheck size={12} className="text-white/60" />;
    case 'read':
      return <CheckCheck size={12} className="text-blue-300" />;
    case 'failed':
      return <span className="text-[10px] text-danger">!</span>;
    default:
      return null;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function groupReactions(reactions: Array<{ emoji: string; userId: string }>) {
  const groups: Record<string, number> = {};
  reactions.forEach((r) => {
    groups[r.emoji] = (groups[r.emoji] || 0) + 1;
  });
  return Object.entries(groups).map(([emoji, count]) => ({ emoji, count }));
}
