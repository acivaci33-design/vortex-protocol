import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Message Bubble Component
 * Individual message display with reactions, status, and context menu
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, Reply, Copy, MoreHorizontal, Smile, Download, Play, File, } from 'lucide-react';
import { cn, formatChatTime, copyToClipboard, getInitials, stringToColor } from '../../lib/utils';
export function MessageBubble({ message, isOwn, showAvatar = true, onReply, onForward, onDelete, }) {
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const handleCopy = async () => {
        await copyToClipboard(message.content);
    };
    const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: cn('group flex gap-2 px-4 py-1', isOwn ? 'flex-row-reverse' : 'flex-row'), onMouseEnter: () => setShowActions(true), onMouseLeave: () => {
            setShowActions(false);
            setShowReactions(false);
        }, children: [!isOwn && showAvatar ? (_jsx("div", { className: "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 mt-auto", style: { backgroundColor: stringToColor(message.senderId) }, children: getInitials(message.senderId) })) : !isOwn ? (_jsx("div", { className: "w-8 shrink-0" })) : null, _jsxs("div", { className: cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start'), children: [message.replyTo && (_jsx("div", { className: cn('text-xs px-3 py-1.5 rounded-t-lg border-l-2 mb-0.5 max-w-full truncate', isOwn
                            ? 'bg-primary/20 border-primary/50 text-primary-foreground/70'
                            : 'bg-surface-3 border-text-muted text-text-secondary'), children: _jsx("span", { className: "opacity-70", children: "Replying to message" }) })), _jsx("div", { className: cn('relative px-3 py-2 rounded-2xl max-w-full break-words', isOwn
                            ? 'bg-primary text-white rounded-br-md'
                            : 'bg-surface-2 text-text-primary rounded-bl-md', message.isDeleted && 'italic opacity-60'), children: message.isDeleted ? (_jsx("span", { className: "text-sm", children: "This message was deleted" })) : (_jsxs(_Fragment, { children: [message.type === 'text' && (_jsx("p", { className: "text-sm whitespace-pre-wrap", children: message.content })), message.type === 'image' && message.attachments?.[0] && (_jsx("div", { className: "relative", children: _jsx("img", { src: message.attachments[0].url, alt: message.attachments[0].name, className: "max-w-[300px] rounded-lg" }) })), message.type === 'file' && message.attachments?.[0] && (_jsxs("div", { className: "flex items-center gap-3 min-w-[200px]", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center", children: _jsx(File, { size: 20 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium truncate", children: message.attachments[0].name }), _jsx("p", { className: "text-xs opacity-70", children: formatFileSize(message.attachments[0].size) })] }), _jsx("button", { className: "p-2 hover:bg-white/10 rounded-lg transition-colors", children: _jsx(Download, { size: 16 }) })] })), message.type === 'voice' && (_jsxs("div", { className: "flex items-center gap-3 min-w-[200px]", children: [_jsx("button", { className: "w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors", children: _jsx(Play, { size: 14, fill: "currentColor" }) }), _jsx("div", { className: "flex-1", children: _jsx("div", { className: "h-1 bg-white/30 rounded-full", children: _jsx("div", { className: "h-1 bg-white rounded-full w-0" }) }) }), _jsx("span", { className: "text-xs opacity-70", children: "0:00" })] })), _jsxs("div", { className: cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start'), children: [_jsx("span", { className: cn('text-[10px]', isOwn ? 'text-white/60' : 'text-text-muted'), children: formatChatTime(message.createdAt) }), message.isEdited && (_jsx("span", { className: cn('text-[10px]', isOwn ? 'text-white/60' : 'text-text-muted'), children: "(edited)" })), isOwn && _jsx(MessageStatusIcon, { status: message.status })] })] })) }), message.reactions.length > 0 && (_jsx("div", { className: cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start'), children: groupReactions(message.reactions).map(({ emoji, count }) => (_jsxs("span", { className: "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface-3 text-xs", children: [emoji, count > 1 && _jsx("span", { className: "text-text-muted", children: count })] }, emoji))) }))] }), showActions && !message.isDeleted && (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, className: cn('flex items-center gap-0.5 bg-surface-2 rounded-lg border border-border shadow-float p-0.5 self-center', isOwn ? 'mr-2' : 'ml-2'), children: [_jsx(ActionButton, { icon: Smile, onClick: () => setShowReactions(!showReactions), title: "React" }), _jsx(ActionButton, { icon: Reply, onClick: onReply, title: "Reply" }), _jsx(ActionButton, { icon: Copy, onClick: handleCopy, title: "Copy" }), _jsx(ActionButton, { icon: MoreHorizontal, onClick: () => { }, title: "More" })] })), showReactions && (_jsx(motion.div, { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, className: cn('absolute bg-surface-2 rounded-full border border-border shadow-float p-1 flex gap-0.5', isOwn ? 'right-20' : 'left-20'), children: quickReactions.map((emoji) => (_jsx("button", { className: "w-8 h-8 rounded-full hover:bg-surface-3 flex items-center justify-center text-lg transition-colors", onClick: () => {
                        // Add reaction
                        setShowReactions(false);
                    }, children: emoji }, emoji))) }))] }));
}
function ActionButton({ icon: Icon, onClick, title, }) {
    return (_jsx("button", { onClick: onClick, title: title, className: "w-7 h-7 rounded-md flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors", children: _jsx(Icon, { size: 14 }) }));
}
function MessageStatusIcon({ status }) {
    switch (status) {
        case 'pending':
            return _jsx(Clock, { size: 12, className: "text-white/40" });
        case 'sent':
            return _jsx(Check, { size: 12, className: "text-white/60" });
        case 'delivered':
            return _jsx(CheckCheck, { size: 12, className: "text-white/60" });
        case 'read':
            return _jsx(CheckCheck, { size: 12, className: "text-blue-300" });
        case 'failed':
            return _jsx("span", { className: "text-[10px] text-danger", children: "!" });
        default:
            return null;
    }
}
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function groupReactions(reactions) {
    const groups = {};
    reactions.forEach((r) => {
        groups[r.emoji] = (groups[r.emoji] || 0) + 1;
    });
    return Object.entries(groups).map(([emoji, count]) => ({ emoji, count }));
}
