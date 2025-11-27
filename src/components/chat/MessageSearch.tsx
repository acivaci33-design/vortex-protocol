/**
 * VORTEX Protocol - Message Search Component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { cn, formatChatTime } from '../../lib/utils';
import { db, type Message } from '../../services/database';

interface MessageSearchProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

interface SearchResult {
  message: Message;
  matchIndex: number;
  totalMatches: number;
}

export function MessageSearch({ 
  conversationId, 
  isOpen, 
  onClose, 
  onNavigateToMessage 
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setResults([]);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    setIsSearching(true);

    // Get all messages for the conversation
    const messages = db.getMessages(conversationId, 1000);
    const normalizedQuery = searchQuery.toLowerCase();

    const matchingMessages = messages.filter(msg =>
      msg.content.toLowerCase().includes(normalizedQuery) &&
      msg.type === 'text' &&
      !msg.isDeleted
    );

    const searchResults: SearchResult[] = matchingMessages.map((message, index) => ({
      message,
      matchIndex: index + 1,
      totalMatches: matchingMessages.length,
    }));

    setResults(searchResults);
    setCurrentIndex(searchResults.length > 0 ? 0 : -1);
    setIsSearching(false);

    // Navigate to first result
    if (searchResults.length > 0) {
      onNavigateToMessage(searchResults[0].message.id);
    }
  }, [conversationId, onNavigateToMessage]);

  // Handle query change with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  const navigateToResult = (direction: 'prev' | 'next') => {
    if (results.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
    }

    setCurrentIndex(newIndex);
    onNavigateToMessage(results[newIndex].message.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        navigateToResult('prev');
      } else {
        navigateToResult('next');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-0 left-0 right-0 z-50 bg-surface-1 border-b border-border shadow-lg"
      >
        <div className="flex items-center gap-2 p-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search in conversation..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Results counter */}
          {query && (
            <div className="text-sm text-text-secondary whitespace-nowrap">
              {isSearching ? (
                'Searching...'
              ) : results.length === 0 ? (
                'No results'
              ) : (
                `${currentIndex + 1} of ${results.length}`
              )}
            </div>
          )}

          {/* Navigation buttons */}
          {results.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateToResult('prev')}
                className="p-2 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors"
                title="Previous result (Shift+Enter)"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={() => navigateToResult('next')}
                className="p-2 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors"
                title="Next result (Enter)"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results preview (optional) */}
        {results.length > 0 && currentIndex >= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 pb-3"
          >
            <div className="p-3 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-start gap-2">
                <MessageSquare size={16} className="text-text-muted mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary line-clamp-2">
                    {highlightMatch(results[currentIndex].message.content, query)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {formatChatTime(results[currentIndex].message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-primary/30 text-text-primary rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
