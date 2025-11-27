import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Connection Status Indicator
 */
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectionManager } from '../../services/p2p';
import { cn } from '../../lib/utils';
export function ConnectionStatus() {
    const [status, setStatus] = useState(connectionManager.getStatus());
    const [showTooltip, setShowTooltip] = useState(false);
    const [onlineCount, setOnlineCount] = useState(0);
    useEffect(() => {
        const handleStatusChange = (newStatus) => {
            setStatus(newStatus);
        };
        const handleRegistered = ({ onlineCount }) => {
            setOnlineCount(onlineCount);
        };
        connectionManager.on('status-change', handleStatusChange);
        connectionManager.on('registered', handleRegistered);
        return () => {
            connectionManager.off('status-change', handleStatusChange);
            connectionManager.off('registered', handleRegistered);
        };
    }, []);
    const statusConfig = {
        connected: {
            icon: Wifi,
            color: 'text-success',
            bgColor: 'bg-success/10',
            label: 'Connected',
        },
        connecting: {
            icon: Loader2,
            color: 'text-warning',
            bgColor: 'bg-warning/10',
            label: 'Connecting...',
        },
        reconnecting: {
            icon: Loader2,
            color: 'text-warning',
            bgColor: 'bg-warning/10',
            label: 'Reconnecting...',
        },
        disconnected: {
            icon: WifiOff,
            color: 'text-danger',
            bgColor: 'bg-danger/10',
            label: 'Disconnected',
        },
    };
    const config = statusConfig[status];
    const Icon = config.icon;
    const isAnimating = status === 'connecting' || status === 'reconnecting';
    return (_jsxs("div", { className: "relative", onMouseEnter: () => setShowTooltip(true), onMouseLeave: () => setShowTooltip(false), children: [_jsx("button", { className: cn('p-2 rounded-lg transition-colors', config.bgColor, config.color), onClick: () => {
                    if (status === 'disconnected') {
                        connectionManager.connect().catch(console.error);
                    }
                }, title: config.label, children: _jsx(Icon, { size: 18, className: isAnimating ? 'animate-spin' : '' }) }), _jsx(AnimatePresence, { children: showTooltip && (_jsxs(motion.div, { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 5 }, className: "absolute top-full right-0 mt-2 px-3 py-2 bg-surface-2 border border-border rounded-lg shadow-lg z-50 whitespace-nowrap", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: cn('w-2 h-2 rounded-full', status === 'connected' ? 'bg-success' :
                                        status === 'disconnected' ? 'bg-danger' : 'bg-warning') }), _jsx("span", { className: "text-sm text-text-primary", children: config.label })] }), status === 'connected' && onlineCount > 0 && (_jsxs("p", { className: "text-xs text-text-muted mt-1", children: [onlineCount, " users online"] })), status === 'disconnected' && (_jsx("p", { className: "text-xs text-text-muted mt-1", children: "Click to reconnect" }))] })) })] }));
}
