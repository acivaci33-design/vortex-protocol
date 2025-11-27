/**
 * VORTEX Protocol - Main Application Layout
 * Three-panel layout with sidebar, chat area, and detail panel
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Users, 
  Phone, 
  Settings, 
  Shield, 
  Search,
  Plus,
  Bell,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Lock,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Sidebar } from './Sidebar';
import { ChatPanel } from '../chat/ChatPanel';
import { DetailPanel } from './DetailPanel';
import { CallOverlay } from '../call/CallOverlay';
import { SettingsPanel } from '../settings/SettingsPanel';
import { ConnectionStatus } from './ConnectionStatus';
import { useSettingsStore } from '../../stores';
import { useServiceSync } from '../../hooks/useServiceSync';

type View = 'chats' | 'contacts' | 'calls' | 'settings';

export function MainLayout() {
  const [activeView, setActiveView] = useState<View>('chats');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const { appearance, setTheme } = useSettingsStore();

  // Sync services with store (handles incoming messages, typing, etc.)
  useServiceSync();

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+1-4 for view switching
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === '1') setActiveView('chats');
        if (e.key === '2') setActiveView('contacts');
        if (e.key === '3') setActiveView('calls');
        if (e.key === '4') setActiveView('settings');
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
    { id: 'chats' as const, icon: MessageSquare, label: 'Chats', badge: 3 },
    { id: 'contacts' as const, icon: Users, label: 'Contacts' },
    { id: 'calls' as const, icon: Phone, label: 'Calls' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-surface-0 text-text-primary overflow-hidden">
      {/* Navigation Rail */}
      <nav className="flex flex-col items-center w-16 bg-surface-1 border-r border-border py-4 shrink-0">
        {/* Logo */}
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              badge={item.badge}
              onClick={() => setActiveView(item.id)}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2 mt-auto">
          {/* Connection Status */}
          <ConnectionStatus />

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(appearance.theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
            title="Toggle theme"
          >
            {appearance.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Security Indicator */}
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-success" title="End-to-End Encrypted">
            <Shield size={18} />
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="shrink-0 overflow-hidden"
          >
            <Sidebar 
              view={activeView} 
              onCollapse={() => setSidebarCollapsed(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Toggle (when collapsed) */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute left-16 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-surface-2 border border-border rounded-r-lg flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface-0">
        {activeView === 'chats' && (
          <ChatPanel onToggleDetail={() => setDetailPanelOpen(prev => !prev)} />
        )}
        {activeView === 'contacts' && <ContactsView />}
        {activeView === 'calls' && <CallsView />}
        {activeView === 'settings' && <SettingsView />}
      </main>

      {/* Detail Panel */}
      <AnimatePresence>
        {detailPanelOpen && activeView === 'chats' && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="shrink-0 overflow-hidden border-l border-border"
          >
            <DetailPanel onClose={() => setDetailPanelOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Call Overlay */}
      <CallOverlay />
    </div>
  );
}

interface NavButtonProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}

function NavButton({ icon: Icon, label, active, badge, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
        active 
          ? 'bg-primary text-white shadow-glow-sm' 
          : 'text-text-tertiary hover:text-text-primary hover:bg-surface-3'
      )}
      title={label}
    >
      <Icon size={18} />
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-[10px] font-semibold flex items-center justify-center text-white px-1">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// Placeholder views
function ContactsView() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Users className="w-16 h-16 mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-semibold mb-2">Contacts</h2>
        <p className="text-text-secondary">Manage your secure contacts</p>
      </div>
    </div>
  );
}

function CallsView() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Phone className="w-16 h-16 mx-auto text-text-muted mb-4" />
        <h2 className="text-xl font-semibold mb-2">Calls</h2>
        <p className="text-text-secondary">Your call history</p>
      </div>
    </div>
  );
}

function SettingsView() {
  return <SettingsPanel />;
}
