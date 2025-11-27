/**
 * VORTEX Protocol - Emoji Picker Component
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, Smile, Heart, ThumbsUp, PartyPopper, Coffee, Flag } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const categories = [
  { id: 'recent', icon: Clock, label: 'Recent' },
  { id: 'smileys', icon: Smile, label: 'Smileys' },
  { id: 'people', icon: Heart, label: 'People' },
  { id: 'gestures', icon: ThumbsUp, label: 'Gestures' },
  { id: 'activities', icon: PartyPopper, label: 'Activities' },
  { id: 'food', icon: Coffee, label: 'Food' },
  { id: 'symbols', icon: Flag, label: 'Symbols' },
];

const emojiData: Record<string, string[]> = {
  recent: ['😀', '❤️', '👍', '😂', '🙏', '😊', '🎉', '💯'],
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥'],
  people: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏', '👏', '🤝'],
  activities: ['🎉', '🎊', '🎈', '🎁', '🎄', '🎃', '🎗️', '🎟️', '🎫', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱'],
  food: ['☕', '🍵', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥨', '🥯', '🍞', '🥖', '🥐', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩'],
  symbols: ['💯', '🔥', '⭐', '✨', '💫', '🌟', '⚡', '💥', '💢', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '🎵', '🎶', '🔔', '🔕', '📢', '📣'],
};

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');

  const emojis = searchQuery
    ? Object.values(emojiData).flat().filter(() => true) // Would filter by name if we had emoji names
    : emojiData[activeCategory] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-full right-0 mb-2 w-[320px] bg-surface-2 rounded-xl border border-border shadow-glass overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search emoji..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-3 border-none text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              'flex-1 p-2 flex items-center justify-center transition-colors',
              activeCategory === cat.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-3'
            )}
            title={cat.label}
          >
            <cat.icon size={18} />
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-2 h-[200px] overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {emojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => onSelect(emoji)}
              className="w-9 h-9 flex items-center justify-center text-xl hover:bg-surface-3 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
