/**
 * VORTEX Protocol - Reaction Picker Component
 * Quick emoji reactions for messages
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReactionPickerProps {
  onSelect: (reaction: string) => void;
  onShowFullPicker: () => void;
  existingReactions?: Record<string, string[]>;
  currentUserId?: string;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function ReactionPicker({ 
  onSelect, 
  onShowFullPicker,
  existingReactions = {},
  currentUserId 
}: ReactionPickerProps) {
  const hasReacted = (emoji: string) => {
    if (!currentUserId) return false;
    return existingReactions[emoji]?.includes(currentUserId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1 p-1.5 bg-surface-2 rounded-full border border-border shadow-glass"
    >
      {quickReactions.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className={cn(
            'w-8 h-8 flex items-center justify-center text-lg rounded-full transition-all',
            hasReacted(emoji)
              ? 'bg-primary/20 scale-110'
              : 'hover:bg-surface-3 hover:scale-110'
          )}
        >
          {emoji}
        </button>
      ))}
      
      {/* More reactions button */}
      <button
        onClick={onShowFullPicker}
        className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
        title="More reactions"
      >
        <Plus size={16} />
      </button>
    </motion.div>
  );
}

interface ReactionDisplayProps {
  reactions: Record<string, string[]>;
  currentUserId?: string;
  onReactionClick: (reaction: string) => void;
  compact?: boolean;
}

export function ReactionDisplay({ 
  reactions, 
  currentUserId, 
  onReactionClick,
  compact = false 
}: ReactionDisplayProps) {
  const reactionEntries = Object.entries(reactions).filter(([_, users]) => users.length > 0);
  
  if (reactionEntries.length === 0) return null;

  return (
    <div className={cn(
      'flex flex-wrap gap-1',
      compact ? 'mt-1' : 'mt-2'
    )}>
      {reactionEntries.map(([emoji, users]) => {
        const hasReacted = currentUserId ? users.includes(currentUserId) : false;
        
        return (
          <button
            key={emoji}
            onClick={() => onReactionClick(emoji)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all',
              hasReacted
                ? 'bg-primary/20 border border-primary/50'
                : 'bg-surface-3 border border-transparent hover:border-border'
            )}
          >
            <span>{emoji}</span>
            <span className={cn(
              'text-xs',
              hasReacted ? 'text-primary' : 'text-text-secondary'
            )}>
              {users.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}
