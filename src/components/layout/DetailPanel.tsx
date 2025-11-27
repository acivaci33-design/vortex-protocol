/**
 * VORTEX Protocol - Detail Panel Component
 * Shows conversation/contact details, media, and settings
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Bell,
  BellOff,
  Image,
  File,
  Link,
  Users,
  Shield,
  Lock,
  Key,
  Trash2,
  Flag,
  Archive,
  Pin,
  Search,
  ChevronRight,
  Copy,
  QrCode,
  UserPlus,
  Settings,
} from 'lucide-react';
import { cn, getInitials, stringToColor, copyToClipboard } from '../../lib/utils';
import { useChatStore } from '../../stores';

interface DetailPanelProps {
  onClose: () => void;
}

type Tab = 'overview' | 'media' | 'files' | 'links';

export function DetailPanel({ onClose }: DetailPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { activeConversation } = useChatStore();
  
  const conversation = activeConversation();
  
  if (!conversation) return null;

  const displayName = conversation.name || conversation.participants[0]?.displayName || 'Unknown';
  const avatarColor = stringToColor(displayName);

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-text-primary">Details</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X size={18} />
        </button>
      </header>

      {/* Profile Section */}
      <div className="flex flex-col items-center py-6 border-b border-border">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold mb-3"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(displayName)}
        </div>
        <h3 className="text-lg font-semibold text-text-primary">{displayName}</h3>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary mt-1">
          <span className="w-2 h-2 rounded-full bg-online" />
          <span>Online</span>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-3 mt-4">
          <QuickAction icon={Bell} label="Mute" />
          <QuickAction icon={Search} label="Search" />
          <QuickAction icon={Pin} label="Pin" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['overview', 'media', 'files', 'links'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab conversation={conversation} />}
        {activeTab === 'media' && <MediaTab />}
        {activeTab === 'files' && <FilesTab />}
        {activeTab === 'links' && <LinksTab />}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-surface-3 transition-colors">
      <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center">
        <Icon size={18} className="text-text-secondary" />
      </div>
      <span className="text-xs text-text-secondary">{label}</span>
    </button>
  );
}

function OverviewTab({ conversation }: { conversation: any }) {
  return (
    <div className="py-2">
      {/* Encryption Info */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
          <Shield className="w-5 h-5 text-success shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-primary">End-to-End Encrypted</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Messages are secured with Double Ratchet protocol
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-2">
        <OptionItem icon={Key} label="Verify safety number" />
        <OptionItem icon={Bell} label="Notifications" value="On" />
        <OptionItem icon={Lock} label="Disappearing messages" value="Off" />
        <OptionItem icon={Archive} label="Archive chat" />
        
        <div className="my-2 border-t border-border" />
        
        <OptionItem icon={Flag} label="Report" danger />
        <OptionItem icon={Trash2} label="Delete chat" danger />
      </div>

      {/* Participants (for groups) */}
      {conversation.type === 'group' && (
        <div className="mt-4 px-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-text-primary">
              Participants ({conversation.participants.length})
            </h4>
            <button className="p-1 hover:bg-surface-3 rounded transition-colors">
              <UserPlus size={16} className="text-text-secondary" />
            </button>
          </div>
          {/* Participant list would go here */}
        </div>
      )}
    </div>
  );
}

function OptionItem({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  danger?: boolean;
}) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
        danger
          ? 'hover:bg-danger/10 text-danger'
          : 'hover:bg-surface-3 text-text-primary'
      )}
    >
      <Icon size={18} className={danger ? 'text-danger' : 'text-text-secondary'} />
      <span className="flex-1 text-sm text-left">{label}</span>
      {value && <span className="text-sm text-text-muted">{value}</span>}
      <ChevronRight size={16} className="text-text-muted" />
    </button>
  );
}

function MediaTab() {
  return (
    <div className="p-4">
      <div className="text-center text-text-secondary text-sm py-8">
        <Image className="w-12 h-12 mx-auto text-text-muted mb-2" />
        <p>No media shared yet</p>
      </div>
    </div>
  );
}

function FilesTab() {
  return (
    <div className="p-4">
      <div className="text-center text-text-secondary text-sm py-8">
        <File className="w-12 h-12 mx-auto text-text-muted mb-2" />
        <p>No files shared yet</p>
      </div>
    </div>
  );
}

function LinksTab() {
  return (
    <div className="p-4">
      <div className="text-center text-text-secondary text-sm py-8">
        <Link className="w-12 h-12 mx-auto text-text-muted mb-2" />
        <p>No links shared yet</p>
      </div>
    </div>
  );
}
