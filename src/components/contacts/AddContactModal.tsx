/**
 * VORTEX Protocol - Add Contact Modal
 * Allows users to add contacts by their peer ID
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Copy, Check, QrCode, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { contactService } from '../../services/contacts';
import { connectionManager } from '../../services/p2p';
import { identityService } from '../../services/identity';
import toast from 'react-hot-toast';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdded?: (contactId: string) => void;
}

export function AddContactModal({ isOpen, onClose, onContactAdded }: AddContactModalProps) {
  const [mode, setMode] = useState<'add' | 'share'>('add');
  const [peerId, setPeerId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  const myIdentity = identityService.getIdentity();
  const myPeerId = myIdentity?.id || '';
  const myFingerprint = identityService.getFingerprint();

  const handleCheckOnline = async () => {
    if (!peerId.trim()) {
      toast.error('Please enter a Peer ID');
      return;
    }

    setIsLoading(true);
    try {
      const online = await connectionManager.checkPeerOnline(peerId.trim());
      setIsOnline(online);
      if (online) {
        toast.success('User is online!');
      } else {
        toast('User is offline', { icon: '📴' });
      }
    } catch (error) {
      toast.error('Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!peerId.trim()) {
      toast.error('Please enter a Peer ID');
      return;
    }

    if (peerId.trim() === myPeerId) {
      toast.error('You cannot add yourself as a contact');
      return;
    }

    setIsLoading(true);
    try {
      const contact = await contactService.addContact({
        identityKey: peerId.trim(),
        displayName: displayName.trim() || 'Unknown',
      });

      toast.success(`${contact.displayName} added to contacts`);
      
      // Try to connect to the peer
      if (connectionManager.getStatus() === 'connected') {
        connectionManager.connectToPeer(peerId.trim()).catch(console.error);
      }

      onContactAdded?.(contact.id);
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMyId = async () => {
    try {
      await navigator.clipboard.writeText(myPeerId);
      setCopied(true);
      toast.success('Peer ID copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleClose = () => {
    setPeerId('');
    setDisplayName('');
    setIsOnline(null);
    setMode('add');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface-1 rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">Add Contact</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setMode('add')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                mode === 'add'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <UserPlus size={16} className="inline mr-2" />
              Add Contact
            </button>
            <button
              onClick={() => setMode('share')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                mode === 'share'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <QrCode size={16} className="inline mr-2" />
              My Info
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {mode === 'add' ? (
              <div className="space-y-4">
                {/* Peer ID Input */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Peer ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={peerId}
                      onChange={(e) => {
                        setPeerId(e.target.value);
                        setIsOnline(null);
                      }}
                      placeholder="Enter contact's Peer ID"
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                    />
                    <button
                      onClick={handleCheckOnline}
                      disabled={isLoading || !peerId.trim()}
                      className="px-3 py-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
                      title="Check if online"
                    >
                      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                  </div>
                  {isOnline !== null && (
                    <p className={cn(
                      'mt-1 text-xs',
                      isOnline ? 'text-success' : 'text-text-muted'
                    )}>
                      {isOnline ? '● User is online' : '○ User is offline'}
                    </p>
                  )}
                </div>

                {/* Display Name Input */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter a name for this contact"
                    className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Add Button */}
                <button
                  onClick={handleAddContact}
                  disabled={isLoading || !peerId.trim()}
                  className="w-full py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Add Contact
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* My Peer ID */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Your Peer ID
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary font-mono text-xs break-all">
                      {myPeerId}
                    </div>
                    <button
                      onClick={handleCopyMyId}
                      className="p-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary transition-colors"
                      title="Copy Peer ID"
                    >
                      {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Share this ID with others so they can add you as a contact
                  </p>
                </div>

                {/* Safety Number */}
                {myFingerprint && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Safety Number
                    </label>
                    <div className="p-3 rounded-lg bg-surface-2 border border-border text-center font-mono text-sm text-text-primary tracking-wider">
                      {myFingerprint}
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      Compare this with your contact to verify identity
                    </p>
                  </div>
                )}

                {/* Connection Status */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      connectionManager.getStatus() === 'connected' ? 'bg-success' : 'bg-danger'
                    )} />
                    <span className="text-sm text-text-secondary">
                      {connectionManager.getStatus() === 'connected' 
                        ? 'Connected to signaling server' 
                        : 'Disconnected from signaling server'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
