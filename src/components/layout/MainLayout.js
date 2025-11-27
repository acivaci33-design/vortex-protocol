import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Main Application Layout
 * Three-panel layout with sidebar, chat area, and detail panel
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, Phone, Settings, Shield, Moon, Sun, ChevronRight, Zap, } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { DetailPanel } from './DetailPanel';
import { CallOverlay } from '../call/CallOverlay';
import { SettingsPanel } from '../settings/SettingsPanel';
import { ConnectionStatus } from './ConnectionStatus';
import { useSettingsStore } from '../../stores';
import { useServiceSync } from '../../hooks/useServiceSync';
export function MainLayout() {
    const [activeView, setActiveView] = useState('chats');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [detailPanelOpen, setDetailPanelOpen] = useState(false);
    const { appearance, setTheme } = useSettingsStore();
    // Sync services with store (handles incoming messages, typing, etc.)
    useServiceSync();
    // Listen for keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+1-4 for view switching
            if (e.ctrlKey && !e.shiftKey && !e.altKey) {
                if (e.key === '1')
                    setActiveView('chats');
                if (e.key === '2')
                    setActiveView('contacts');
                if (e.key === '3')
                    setActiveView('calls');
                if (e.key === '4')
                    setActiveView('settings');
            }
            // Ctrl+B to toggle sidebar
            if (e.ctrlKey && e.key === 'b') {
                setSidebarCollapsed(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    const navItems = [
        { id: 'chats', icon: MessageSquare, label: 'Chats', badge: 3 },
        { id: 'contacts', icon: Users, label: 'Contacts' },
        { id: 'calls', icon: Phone, label: 'Calls' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];
    return (_jsxs("div", { className: "flex h-screen bg-surface-0 text-text-primary overflow-hidden", children: [_jsxs("nav", { className: "flex flex-col items-center w-16 bg-surface-1 border-r border-border py-4 shrink-0", children: [_jsx("div", { className: "mb-6", children: _jsx("div", { className: "w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow", children: _jsx(Zap, { className: "w-5 h-5 text-white" }) }) }), _jsx("div", { className: "flex-1 flex flex-col gap-2", children: navItems.map((item) => (_jsx(NavButton, { icon: item.icon, label: item.label, active: activeView === item.id, badge: item.badge, onClick: () => setActiveView(item.id) }, item.id))) }), _jsxs("div", { className: "flex flex-col gap-2 mt-auto", children: [_jsx(ConnectionStatus, {}), _jsx("button", { onClick: () => setTheme(appearance.theme === 'dark' ? 'light' : 'dark'), className: "w-10 h-10 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors", title: "Toggle theme", children: appearance.theme === 'dark' ? _jsx(Sun, { size: 18 }) : _jsx(Moon, { size: 18 }) }), _jsx("div", { className: "w-10 h-10 rounded-lg flex items-center justify-center text-success", title: "End-to-End Encrypted", children: _jsx(Shield, { size: 18 }) })] })] }), _jsx(AnimatePresence, { mode: "wait", children: !sidebarCollapsed && (_jsx(motion.div, { initial: { width: 0, opacity: 0 }, animate: { width: 320, opacity: 1 }, exit: { width: 0, opacity: 0 }, transition: { duration: 0.2, ease: 'easeInOut' }, className: "shrink-0 overflow-hidden", children: _jsx(Sidebar, { view: activeView, onCollapse: () => setSidebarCollapsed(true) }) })) }), sidebarCollapsed && (_jsx("button", { onClick: () => setSidebarCollapsed(false), className: "absolute left-16 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-surface-2 border border-border rounded-r-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors", children: _jsx(ChevronRight, { size: 14 }) })), _jsxs("main", { className: "flex-1 flex flex-col min-w-0 bg-surface-0", children: [activeView === 'chats' && (_jsx(ChatPanel, { onToggleDetail: () => setDetailPanelOpen(prev => !prev) })), activeView === 'contacts' && _jsx(ContactsView, {}), activeView === 'calls' && _jsx(CallsView, {}), activeView === 'settings' && _jsx(SettingsView, {})] }), _jsx(AnimatePresence, { children: detailPanelOpen && activeView === 'chats' && (_jsx(motion.div, { initial: { width: 0, opacity: 0 }, animate: { width: 320, opacity: 1 }, exit: { width: 0, opacity: 0 }, transition: { duration: 0.2, ease: 'easeInOut' }, className: "shrink-0 overflow-hidden border-l border-border", children: _jsx(DetailPanel, { onClose: () => setDetailPanelOpen(false) }) })) }), _jsx(CallOverlay, {})] }));
}
function NavButton({ icon: Icon, label, active, badge, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: cn('relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200', active
            ? 'bg-primary text-white shadow-glow-sm'
            : 'text-text-tertiary hover:text-text-primary hover:bg-surface-3'), title: label, children: [_jsx(Icon, { size: 18 }), badge && badge > 0 && (_jsx("span", { className: "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-[10px] font-semibold flex items-center justify-center text-white px-1", children: badge > 99 ? '99+' : badge }))] }));
}
// Placeholder views
function ContactsView() {
    return (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Users, { className: "w-16 h-16 mx-auto text-text-muted mb-4" }), _jsx("h2", { className: "text-xl font-semibold mb-2", children: "Contacts" }), _jsx("p", { className: "text-text-secondary", children: "Manage your secure contacts" })] }) }));
}
function CallsView() {
    return (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Phone, { className: "w-16 h-16 mx-auto text-text-muted mb-4" }), _jsx("h2", { className: "text-xl font-semibold mb-2", children: "Calls" }), _jsx("p", { className: "text-text-secondary", children: "Your call history" })] }) }));
}
function SettingsView() {
    return _jsx(SettingsPanel, {});
}
