import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Detail Panel Component
 * Shows conversation/contact details, media, and settings
 */
import { useState } from 'react';
import { X, Bell, Image, File, Link, Shield, Lock, Key, Trash2, Flag, Archive, Pin, Search, ChevronRight, UserPlus, } from 'lucide-react';
import { cn, getInitials, stringToColor } from '../../lib/utils';
import { useChatStore } from '../../stores';
export function DetailPanel({ onClose }) {
    const [activeTab, setActiveTab] = useState('overview');
    const { activeConversation } = useChatStore();
    const conversation = activeConversation();
    if (!conversation)
        return null;
    const displayName = conversation.name || conversation.participants[0]?.displayName || 'Unknown';
    const avatarColor = stringToColor(displayName);
    return (_jsxs("div", { className: "h-full flex flex-col bg-surface-1", children: [_jsxs("header", { className: "flex items-center justify-between px-4 py-3 border-b border-border", children: [_jsx("h2", { className: "font-semibold text-text-primary", children: "Details" }), _jsx("button", { onClick: onClose, className: "p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "flex flex-col items-center py-6 border-b border-border", children: [_jsx("div", { className: "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold mb-3", style: { backgroundColor: avatarColor }, children: getInitials(displayName) }), _jsx("h3", { className: "text-lg font-semibold text-text-primary", children: displayName }), _jsxs("div", { className: "flex items-center gap-1.5 text-sm text-text-secondary mt-1", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-online" }), _jsx("span", { children: "Online" })] }), _jsxs("div", { className: "flex gap-3 mt-4", children: [_jsx(QuickAction, { icon: Bell, label: "Mute" }), _jsx(QuickAction, { icon: Search, label: "Search" }), _jsx(QuickAction, { icon: Pin, label: "Pin" })] })] }), _jsx("div", { className: "flex border-b border-border", children: ['overview', 'media', 'files', 'links'].map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab), className: cn('flex-1 py-2.5 text-sm font-medium capitalize transition-colors', activeTab === tab
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-text-secondary hover:text-text-primary'), children: tab }, tab))) }), _jsxs("div", { className: "flex-1 overflow-y-auto", children: [activeTab === 'overview' && _jsx(OverviewTab, { conversation: conversation }), activeTab === 'media' && _jsx(MediaTab, {}), activeTab === 'files' && _jsx(FilesTab, {}), activeTab === 'links' && _jsx(LinksTab, {})] })] }));
}
function QuickAction({ icon: Icon, label }) {
    return (_jsxs("button", { className: "flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-3 transition-colors", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center", children: _jsx(Icon, { size: 18, className: "text-text-secondary" }) }), _jsx("span", { className: "text-xs text-text-secondary", children: label })] }));
}
function OverviewTab({ conversation }) {
    return (_jsxs("div", { className: "py-2", children: [_jsx("div", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20", children: [_jsx(Shield, { className: "w-5 h-5 text-success shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-text-primary", children: "End-to-End Encrypted" }), _jsx("p", { className: "text-xs text-text-secondary mt-0.5", children: "Messages are secured with Double Ratchet protocol" })] })] }) }), _jsxs("div", { className: "px-2", children: [_jsx(OptionItem, { icon: Key, label: "Verify safety number" }), _jsx(OptionItem, { icon: Bell, label: "Notifications", value: "On" }), _jsx(OptionItem, { icon: Lock, label: "Disappearing messages", value: "Off" }), _jsx(OptionItem, { icon: Archive, label: "Archive chat" }), _jsx("div", { className: "my-2 border-t border-border" }), _jsx(OptionItem, { icon: Flag, label: "Report", danger: true }), _jsx(OptionItem, { icon: Trash2, label: "Delete chat", danger: true })] }), conversation.type === 'group' && (_jsx("div", { className: "mt-4 px-4", children: _jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("h4", { className: "text-sm font-medium text-text-primary", children: ["Participants (", conversation.participants.length, ")"] }), _jsx("button", { className: "p-1 hover:bg-surface-3 rounded transition-colors", children: _jsx(UserPlus, { size: 16, className: "text-text-secondary" }) })] }) }))] }));
}
function OptionItem({ icon: Icon, label, value, danger, }) {
    return (_jsxs("button", { className: cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors', danger
            ? 'hover:bg-danger/10 text-danger'
            : 'hover:bg-surface-3 text-text-primary'), children: [_jsx(Icon, { size: 18, className: danger ? 'text-danger' : 'text-text-secondary' }), _jsx("span", { className: "flex-1 text-sm text-left", children: label }), value && _jsx("span", { className: "text-sm text-text-muted", children: value }), _jsx(ChevronRight, { size: 16, className: "text-text-muted" })] }));
}
function MediaTab() {
    return (_jsx("div", { className: "p-4", children: _jsxs("div", { className: "text-center text-text-secondary text-sm py-8", children: [_jsx(Image, { className: "w-12 h-12 mx-auto text-text-muted mb-2" }), _jsx("p", { children: "No media shared yet" })] }) }));
}
function FilesTab() {
    return (_jsx("div", { className: "p-4", children: _jsxs("div", { className: "text-center text-text-secondary text-sm py-8", children: [_jsx(File, { className: "w-12 h-12 mx-auto text-text-muted mb-2" }), _jsx("p", { children: "No files shared yet" })] }) }));
}
function LinksTab() {
    return (_jsx("div", { className: "p-4", children: _jsxs("div", { className: "text-center text-text-secondary text-sm py-8", children: [_jsx(Link, { className: "w-12 h-12 mx-auto text-text-muted mb-2" }), _jsx("p", { children: "No links shared yet" })] }) }));
}
