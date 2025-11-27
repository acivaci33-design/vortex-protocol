/**
 * VORTEX Protocol - New Chat Dialog
 * Create new conversations or join existing rooms
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageSquarePlus,
  Users,
  QrCode,
  Copy,
  Check,
  Search,
  UserPlus,
  Hash,
} from 'lucide-react';
import { cn, copyToClipboard } from '../../lib/utils';
import { useChatStore } from '../../stores';

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatDialog({ isOpen, onClose }: NewChatDialogProps) {
  const [tab, setTab] = useState<'join' | 'create' | 'contact'>('join');
  const [roomId, setRoomId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [contactId, setContactId] = useState('');
  const [copied, setCopied] = useState(false);
  const { createConversation } = useChatStore();

  const generatedRoomId = React.useMemo(() => {
    return `vortex-${Math.random().toString(36).substring(2, 8)}-${Math.random().toString(36).substring(2, 8)}`;
  }, []);

  const handleJoinRoom = () => {
    if (!roomId.trim()) return;
    
    createConversation({
      type: 'group',
      name: `Room: ${roomId.trim()}`,
      participants: [{ id: 'self', displayName: 'You', role: 'admin', publicKey: '', joinedAt: Date.now() }],
    });
    onClose();
  };

  const handleCreateRoom = () => {
    const roomName = groupName || `Room ${generatedRoomId}`;
    createConversation({
      type: 'group',
      name: roomName,
      participants: [{ id: 'self', displayName: 'You', role: 'admin', publicKey: '', joinedAt: Date.now() }],
    });
    onClose();
  };

  const handleCopyRoomId = async () => {
    await copyToClipboard(generatedRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddContact = () => {
    if (!contactId.trim()) return;
    
    createConversation({
      type: 'direct',
      participants: [{ id: contactId.trim(), displayName: contactId.trim(), role: 'member', publicKey: '', joinedAt: Date.now() }],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-surface-1 rounded-2xl shadow-glass border border-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">New Conversation</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <TabButton
              active={tab === 'join'}
              onClick={() => setTab('join')}
              icon={Hash}
              label="Join Room"
            />
            <TabButton
              active={tab === 'create'}
              onClick={() => setTab('create')}
              icon={MessageSquarePlus}
              label="Create Room"
            />
            <TabButton
              active={tab === 'contact'}
              onClick={() => setTab('contact')}
              icon={UserPlus}
              label="Add Contact"
            />
          </div>

          {/* Content */}
          <div className="p-4">
            {tab === 'join' && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Enter a room ID to join an existing conversation.
                </p>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID..."
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim()}
                  className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  Join Room
                </button>
              </div>
            )}

            {tab === 'create' && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Create a new room and share the ID with others.
                </p>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Room Name (optional)
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="My Secure Chat"
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Generated Room ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedRoomId}
                      readOnly
                      className="flex-1 px-4 py-2.5 rounded-lg bg-surface-3 border border-border text-text-secondary font-mono text-sm"
                    />
                    <button
                      onClick={handleCopyRoomId}
                      className="px-3 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border transition-colors"
                    >
                      {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
                >
                  Create Room
                </button>
              </div>
            )}

            {tab === 'contact' && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Start a direct conversation with someone.
                </p>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Contact ID or Public Key
                  </label>
                  <input
                    type="text"
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    placeholder="Enter contact ID..."
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
                <button
                  onClick={handleAddContact}
                  disabled={!contactId.trim()}
                  className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                >
                  Start Conversation
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2',
        active
          ? 'text-primary border-primary'
          : 'text-text-secondary border-transparent hover:text-text-primary'
      )}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
