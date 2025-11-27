import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Add Contact Modal
 * Allows users to add contacts by their peer ID
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Copy, Check, QrCode, Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { contactService } from '../../services/contacts';
import { connectionManager } from '../../services/p2p';
import { identityService } from '../../services/identity';
import toast from 'react-hot-toast';
export function AddContactModal({ isOpen, onClose, onContactAdded }) {
    const [mode, setMode] = useState('add');
    const [peerId, setPeerId] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOnline, setIsOnline] = useState(null);
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
            }
            else {
                toast('User is offline', { icon: '📴' });
            }
        }
        catch (error) {
            toast.error('Failed to check status');
        }
        finally {
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
        }
        catch (error) {
            toast.error(error.message || 'Failed to add contact');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleCopyMyId = async () => {
        try {
            await navigator.clipboard.writeText(myPeerId);
            setCopied(true);
            toast.success('Peer ID copied!');
            setTimeout(() => setCopied(false), 2000);
        }
        catch (error) {
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
    if (!isOpen)
        return null;
    return (_jsx(AnimatePresence, { children: _jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: handleClose, className: "absolute inset-0 bg-black/50 backdrop-blur-sm" }), _jsxs(motion.div, { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 }, className: "relative w-full max-w-md bg-surface-1 rounded-2xl border border-border shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border", children: [_jsx("h2", { className: "text-lg font-semibold text-text-primary", children: "Add Contact" }), _jsx("button", { onClick: handleClose, className: "p-2 rounded-lg hover:bg-surface-3 text-text-secondary hover:text-text-primary transition-colors", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "flex border-b border-border", children: [_jsxs("button", { onClick: () => setMode('add'), className: cn('flex-1 px-4 py-3 text-sm font-medium transition-colors', mode === 'add'
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-text-secondary hover:text-text-primary'), children: [_jsx(UserPlus, { size: 16, className: "inline mr-2" }), "Add Contact"] }), _jsxs("button", { onClick: () => setMode('share'), className: cn('flex-1 px-4 py-3 text-sm font-medium transition-colors', mode === 'share'
                                        ? 'text-primary border-b-2 border-primary'
                                        : 'text-text-secondary hover:text-text-primary'), children: [_jsx(QrCode, { size: 16, className: "inline mr-2" }), "My Info"] })] }), _jsx("div", { className: "p-4", children: mode === 'add' ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Peer ID" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: peerId, onChange: (e) => {
                                                            setPeerId(e.target.value);
                                                            setIsOnline(null);
                                                        }, placeholder: "Enter contact's Peer ID", className: "flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm" }), _jsx("button", { onClick: handleCheckOnline, disabled: isLoading || !peerId.trim(), className: "px-3 py-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors", title: "Check if online", children: isLoading ? _jsx(Loader2, { size: 18, className: "animate-spin" }) : _jsx(Search, { size: 18 }) })] }), isOnline !== null && (_jsx("p", { className: cn('mt-1 text-xs', isOnline ? 'text-success' : 'text-text-muted'), children: isOnline ? '● User is online' : '○ User is offline' }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Display Name (optional)" }), _jsx("input", { type: "text", value: displayName, onChange: (e) => setDisplayName(e.target.value), placeholder: "Enter a name for this contact", className: "w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50" })] }), _jsx("button", { onClick: handleAddContact, disabled: isLoading || !peerId.trim(), className: "w-full py-3 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 18, className: "animate-spin" }), "Adding..."] })) : (_jsxs(_Fragment, { children: [_jsx(UserPlus, { size: 18 }), "Add Contact"] })) })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Your Peer ID" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary font-mono text-xs break-all", children: myPeerId }), _jsx("button", { onClick: handleCopyMyId, className: "p-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary transition-colors", title: "Copy Peer ID", children: copied ? _jsx(Check, { size: 18, className: "text-success" }) : _jsx(Copy, { size: 18 }) })] }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Share this ID with others so they can add you as a contact" })] }), myFingerprint && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Safety Number" }), _jsx("div", { className: "p-3 rounded-lg bg-surface-2 border border-border text-center font-mono text-sm text-text-primary tracking-wider", children: myFingerprint }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Compare this with your contact to verify identity" })] })), _jsx("div", { className: "pt-4 border-t border-border", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: cn('w-2 h-2 rounded-full', connectionManager.getStatus() === 'connected' ? 'bg-success' : 'bg-danger') }), _jsx("span", { className: "text-sm text-text-secondary", children: connectionManager.getStatus() === 'connected'
                                                        ? 'Connected to signaling server'
                                                        : 'Disconnected from signaling server' })] }) })] })) })] })] }) }));
}
