/**
 * VORTEX Protocol - Settings Store
 * Application preferences, appearance, privacy, and notifications
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
const defaultAppearance = {
    theme: 'dark',
    accentColor: '#3b82f6',
    fontSize: 'medium',
    messageDensity: 'comfortable',
    showAvatars: true,
    animationsEnabled: true,
    reducedMotion: false,
    compactMode: false,
    showTimestamps: true,
    use24HourFormat: true,
    showReadReceipts: true,
    showTypingIndicators: true,
};
const defaultPrivacy = {
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    showTypingIndicators: true,
    allowProfilePhoto: 'everyone',
    allowStatusUpdates: 'everyone',
    blockScreenshots: false,
    incognitoKeyboard: false,
    clearOnExit: false,
    autoLockEnabled: true,
    autoLockTimeout: 5,
    biometricUnlock: false,
    hideMessagePreview: false,
};
const defaultNotifications = {
    enabled: true,
    sound: true,
    soundFile: 'default',
    vibration: true,
    showPreview: true,
    showSender: true,
    muteAll: false,
    inAppNotifications: true,
    desktopNotifications: true,
    notificationTone: 'default',
    callRingtone: 'default',
};
const defaultMedia = {
    autoDownloadImages: true,
    autoDownloadVideos: false,
    autoDownloadFiles: false,
    autoDownloadOnWifi: true,
    imageQuality: 'high',
    videoQuality: 'medium',
    saveToGallery: false,
    defaultCamera: 'front',
};
const defaultChat = {
    enterToSend: true,
    linkPreviewEnabled: true,
    archiveOnMute: false,
    swipeToArchive: true,
    doubleTapToReact: true,
    defaultReaction: '❤️',
    spellCheckEnabled: true,
    autoCorrectEnabled: false,
    emojiSuggestions: true,
};
const defaultNetwork = {
    signalingServerUrl: 'http://localhost:8443',
    stunServerUrl: 'stun:stun.l.google.com:19302',
    proxyEnabled: false,
    useRelay: false,
    lowBandwidthMode: false,
};
const defaultStorage = {
    maxCacheSize: 500,
    maxMediaCacheAge: 30,
    clearCacheOnExit: false,
    encryptLocalStorage: true,
    backupEnabled: false,
    backupFrequency: 'weekly',
};
const defaultShortcuts = {
    newMessage: 'Ctrl+N',
    search: 'Ctrl+F',
    settings: 'Ctrl+,',
    nextChat: 'Ctrl+Tab',
    prevChat: 'Ctrl+Shift+Tab',
    closeChat: 'Escape',
    muteChat: 'Ctrl+M',
    archiveChat: 'Ctrl+E',
    deleteChat: 'Ctrl+Backspace',
    startCall: 'Ctrl+Shift+A',
    startVideoCall: 'Ctrl+Shift+V',
    toggleMute: 'M',
    toggleVideo: 'V',
    endCall: 'Ctrl+D',
};
export const useSettingsStore = create()(persist((set, get) => ({
    appearance: defaultAppearance,
    privacy: defaultPrivacy,
    notifications: defaultNotifications,
    media: defaultMedia,
    chat: defaultChat,
    network: defaultNetwork,
    storage: defaultStorage,
    shortcuts: defaultShortcuts,
    version: 1,
    lastUpdated: Date.now(),
    updateAppearance: (updates) => {
        set((state) => ({
            appearance: { ...state.appearance, ...updates },
            lastUpdated: Date.now(),
        }));
        // Apply theme changes
        if (updates.theme) {
            applyTheme(updates.theme);
        }
    },
    updatePrivacy: (updates) => {
        set((state) => ({
            privacy: { ...state.privacy, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    updateNotifications: (updates) => {
        set((state) => ({
            notifications: { ...state.notifications, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    updateMedia: (updates) => {
        set((state) => ({
            media: { ...state.media, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    updateChat: (updates) => {
        set((state) => ({
            chat: { ...state.chat, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    updateNetwork: (updates) => {
        set((state) => ({
            network: { ...state.network, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    updateStorage: (updates) => {
        set((state) => ({
            storage: { ...state.storage, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    updateShortcuts: (updates) => {
        set((state) => ({
            shortcuts: { ...state.shortcuts, ...updates },
            lastUpdated: Date.now(),
        }));
    },
    setTheme: (theme) => {
        set((state) => ({
            appearance: { ...state.appearance, theme },
            lastUpdated: Date.now(),
        }));
        applyTheme(theme);
    },
    setLanguage: (_language) => {
        // Language switching would integrate with i18n library
        set({ lastUpdated: Date.now() });
    },
    exportSettings: () => {
        const state = get();
        return JSON.stringify({
            appearance: state.appearance,
            privacy: state.privacy,
            notifications: state.notifications,
            media: state.media,
            chat: state.chat,
            network: state.network,
            storage: state.storage,
            shortcuts: state.shortcuts,
            version: state.version,
            exportedAt: Date.now(),
        }, null, 2);
    },
    importSettings: (json) => {
        try {
            const imported = JSON.parse(json);
            set({
                appearance: { ...defaultAppearance, ...imported.appearance },
                privacy: { ...defaultPrivacy, ...imported.privacy },
                notifications: { ...defaultNotifications, ...imported.notifications },
                media: { ...defaultMedia, ...imported.media },
                chat: { ...defaultChat, ...imported.chat },
                network: { ...defaultNetwork, ...imported.network },
                storage: { ...defaultStorage, ...imported.storage },
                shortcuts: { ...defaultShortcuts, ...imported.shortcuts },
                lastUpdated: Date.now(),
            });
            applyTheme(imported.appearance?.theme ?? defaultAppearance.theme);
        }
        catch (e) {
            console.error('Failed to import settings:', e);
        }
    },
    resetToDefaults: () => {
        set({
            appearance: defaultAppearance,
            privacy: defaultPrivacy,
            notifications: defaultNotifications,
            media: defaultMedia,
            chat: defaultChat,
            network: defaultNetwork,
            storage: defaultStorage,
            shortcuts: defaultShortcuts,
            lastUpdated: Date.now(),
        });
        applyTheme(defaultAppearance.theme);
    },
}), {
    name: 'vortex-settings',
    storage: createJSONStorage(() => localStorage),
}));
// Theme application helper
function applyTheme(theme) {
    const root = document.documentElement;
    const body = document.body;
    // Remove existing theme classes
    root.classList.remove('dark', 'light', 'midnight', 'amoled');
    body.classList.remove('dark', 'light', 'midnight', 'amoled');
    let effectiveTheme = theme;
    if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.classList.add(effectiveTheme);
    body.classList.add(effectiveTheme);
    root.setAttribute('data-theme', effectiveTheme);
    // Apply theme-specific CSS variables
    const themes = {
        dark: {
            '--bg-primary': '#09090b',
            '--bg-secondary': '#18181b',
            '--bg-tertiary': '#27272a',
            '--surface-3': '#1f1f23',
            '--surface-4': '#27272a',
            '--surface-5': '#3f3f46',
            '--text-primary': '#f8fafc',
            '--text-secondary': '#a1a1aa',
            '--text-tertiary': '#71717a',
            '--text-muted': '#52525b',
            '--text-inverse': '#09090b',
            '--border-color': '#27272a',
            '--border-subtle': '#1f1f23',
            '--border-strong': '#3f3f46',
        },
        light: {
            '--bg-primary': '#ffffff',
            '--bg-secondary': '#f4f4f5',
            '--bg-tertiary': '#e4e4e7',
            '--surface-3': '#d4d4d8',
            '--surface-4': '#a1a1aa',
            '--surface-5': '#71717a',
            '--text-primary': '#09090b',
            '--text-secondary': '#52525b',
            '--text-tertiary': '#71717a',
            '--text-muted': '#a1a1aa',
            '--text-inverse': '#f8fafc',
            '--border-color': '#d4d4d8',
            '--border-subtle': '#e4e4e7',
            '--border-strong': '#a1a1aa',
        },
        midnight: {
            '--bg-primary': '#0a0a1a',
            '--bg-secondary': '#12122a',
            '--bg-tertiary': '#1a1a3a',
            '--surface-3': '#22224a',
            '--surface-4': '#2a2a5a',
            '--surface-5': '#3a3a7a',
            '--text-primary': '#e0e0ff',
            '--text-secondary': '#8080aa',
            '--text-tertiary': '#6060aa',
            '--text-muted': '#5050aa',
            '--text-inverse': '#0a0a1a',
            '--border-color': '#2a2a4a',
            '--border-subtle': '#1a1a3a',
            '--border-strong': '#3a3a6a',
        },
        amoled: {
            '--bg-primary': '#000000',
            '--bg-secondary': '#0a0a0a',
            '--bg-tertiary': '#141414',
            '--surface-3': '#1a1a1a',
            '--surface-4': '#222222',
            '--surface-5': '#2a2a2a',
            '--text-primary': '#ffffff',
            '--text-secondary': '#888888',
            '--text-tertiary': '#666666',
            '--text-muted': '#555555',
            '--text-inverse': '#000000',
            '--border-color': '#222222',
            '--border-subtle': '#1a1a1a',
            '--border-strong': '#333333',
        },
    };
    const themeVars = themes[effectiveTheme] ?? themes.dark;
    Object.entries(themeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
    // Update color-scheme for proper scrollbar colors etc.
    root.style.colorScheme = effectiveTheme === 'light' ? 'light' : 'dark';
}
// Initialize theme on load
if (typeof window !== 'undefined') {
    const settings = useSettingsStore.getState();
    applyTheme(settings.appearance.theme);
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = useSettingsStore.getState().appearance.theme;
        if (current === 'system') {
            applyTheme('system');
        }
    });
}
