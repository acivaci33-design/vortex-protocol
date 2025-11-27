/**
 * VORTEX Protocol - Preload Script
 * Secure bridge between renderer and main process
 * All IPC communication is exposed through contextBridge
 */
import { contextBridge, ipcRenderer } from 'electron';
// Create the API object
const electronAPI = {
    // ==================== Platform Info ====================
    platform: process.platform,
    isWindows: process.platform === 'win32',
    isMac: process.platform === 'darwin',
    isLinux: process.platform === 'linux',
    // ==================== Window Controls ====================
    window: {
        minimize: () => ipcRenderer.invoke('WINDOW_CONTROL', 'minimize'),
        maximize: () => ipcRenderer.invoke('WINDOW_CONTROL', 'maximize'),
        close: () => ipcRenderer.invoke('WINDOW_CONTROL', 'close'),
        restore: () => ipcRenderer.invoke('WINDOW_CONTROL', 'restore'),
        focus: () => ipcRenderer.invoke('WINDOW_CONTROL', 'focus'),
        isMaximized: () => ipcRenderer.invoke('WINDOW_IS_MAXIMIZED'),
        isFullscreen: () => ipcRenderer.invoke('WINDOW_IS_FULLSCREEN'),
        setFullscreen: (flag) => ipcRenderer.invoke('WINDOW_SET_FULLSCREEN', flag),
        setAlwaysOnTop: (flag) => ipcRenderer.invoke('WINDOW_SET_ALWAYS_ON_TOP', flag),
    },
    // ==================== Desktop Capturer ====================
    getSources: async (types = ['screen', 'window']) => {
        return ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', {
            types,
            thumbnailSize: { width: 320, height: 200 },
            fetchWindowIcons: true,
        });
    },
    // ==================== Database - Metadata ====================
    db: {
        getMeta: (key) => ipcRenderer.invoke('DB_GET_META', key),
        setMeta: (key, value) => ipcRenderer.invoke('DB_SET_META', key, value),
        deleteMeta: (key) => ipcRenderer.invoke('DB_DELETE_META', key),
        // Messages
        saveMessage: (msg) => ipcRenderer.invoke('DB_SAVE_MESSAGE', msg),
        getMessages: (roomId, limit) => ipcRenderer.invoke('DB_GET_MESSAGES', roomId, limit ?? 200),
        deleteMessage: (id) => ipcRenderer.invoke('DB_DELETE_MESSAGE', id),
        deleteMessagesByRoom: (roomId) => ipcRenderer.invoke('DB_DELETE_MESSAGES_BY_ROOM', roomId),
        // Contacts
        saveContact: (contact) => ipcRenderer.invoke('DB_SAVE_CONTACT', contact),
        getContact: (id) => ipcRenderer.invoke('DB_GET_CONTACT', id),
        getAllContacts: () => ipcRenderer.invoke('DB_GET_ALL_CONTACTS'),
        deleteContact: (id) => ipcRenderer.invoke('DB_DELETE_CONTACT', id),
        // Conversations
        saveConversation: (conv) => ipcRenderer.invoke('DB_SAVE_CONVERSATION', conv),
        getConversation: (id) => ipcRenderer.invoke('DB_GET_CONVERSATION', id),
        getAllConversations: () => ipcRenderer.invoke('DB_GET_ALL_CONVERSATIONS'),
        deleteConversation: (id) => ipcRenderer.invoke('DB_DELETE_CONVERSATION', id),
        // Bulk operations
        clearAllData: () => ipcRenderer.invoke('DB_CLEAR_ALL'),
        vacuum: () => ipcRenderer.invoke('DB_VACUUM'),
    },
    // ==================== Secure Storage ====================
    secureStorage: {
        set: (key, value) => ipcRenderer.invoke('SECURE_STORAGE_SET', key, value),
        get: (key) => ipcRenderer.invoke('SECURE_STORAGE_GET', key),
        delete: (key) => ipcRenderer.invoke('SECURE_STORAGE_DELETE', key),
        has: (key) => ipcRenderer.invoke('SECURE_STORAGE_HAS', key),
    },
    // ==================== Notifications ====================
    notifications: {
        show: (options) => ipcRenderer.invoke('NOTIFICATION_SHOW', options),
        setBadgeCount: (count) => ipcRenderer.invoke('NOTIFICATION_SET_BADGE', count),
        clearBadge: () => ipcRenderer.invoke('NOTIFICATION_CLEAR_BADGE'),
        requestPermission: () => ipcRenderer.invoke('NOTIFICATION_REQUEST_PERMISSION'),
    },
    // ==================== File System ====================
    fs: {
        showOpenDialog: (options) => ipcRenderer.invoke('DIALOG_OPEN_FILE', options),
        showSaveDialog: (options) => ipcRenderer.invoke('DIALOG_SAVE_FILE', options),
        readFile: (path) => ipcRenderer.invoke('FS_READ_FILE', path),
        writeFile: (path, data) => ipcRenderer.invoke('FS_WRITE_FILE', path, data),
        getDownloadsPath: () => ipcRenderer.invoke('FS_GET_DOWNLOADS_PATH'),
        getUserDataPath: () => ipcRenderer.invoke('FS_GET_USER_DATA_PATH'),
    },
    // ==================== Clipboard ====================
    clipboard: {
        writeText: (text) => ipcRenderer.invoke('CLIPBOARD_WRITE_TEXT', text),
        readText: () => ipcRenderer.invoke('CLIPBOARD_READ_TEXT'),
        writeImage: (dataUrl) => ipcRenderer.invoke('CLIPBOARD_WRITE_IMAGE', dataUrl),
        hasImage: () => ipcRenderer.invoke('CLIPBOARD_HAS_IMAGE'),
    },
    // ==================== Shell ====================
    shell: {
        openExternal: (url) => ipcRenderer.invoke('SHELL_OPEN_EXTERNAL', url),
        showItemInFolder: (path) => ipcRenderer.invoke('SHELL_SHOW_ITEM_IN_FOLDER', path),
    },
    // ==================== App Info ====================
    app: {
        getVersion: () => ipcRenderer.invoke('APP_GET_VERSION'),
        getName: () => ipcRenderer.invoke('APP_GET_NAME'),
        quit: () => ipcRenderer.invoke('APP_QUIT'),
        relaunch: () => ipcRenderer.invoke('APP_RELAUNCH'),
        isPackaged: () => ipcRenderer.invoke('APP_IS_PACKAGED'),
    },
    // ==================== Auto Updates ====================
    updater: {
        checkForUpdates: () => ipcRenderer.invoke('UPDATER_CHECK'),
        downloadUpdate: () => ipcRenderer.invoke('UPDATER_DOWNLOAD'),
        installUpdate: () => ipcRenderer.invoke('UPDATER_INSTALL'),
        onUpdateAvailable: (callback) => {
            const handler = (_event, info) => callback(info);
            ipcRenderer.on('UPDATE_AVAILABLE', handler);
            return () => ipcRenderer.removeListener('UPDATE_AVAILABLE', handler);
        },
        onDownloadProgress: (callback) => {
            const handler = (_event, progress) => callback(progress);
            ipcRenderer.on('UPDATE_DOWNLOAD_PROGRESS', handler);
            return () => ipcRenderer.removeListener('UPDATE_DOWNLOAD_PROGRESS', handler);
        },
    },
    // ==================== Event Listeners ====================
    on: (channel, callback) => {
        const allowedChannels = [
            'WINDOW_MAXIMIZED',
            'WINDOW_UNMAXIMIZED',
            'WINDOW_FOCUS',
            'WINDOW_BLUR',
            'DEEP_LINK',
            'NOTIFICATION_CLICK',
            'UPDATE_AVAILABLE',
            'UPDATE_DOWNLOADED',
        ];
        if (allowedChannels.includes(channel)) {
            const handler = (_event, ...args) => callback(...args);
            ipcRenderer.on(channel, handler);
            return () => ipcRenderer.removeListener(channel, handler);
        }
        return () => { };
    },
    once: (channel, callback) => {
        const handler = (_event, ...args) => callback(...args);
        ipcRenderer.once(channel, handler);
    },
};
// Expose API to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
// Also expose a simplified db API at window.db for backwards compatibility
contextBridge.exposeInMainWorld('db', {
    getMeta: electronAPI.db.getMeta,
    setMeta: electronAPI.db.setMeta,
    saveMessage: electronAPI.db.saveMessage,
    getMessages: electronAPI.db.getMessages,
});
