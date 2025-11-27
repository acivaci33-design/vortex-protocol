import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * VORTEX Protocol - Settings Panel
 * Full settings UI with all configuration options
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Palette, Bell, Lock, Shield, HardDrive, Info, Trash2, Download, ChevronRight, Check, User, Camera, Copy, Fingerprint, } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSettingsStore } from '../../stores';
import { identityService } from '../../services/identity';
import { db } from '../../services/database';
import { securityService } from '../../services/security';
import { notificationService } from '../../services/notifications';
import toast from 'react-hot-toast';
export function SettingsPanel() {
    const [activeTab, setActiveTab] = useState('appearance');
    const tabs = [
        { id: 'profile', icon: User, label: 'Profile' },
        { id: 'appearance', icon: Palette, label: 'Appearance' },
        { id: 'privacy', icon: Lock, label: 'Privacy & Security' },
        { id: 'notifications', icon: Bell, label: 'Notifications' },
        { id: 'storage', icon: HardDrive, label: 'Storage' },
        { id: 'about', icon: Info, label: 'About' },
    ];
    return (_jsxs("div", { className: "flex-1 flex h-full", children: [_jsxs("div", { className: "w-56 border-r border-border bg-surface-1 p-2", children: [_jsx("h2", { className: "px-3 py-2 text-lg font-semibold text-text-primary", children: "Settings" }), _jsx("nav", { className: "space-y-1", children: tabs.map((tab) => (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors', activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'), children: [_jsx(tab.icon, { size: 18 }), _jsx("span", { children: tab.label })] }, tab.id))) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [activeTab === 'profile' && _jsx(ProfileSettings, {}), activeTab === 'appearance' && _jsx(AppearanceSettings, {}), activeTab === 'privacy' && _jsx(PrivacySettings, {}), activeTab === 'notifications' && _jsx(NotificationSettings, {}), activeTab === 'storage' && _jsx(StorageSettings, {}), activeTab === 'about' && _jsx(AboutSettings, {})] })] }));
}
function ProfileSettings() {
    const [displayName, setDisplayName] = useState('');
    const [status, setStatus] = useState('Available');
    const [publicKey, setPublicKey] = useState('');
    const [fingerprint, setFingerprint] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = React.useRef(null);
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
    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
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
            const base64 = event.target?.result;
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
        }
        catch (error) {
            console.error('[Profile] Save error:', error);
            toast.error('Failed to save profile');
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleCopyKey = async () => {
        try {
            await navigator.clipboard.writeText(publicKey);
            setCopied(true);
            toast.success('Public key copied');
            setTimeout(() => setCopied(false), 2000);
        }
        catch (error) {
            toast.error('Failed to copy');
        }
    };
    return (_jsx(SettingsSection, { title: "Profile", description: "Manage your profile information", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "relative cursor-pointer", onClick: handleAvatarClick, children: [avatarUrl ? (_jsx("img", { src: avatarUrl, alt: "Profile", className: "w-20 h-20 rounded-full object-cover border-2 border-border" })) : (_jsx("div", { className: "w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-semibold", children: displayName?.[0]?.toUpperCase() || 'U' })), _jsx("button", { className: "absolute bottom-0 right-0 w-8 h-8 rounded-full bg-surface-3 border-2 border-surface-1 flex items-center justify-center hover:bg-surface-4 transition-colors", children: _jsx(Camera, { size: 14 }) })] }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: displayName || 'Anonymous' }), _jsx("p", { className: "text-sm text-text-secondary", children: "Click to change avatar" })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleAvatarChange, className: "hidden" })] }), _jsx(SettingsInput, { label: "Display Name", value: displayName, onChange: setDisplayName, placeholder: "Enter your name" }), _jsx(SettingsInput, { label: "Status", value: status, onChange: setStatus, placeholder: "What's on your mind?" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Public Key" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "text", value: publicKey, readOnly: true, className: "flex-1 px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-secondary text-sm font-mono truncate" }), _jsx("button", { onClick: handleCopyKey, className: "p-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-text-primary transition-colors", title: "Copy public key", children: copied ? _jsx(Check, { size: 18 }) : _jsx(Copy, { size: 18 }) })] })] }), fingerprint && (_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-text-primary mb-2 flex items-center gap-2", children: [_jsx(Fingerprint, { size: 16 }), "Safety Number"] }), _jsx("div", { className: "p-3 rounded-lg bg-surface-3 border border-border font-mono text-sm text-center text-text-primary tracking-wider", children: fingerprint }), _jsx("p", { className: "mt-1 text-xs text-text-muted", children: "Share this with contacts to verify your identity" })] })), _jsx("button", { onClick: handleSave, disabled: isSaving, className: "px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed", children: isSaving ? 'Saving...' : 'Save Changes' })] }) }));
}
function AppearanceSettings() {
    const { appearance, updateAppearance, setTheme } = useSettingsStore();
    const themes = [
        { id: 'light', icon: Sun, label: 'Light' },
        { id: 'dark', icon: Moon, label: 'Dark' },
        { id: 'system', icon: Monitor, label: 'System' },
    ];
    const accentColors = [
        '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
        '#ec4899', '#ef4444', '#f97316', '#eab308',
        '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
    ];
    const handleThemeChange = (theme) => {
        setTheme(theme);
        db.setSetting('appearance_theme', theme);
    };
    const handleAppearanceChange = (updates) => {
        updateAppearance(updates);
        Object.entries(updates).forEach(([key, value]) => {
            db.setSetting(`appearance_${key}`, String(value));
        });
    };
    return (_jsx(SettingsSection, { title: "Appearance", description: "Customize how VORTEX looks", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-3", children: "Theme" }), _jsx("div", { className: "flex gap-3", children: themes.map((theme) => (_jsxs("button", { onClick: () => handleThemeChange(theme.id), className: cn('flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all', appearance.theme === theme.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'), children: [_jsx(theme.icon, { size: 24, className: appearance.theme === theme.id ? 'text-primary' : 'text-text-secondary' }), _jsx("span", { className: cn('text-sm', appearance.theme === theme.id ? 'text-primary font-medium' : 'text-text-secondary'), children: theme.label }), appearance.theme === theme.id && (_jsx(Check, { size: 16, className: "text-primary" }))] }, theme.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-3", children: "Accent Color" }), _jsx("div", { className: "flex flex-wrap gap-2", children: accentColors.map((color) => (_jsx("button", { onClick: () => handleAppearanceChange({ accentColor: color }), className: cn('w-10 h-10 rounded-full transition-transform hover:scale-110', appearance.accentColor === color && 'ring-2 ring-offset-2 ring-offset-surface-0'), style: { backgroundColor: color }, children: appearance.accentColor === color && (_jsx(Check, { size: 16, className: "text-white mx-auto" })) }, color))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-3", children: "Font Size" }), _jsx("div", { className: "flex gap-2", children: ['small', 'medium', 'large'].map((size) => (_jsx("button", { onClick: () => handleAppearanceChange({ fontSize: size }), className: cn('flex-1 px-4 py-2 rounded-lg capitalize transition-colors', appearance.fontSize === size
                                    ? 'bg-primary text-white'
                                    : 'bg-surface-2 text-text-secondary hover:bg-surface-3'), children: size }, size))) })] }), _jsx(SettingsToggle, { label: "Show Avatars", description: "Display profile pictures in chats", checked: appearance.showAvatars, onChange: (v) => handleAppearanceChange({ showAvatars: v }) }), _jsx(SettingsToggle, { label: "Enable Animations", description: "Show smooth transitions and effects", checked: appearance.animationsEnabled, onChange: (v) => handleAppearanceChange({ animationsEnabled: v }) }), _jsx(SettingsToggle, { label: "Show Timestamps", description: "Display message timestamps", checked: appearance.showTimestamps, onChange: (v) => handleAppearanceChange({ showTimestamps: v }) }), _jsx(SettingsToggle, { label: "24-Hour Format", description: "Use 24-hour time format", checked: appearance.use24HourFormat, onChange: (v) => handleAppearanceChange({ use24HourFormat: v }) })] }) }));
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
    const handleAutoLockChange = (enabled) => {
        updatePrivacy({ autoLockEnabled: enabled });
        securityService.updateSettings({ lockEnabled: enabled });
        db.setSetting('privacy_auto_lock', enabled ? 'true' : 'false');
        if (enabled && !securityService.isLockEnabled()) {
            setShowPinSetup(true);
        }
    };
    const handleTimeoutChange = (timeout) => {
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
        }
        catch (error) {
            setPinError('Failed to set PIN');
        }
    };
    const handlePrivacyToggle = (key, value) => {
        updatePrivacy({ [key]: value });
        db.setSetting(`privacy_${key}`, value ? 'true' : 'false');
    };
    return (_jsx(SettingsSection, { title: "Privacy & Security", description: "Control your privacy settings", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20", children: [_jsx(Shield, { className: "w-8 h-8 text-success" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-text-primary", children: "End-to-End Encryption" }), _jsx("p", { className: "text-sm text-text-secondary", children: "All messages are encrypted with Signal Protocol" })] })] }), _jsx(SettingsToggle, { label: "Show Online Status", description: "Let others see when you're online", checked: privacy.showOnlineStatus, onChange: (v) => handlePrivacyToggle('showOnlineStatus', v) }), _jsx(SettingsToggle, { label: "Show Last Seen", description: "Let others see when you were last active", checked: privacy.showLastSeen, onChange: (v) => handlePrivacyToggle('showLastSeen', v) }), _jsx(SettingsToggle, { label: "Read Receipts", description: "Let others know when you've read their messages", checked: privacy.showReadReceipts, onChange: (v) => handlePrivacyToggle('showReadReceipts', v) }), _jsx(SettingsToggle, { label: "Typing Indicators", description: "Let others see when you're typing", checked: privacy.showTypingIndicators, onChange: (v) => handlePrivacyToggle('showTypingIndicators', v) }), _jsx(SettingsToggle, { label: "Auto-Lock", description: "Lock app after period of inactivity", checked: privacy.autoLockEnabled, onChange: handleAutoLockChange }), privacy.autoLockEnabled && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: "Lock after (minutes)" }), _jsxs("select", { value: privacy.autoLockTimeout, onChange: (e) => handleTimeoutChange(Number(e.target.value)), className: "w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary", children: [_jsx("option", { value: 1, children: "1 minute" }), _jsx("option", { value: 5, children: "5 minutes" }), _jsx("option", { value: 15, children: "15 minutes" }), _jsx("option", { value: 30, children: "30 minutes" }), _jsx("option", { value: 60, children: "1 hour" })] })] })), showPinSetup && (_jsxs("div", { className: "p-4 rounded-xl bg-surface-2 border border-border space-y-4", children: [_jsx("h4", { className: "font-medium text-text-primary", children: "Set up PIN" }), _jsx("input", { type: "password", placeholder: "Enter PIN (min 4 digits)", value: pin, onChange: (e) => setPin(e.target.value.replace(/\D/g, '')), maxLength: 8, className: "w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary" }), _jsx("input", { type: "password", placeholder: "Confirm PIN", value: confirmPin, onChange: (e) => setConfirmPin(e.target.value.replace(/\D/g, '')), maxLength: 8, className: "w-full px-3 py-2 rounded-lg bg-surface-3 border border-border text-text-primary" }), pinError && _jsx("p", { className: "text-sm text-danger", children: pinError }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => {
                                        setShowPinSetup(false);
                                        setPin('');
                                        setConfirmPin('');
                                        updatePrivacy({ autoLockEnabled: false });
                                    }, className: "flex-1 px-4 py-2 rounded-lg bg-surface-3 text-text-primary hover:bg-surface-4", children: "Cancel" }), _jsx("button", { onClick: handleSetPin, className: "flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover", children: "Set PIN" })] })] }))] }) }));
}
function NotificationSettings() {
    const { notifications, updateNotifications } = useSettingsStore();
    const [permissionStatus, setPermissionStatus] = useState('');
    useEffect(() => {
        // Check notification permission
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);
    const handleEnableNotifications = async (enabled) => {
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
    const handleSoundChange = (enabled) => {
        updateNotifications({ sound: enabled });
        notificationService.setSoundsEnabled(enabled);
        db.setSetting('notifications_sound', enabled ? 'true' : 'false');
    };
    const handleNotificationToggle = (key, value) => {
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
    return (_jsx(SettingsSection, { title: "Notifications", description: "Manage notification preferences", children: _jsxs("div", { className: "space-y-6", children: [permissionStatus === 'denied' && (_jsx("div", { className: "p-4 rounded-xl bg-warning/10 border border-warning/20", children: _jsx("p", { className: "text-sm text-warning", children: "Notifications are blocked. Please enable them in your browser/system settings." }) })), _jsx(SettingsToggle, { label: "Enable Notifications", description: "Receive notifications for new messages", checked: notifications.enabled, onChange: handleEnableNotifications }), notifications.enabled && (_jsxs(_Fragment, { children: [_jsx(SettingsToggle, { label: "Sound", description: "Play sound for new messages", checked: notifications.sound, onChange: handleSoundChange }), _jsx(SettingsToggle, { label: "Show Preview", description: "Show message content in notifications", checked: notifications.showPreview, onChange: (v) => handleNotificationToggle('showPreview', v) }), _jsx(SettingsToggle, { label: "Desktop Notifications", description: "Show system notifications", checked: notifications.desktopNotifications, onChange: (v) => handleNotificationToggle('desktopNotifications', v) }), _jsx("button", { onClick: testNotification, className: "px-4 py-2 rounded-lg bg-surface-2 text-text-primary hover:bg-surface-3 transition-colors", children: "Test Notification" })] }))] }) }));
}
function StorageSettings() {
    const { storage, updateStorage } = useSettingsStore();
    const [storageSize, setStorageSize] = useState({ used: 0, total: 1024 * 1024 * 1024 }); // 1GB limit
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
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
        }
        catch (error) {
            console.error('[Storage] Failed to calculate size:', error);
        }
    };
    const formatBytes = (bytes) => {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const handleStorageToggle = (key, value) => {
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
        }
        catch (error) {
            toast.error('Failed to clear messages');
        }
        finally {
            setIsDeleting(false);
        }
    };
    const handleDeleteAllData = async () => {
        setIsDeleting(true);
        try {
            await securityService.secureWipe();
            // App will reload after wipe
        }
        catch (error) {
            toast.error('Failed to delete data');
            setIsDeleting(false);
        }
    };
    const handleExportData = () => {
        const data = db.exportDatabase();
        if (data) {
            const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
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
    return (_jsx(SettingsSection, { title: "Storage", description: "Manage local data and storage", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "p-4 rounded-xl bg-surface-2 border border-border", children: [_jsxs("div", { className: "flex justify-between mb-2", children: [_jsx("span", { className: "text-text-secondary", children: "Storage Used" }), _jsxs("span", { className: "text-text-primary font-medium", children: [formatBytes(storageSize.used), " / ", formatBytes(storageSize.total)] })] }), _jsx("div", { className: "w-full h-2 bg-surface-3 rounded-full overflow-hidden", children: _jsx("div", { className: cn("h-full rounded-full transition-all", usagePercent > 80 ? 'bg-danger' : usagePercent > 50 ? 'bg-warning' : 'bg-primary'), style: { width: `${usagePercent}%` } }) })] }), _jsx(SettingsToggle, { label: "Encrypt Local Storage", description: "Encrypt all local data (already encrypted)", checked: storage.encryptLocalStorage, onChange: (v) => handleStorageToggle('encryptLocalStorage', v) }), _jsx(SettingsToggle, { label: "Clear on Exit", description: "Delete all data when closing the app", checked: storage.clearCacheOnExit, onChange: (v) => handleStorageToggle('clearCacheOnExit', v) }), _jsxs("div", { className: "pt-4 border-t border-border", children: [_jsx("h4", { className: "text-sm font-medium text-text-primary mb-3", children: "Backup" }), _jsxs("button", { onClick: handleExportData, className: "w-full flex items-center justify-between px-4 py-3 rounded-lg bg-surface-2 text-text-primary hover:bg-surface-3 transition-colors", children: [_jsx("span", { children: "Export Backup" }), _jsx(Download, { size: 18 })] })] }), _jsxs("div", { className: "pt-4 border-t border-border", children: [_jsx("h4", { className: "text-sm font-medium text-danger mb-3", children: "Danger Zone" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("button", { onClick: () => setShowDeleteConfirm('messages'), className: "w-full flex items-center justify-between px-4 py-3 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors", children: [_jsx("span", { children: "Clear All Messages" }), _jsx(Trash2, { size: 18 })] }), _jsxs("button", { onClick: () => setShowDeleteConfirm('all'), className: "w-full flex items-center justify-between px-4 py-3 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors", children: [_jsx("span", { children: "Delete All Data" }), _jsx(Trash2, { size: 18 })] })] })] }), showDeleteConfirm && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-surface-1 rounded-xl border border-border p-6 max-w-md w-full mx-4", children: [_jsx("h3", { className: "text-lg font-bold text-text-primary mb-2", children: showDeleteConfirm === 'messages' ? 'Clear All Messages?' : 'Delete All Data?' }), _jsx("p", { className: "text-text-secondary mb-6", children: showDeleteConfirm === 'messages'
                                    ? 'This will permanently delete all your messages. This action cannot be undone.'
                                    : 'This will permanently delete ALL data including your identity. You will need to create a new account. This action cannot be undone.' }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setShowDeleteConfirm(null), disabled: isDeleting, className: "flex-1 px-4 py-2 rounded-lg bg-surface-3 text-text-primary hover:bg-surface-4 disabled:opacity-50", children: "Cancel" }), _jsx("button", { onClick: showDeleteConfirm === 'messages' ? handleClearMessages : handleDeleteAllData, disabled: isDeleting, className: "flex-1 px-4 py-2 rounded-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50", children: isDeleting ? 'Deleting...' : 'Delete' })] })] }) }))] }) }));
}
function AboutSettings() {
    return (_jsx(SettingsSection, { title: "About", description: "Information about VORTEX Protocol", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "text-center py-6", children: [_jsx("div", { className: "w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center", children: _jsx(Shield, { className: "w-10 h-10 text-white" }) }), _jsx("h3", { className: "text-xl font-bold text-text-primary", children: "VORTEX Protocol" }), _jsx("p", { className: "text-text-secondary", children: "Version 1.0.0" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx(AboutItem, { label: "Build", value: "Production" }), _jsx(AboutItem, { label: "Electron", value: "31.x" }), _jsx(AboutItem, { label: "React", value: "18.x" }), _jsx(AboutItem, { label: "Encryption", value: "Signal Protocol" })] }), _jsxs("div", { className: "pt-4 border-t border-border space-y-2", children: [_jsxs("button", { className: "w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors", children: [_jsx("span", { className: "text-text-primary", children: "Privacy Policy" }), _jsx(ChevronRight, { size: 18, className: "text-text-muted" })] }), _jsxs("button", { className: "w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors", children: [_jsx("span", { className: "text-text-primary", children: "Terms of Service" }), _jsx(ChevronRight, { size: 18, className: "text-text-muted" })] }), _jsxs("button", { className: "w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-2 transition-colors", children: [_jsx("span", { className: "text-text-primary", children: "Open Source Licenses" }), _jsx(ChevronRight, { size: 18, className: "text-text-muted" })] })] })] }) }));
}
// Helper Components
function SettingsSection({ title, description, children }) {
    return (_jsxs("div", { className: "max-w-2xl", children: [_jsx("h2", { className: "text-2xl font-bold text-text-primary mb-1", children: title }), _jsx("p", { className: "text-text-secondary mb-6", children: description }), children] }));
}
function SettingsToggle({ label, description, checked, onChange, }) {
    return (_jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-text-primary font-medium", children: label }), _jsx("p", { className: "text-sm text-text-secondary", children: description })] }), _jsx("button", { onClick: () => onChange(!checked), className: cn('relative w-11 h-6 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-surface-4'), children: _jsx(motion.div, { className: "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm", animate: { left: checked ? 24 : 4 }, transition: { type: 'spring', stiffness: 500, damping: 30 } }) })] }));
}
function SettingsInput({ label, value, onChange, placeholder, }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-text-primary mb-2", children: label }), _jsx("input", { type: "text", value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: "w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" })] }));
}
function AboutItem({ label, value }) {
    return (_jsxs("div", { className: "flex justify-between py-2 border-b border-border", children: [_jsx("span", { className: "text-text-secondary", children: label }), _jsx("span", { className: "text-text-primary", children: value })] }));
}
