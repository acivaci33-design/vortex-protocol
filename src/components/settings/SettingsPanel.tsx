/**
 * VORTEX Protocol - Settings Panel
 * Full settings UI with all configuration options
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Bell,
  BellOff,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Globe,
  Wifi,
  HardDrive,
  Keyboard,
  Info,
  LogOut,
  Trash2,
  Download,
  Upload,
  ChevronRight,
  Check,
  User,
  Camera,
  Copy,
  Fingerprint,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsStore, useAuthStore, type Theme } from '../../stores';
import { identityService } from '../../services/identity';
import { db } from '../../services/database';
import { securityService } from '../../services/security';
import { notificationService } from '../../services/notifications';
import toast from 'react-hot-toast';

type SettingsTab = 'profile' | 'appearance' | 'privacy' | 'notifications' | 'storage' | 'about';

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'appearance' as const, icon: Palette, label: 'Appearance' },
    { id: 'privacy' as const, icon: Lock, label: 'Privacy & Security' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'storage' as const, icon: HardDrive, label: 'Storage' },
    { id: 'about' as const, icon: Info, label: 'About' },
  ];

  return (
    <div className="flex-1 flex h-full">
      {/* Settings Sidebar */}
      <div className="w-56 border-r border-border bg-surface-1 p-2">
        <h2 className="px-3 py-2 text-lg font-semibold text-text-primary">Settings</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'privacy' && <PrivacySettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'storage' && <StorageSettings />}
        {activeTab === 'about' && <AboutSettings />}
      </div>
    </div>
  );
}

function ProfileSettings() {
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState('Available');
  const [publicKey, setPublicKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load identity data on mount
  useEffect(() => {
    const identity = identityService.getIdentity();
    if (identity) {
      setDisplayName(identity.displayName);
      setPublicKey(identity.publicKey);
      setFingerprint(identityService.getFingerprint());
    }
    
    // Load status and avatar from settings
    const savedStatus = db.getSetting('user_status');
    if (savedStatus) {
      setStatus(savedStatus);
    }
    
    const savedAvatar = db.getSetting('user_avatar');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarUrl(base64);
      db.setSetting('user_avatar', base64);
      toast.success('Profile picture updated');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Update identity display name
      identityService.updateDisplayName(displayName.trim());
      
      // Save status to database
      db.setSetting('user_status', status);
      
      toast.success('Profile saved successfully');
    } catch (error) {
      console.error('[Profile] Save error:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      toast.success('Public key copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <SettingsSection title="Profile" description="Manage your profile information">
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative cursor-pointer" onClick={handleAvatarClick}>
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-semibold">
                {displayName?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-3 border-2 border-surface-1 flex items-center justify-center hover:bg-surface-4 transition-colors">
              <Camera size={14} />
            </button>
          </div>
          <div>
            <p className="font-medium text-text-primary">{displayName || 'Anonymous'}</p>
            <p className="text-sm text-text-secondary">Click to change avatar</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Display Name */}
        <SettingsInput
          label="Display Name"
          value={displayName}
          onChange={setDisplayName}
          placeholder="Enter your name"
        />

        {/* Status */}
        <SettingsInput
          label="Status"
          value={status}
          onChange={setStatus}
          placeholder="What's on your mind?"
        />

        {/* Public Key */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Public Key
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={publicKey}
              readOnly
              className="flex-1 px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-secondary text-sm font-mono truncate"
            />
            <button
              onClick={handleCopyKey}
              className="p-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary transition-colors"
              title="Copy public key"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* Fingerprint */}
        {fingerprint && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              <Fingerprint size={16} />
              Safety Number
            </label>
            <div className="p-3 rounded-lg bg-surface-3 border border-border font-mono text-sm text-center text-text-primary tracking-wider">
              {fingerprint}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Share this with contacts to verify your identity
            </p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </SettingsSection>
  );
}

function AppearanceSettings() {
  const { appearance, updateAppearance, setTheme } = useSettingsStore();

  const themes: { id: Theme; icon: React.ElementType; label: string }[] = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'dark', icon: Moon, label: 'Dark' },
    { id: 'system', icon: Monitor, label: 'System' },
  ];

  const accentColors = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ec4899', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  ];

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme);
    db.setSetting('appearance_theme', theme);
  };

  const handleAppearanceChange = (updates: Partial<typeof appearance>) => {
    updateAppearance(updates);
    Object.entries(updates).forEach(([key, value]) => {
      db.setSetting(`appearance_${key}`, String(value));
    });
  };

  return (
    <SettingsSection title="Appearance" description="Customize how VORTEX looks">
      <div className="space-y-6">
        {/* Theme Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">Theme</label>
          <div className="flex gap-3">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  appearance.theme === theme.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <theme.icon size={24} className={appearance.theme === theme.id ? 'text-primary' : 'text-text-secondary'} />
                <span className={cn('text-sm', appearance.theme === theme.id ? 'text-primary font-medium' : 'text-text-secondary')}>
                  {theme.label}
                </span>
                {appearance.theme === theme.id && (
                  <Check size={16} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">Accent Color</label>
          <div className="flex flex-wrap gap-2">
            {accentColors.map((color) => (
              <button
                key={color}
                onClick={() => handleAppearanceChange({ accentColor: color })}
                className={cn(
                  'w-10 h-10 rounded-full transition-transform hover:scale-110',
                  appearance.accentColor === color && 'ring-2 ring-offset-2 ring-offset-surface-0'
                )}
                style={{ backgroundColor: color }}
              >
                {appearance.accentColor === color && (
                  <Check size={16} className="text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">Font Size</label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => handleAppearanceChange({ fontSize: size })}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg capitalize transition-colors',
                  appearance.fontSize === size
                    ? 'bg-primary text-white'
                    : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Options */}
        <SettingsToggle
          label="Show Avatars"
          description="Display profile pictures in chats"
          checked={appearance.showAvatars}
          onChange={(v) => handleAppearanceChange({ showAvatars: v })}
        />

        <SettingsToggle
          label="Enable Animations"
          description="Show smooth transitions and effects"
          checked={appearance.animationsEnabled}
          onChange={(v) => handleAppearanceChange({ animationsEnabled: v })}
        />

        <SettingsToggle
          label="Show Timestamps"
          description="Display message timestamps"
          checked={appearance.showTimestamps}
          onChange={(v) => handleAppearanceChange({ showTimestamps: v })}
        />

        <SettingsToggle
          label="24-Hour Format"
          description="Use 24-hour time format"
          checked={appearance.use24HourFormat}
          onChange={(v) => handleAppearanceChange({ use24HourFormat: v })}
        />
      </div>
    </SettingsSection>
  );
}

function PrivacySettings() {
  const { privacy, updatePrivacy } = useSettingsStore();
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Sync with security service
  useEffect(() => {
    const settings = securityService.getSettings();
    updatePrivacy({
      autoLockEnabled: settings.lockEnabled,
      autoLockTimeout: settings.lockTimeout,
    });
  }, []);

  const handleAutoLockChange = (enabled: boolean) => {
    updatePrivacy({ autoLockEnabled: enabled });
    securityService.updateSettings({ lockEnabled: enabled });
    db.setSetting('privacy_auto_lock', enabled ? 'true' : 'false');
    
    if (enabled && !securityService.isLockEnabled()) {
      setShowPinSetup(true);
    }
  };

  const handleTimeoutChange = (timeout: number) => {
    updatePrivacy({ autoLockTimeout: timeout });
    securityService.updateSettings({ lockTimeout: timeout });
    db.setSetting('privacy_lock_timeout', timeout.toString());
  };

  const handleSetPin = async () => {
    if (pin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      await securityService.setupPin(pin);
      setShowPinSetup(false);
      setPin('');
      setConfirmPin('');
      setPinError('');
      toast.success('PIN set successfully');
    } catch (error) {
      setPinError('Failed to set PIN');
    }
  };

  const handlePrivacyToggle = (key: string, value: boolean) => {
    updatePrivacy({ [key]: value });
    db.setSetting(`privacy_${key}`, value ? 'true' : 'false');
  };

  return (
    <SettingsSection title="Privacy & Security" description="Control your privacy settings">
      <div className="space-y-6">
        {/* Encryption Status */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
          <Shield className="w-8 h-8 text-success" />
          <div>
            <p className="font-medium text-text-primary">End-to-End Encryption</p>
            <p className="text-sm text-text-secondary">All messages are encrypted with Signal Protocol</p>
          </div>
        </div>

        <SettingsToggle
          label="Show Online Status"
          description="Let others see when you're online"
          checked={privacy.showOnlineStatus}
          onChange={(v) => handlePrivacyToggle('showOnlineStatus', v)}
        />

        <SettingsToggle
          label="Show Last Seen"
          description="Let others see when you were last active"
          checked={privacy.showLastSeen}
          onChange={(v) => handlePrivacyToggle('showLastSeen', v)}
        />

        <SettingsToggle
          label="Read Receipts"
          description="Let others know when you've read their messages"
          checked={privacy.showReadReceipts}
          onChange={(v) => handlePrivacyToggle('showReadReceipts', v)}
        />

        <SettingsToggle
          label="Typing Indicators"
          description="Let others see when you're typing"
          checked={privacy.showTypingIndicators}
          onChange={(v) => handlePrivacyToggle('showTypingIndicators', v)}
        />

        <SettingsToggle
          label="Auto-Lock"
          description="Lock app after period of inactivity"
          checked={privacy.autoLockEnabled}
          onChange={handleAutoLockChange}
        />

        {privacy.autoLockEnabled && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Lock after (minutes)
            </label>
            <select
              value={privacy.autoLockTimeout}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary"
            >
              <option value={1}>1 minute</option>
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        )}

        {/* PIN Setup Modal */}
        {showPinSetup && (
          <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-4">
            <h4 className="font-medium text-text-primary">Set up PIN</h4>
            <input
              type="password"
              placeholder="Enter PIN (min 4 digits)"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
              className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary"
            />
            <input
              type="password"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
              className="w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary"
            />
            {pinError && <p className="text-sm text-danger">{pinError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPinSetup(false);
                  setPin('');
                  setConfirmPin('');
                  updatePrivacy({ autoLockEnabled: false });
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-3 text-text-primary hover:bg-surface-4"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPin}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover"
              >
                Set PIN
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

function NotificationSettings() {
  const { notifications, updateNotifications } = useSettingsStore();
  const [permissionStatus, setPermissionStatus] = useState<string>('');

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async (enabled: boolean) => {
    updateNotifications({ enabled });
    notificationService.setNotificationsEnabled(enabled);
    db.setSetting('notifications_enabled', enabled ? 'true' : 'false');

    if (enabled && permissionStatus !== 'granted') {
      const granted = await notificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      if (!granted) {
        toast.error('Notification permission denied');
      }
    }
  };

  const handleSoundChange = (enabled: boolean) => {
    updateNotifications({ sound: enabled });
    notificationService.setSoundsEnabled(enabled);
    db.setSetting('notifications_sound', enabled ? 'true' : 'false');
  };

  const handleNotificationToggle = (key: string, value: boolean) => {
    updateNotifications({ [key]: value });
    db.setSetting(`notifications_${key}`, value ? 'true' : 'false');
  };

  const testNotification = () => {
    notificationService.show({
      title: 'Test Notification',
      body: 'This is a test notification from VORTEX',
    });
    if (notifications.sound) {
      notificationService.playSound('notification');
    }
  };

  return (
    <SettingsSection title="Notifications" description="Manage notification preferences">
      <div className="space-y-6">
        {/* Permission Status */}
        {permissionStatus === 'denied' && (
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning">
              Notifications are blocked. Please enable them in your browser/system settings.
            </p>
          </div>
        )}

        <SettingsToggle
          label="Enable Notifications"
          description="Receive notifications for new messages"
          checked={notifications.enabled}
          onChange={handleEnableNotifications}
        />

        {notifications.enabled && (
          <>
            <SettingsToggle
              label="Sound"
              description="Play sound for new messages"
              checked={notifications.sound}
              onChange={handleSoundChange}
            />

            <SettingsToggle
              label="Show Preview"
              description="Show message content in notifications"
              checked={notifications.showPreview}
              onChange={(v) => handleNotificationToggle('showPreview', v)}
            />

            <SettingsToggle
              label="Desktop Notifications"
              description="Show system notifications"
              checked={notifications.desktopNotifications}
              onChange={(v) => handleNotificationToggle('desktopNotifications', v)}
            />

            {/* Test Button */}
            <button
              onClick={testNotification}
              className="px-4 py-2 rounded-lg bg-surface-2 text-text-primary hover:bg-surface-3 transition-colors"
            >
              Test Notification
            </button>
          </>
        )}
      </div>
    </SettingsSection>
  );
}

function StorageSettings() {
  const { storage, updateStorage } = useSettingsStore();
  const [storageSize, setStorageSize] = useState({ used: 0, total: 1024 * 1024 * 1024 }); // 1GB limit
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'messages' | 'all' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    calculateStorageUsage();
  }, []);

  const calculateStorageUsage = () => {
    try {
      let totalSize = 0;
      
      // Calculate localStorage size
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
        }
      }
      
      setStorageSize(prev => ({ ...prev, used: totalSize }));
    } catch (error) {
      console.error('[Storage] Failed to calculate size:', error);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStorageToggle = (key: string, value: boolean) => {
    updateStorage({ [key]: value });
    db.setSetting(`storage_${key}`, value ? 'true' : 'false');
  };

  const handleClearMessages = async () => {
    setIsDeleting(true);
    try {
      // Clear messages from database
      const conversations = db.getAllConversations();
      conversations.forEach(conv => {
        db.deleteConversation(conv.id);
      });
      
      toast.success('All messages cleared');
      setShowDeleteConfirm(null);
      calculateStorageUsage();
    } catch (error) {
      toast.error('Failed to clear messages');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await securityService.secureWipe();
      // App will reload after wipe
    } catch (error) {
      toast.error('Failed to delete data');
      setIsDeleting(false);
    }
  };

  const handleExportData = () => {
    const data = db.exportDatabase();
    if (data) {
      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vortex-backup-${new Date().toISOString().split('T')[0]}.db`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    }
  };

  const usagePercent = Math.min(100, (storageSize.used / storageSize.total) * 100);

  return (
    <SettingsSection title="Storage" description="Manage local data and storage">
      <div className="space-y-6">
        {/* Storage Usage */}
        <div className="p-4 rounded-xl bg-surface-2 border border-border">
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Storage Used</span>
            <span className="text-text-primary font-medium">
              {formatBytes(storageSize.used)} / {formatBytes(storageSize.total)}
            </span>
          </div>
          <div className="w-full h-2 bg-surface-3 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent > 80 ? 'bg-danger' : usagePercent > 50 ? 'bg-warning' : 'bg-primary'
              )} 
              style={{ width: `${usagePercent}%` }} 
            />
          </div>
        </div>

        <SettingsToggle
          label="Encrypt Local Storage"
          description="Encrypt all local data (already encrypted)"
          checked={storage.encryptLocalStorage}
          onChange={(v) => handleStorageToggle('encryptLocalStorage', v)}
        />

        <SettingsToggle
          label="Clear on Exit"
          description="Delete all data when closing the app"
          checked={storage.clearCacheOnExit}
          onChange={(v) => handleStorageToggle('clearCacheOnExit', v)}
        />

        {/* Backup */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-text-primary mb-3">Backup</h4>
          <button
            onClick={handleExportData}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 text-text-primary hover:bg-surface-3 transition-colors"
          >
            <span>Export Backup</span>
            <Download size={18} />
          </button>
        </div>

        {/* Danger Zone */}
        <div className="pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-danger mb-3">Danger Zone</h4>
          <div className="space-y-2">
            <button 
              onClick={() => setShowDeleteConfirm('messages')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
            >
              <span>Clear All Messages</span>
              <Trash2 size={18} />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm('all')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
            >
              <span>Delete All Data</span>
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface-1 rounded-xl border border-border p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-text-primary mb-2">
                {showDeleteConfirm === 'messages' ? 'Clear All Messages?' : 'Delete All Data?'}
              </h3>
              <p className="text-text-secondary mb-6">
                {showDeleteConfirm === 'messages' 
                  ? 'This will permanently delete all your messages. This action cannot be undone.'
                  : 'This will permanently delete ALL data including your identity. You will need to create a new account. This action cannot be undone.'
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-surface-3 text-text-primary hover:bg-surface-4 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={showDeleteConfirm === 'messages' ? handleClearMessages : handleDeleteAllData}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}

function AboutSettings() {
  return (
    <SettingsSection title="About" description="Information about VORTEX Protocol">
      <div className="space-y-6">
        {/* App Info */}
        <div className="text-center py-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">VORTEX Protocol</h3>
          <p className="text-text-secondary">Version 1.0.0</p>
        </div>

        <div className="space-y-3">
          <AboutItem label="Build" value="Production" />
          <AboutItem label="Electron" value="31.x" />
          <AboutItem label="React" value="18.x" />
          <AboutItem label="Encryption" value="Signal Protocol" />
        </div>

        {/* Links */}
        <div className="pt-4 border-t border-border space-y-2">
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors">
            <span className="text-text-primary">Privacy Policy</span>
            <ChevronRight size={18} className="text-text-muted" />
          </button>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors">
            <span className="text-text-primary">Terms of Service</span>
            <ChevronRight size={18} className="text-text-muted" />
          </button>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors">
            <span className="text-text-primary">Open Source Licenses</span>
            <ChevronRight size={18} className="text-text-muted" />
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}

// Helper Components
function SettingsSection({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-text-primary mb-1">{title}</h2>
      <p className="text-text-secondary mb-6">{description}</p>
      {children}
    </div>
  );
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-text-primary font-medium">{label}</p>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-4'
        )}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 24 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function SettingsInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
      />
    </div>
  );
}

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
