/**
 * VORTEX Protocol - Preload Script
 * Secure bridge between renderer and main process
 * All IPC communication is exposed through contextBridge
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for database operations
interface DbMessageRow {
  id: string;
  roomId: string;
  peerId: string;
  direction: 'in' | 'out';
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
  ttlMs?: number | null;
  nonceB64: string;
  payloadB64: string;
}

interface ContactRow {
  id: string;
  publicKey: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
  blocked: boolean;
  createdAt: number;
  lastSeen?: number;
}

interface ConversationRow {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  participants: string;
  createdAt: number;
  updatedAt: number;
  settings: string;
}

// Notification options
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  urgency?: 'low' | 'normal' | 'critical';
  actions?: Array<{ type: string; text: string }>;
}

// Window control types
type WindowAction = 'minimize' | 'maximize' | 'close' | 'restore' | 'focus';

// Export types
export interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
  display_id?: string;
  appIcon?: string;
}

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
    setFullscreen: (flag: boolean) => ipcRenderer.invoke('WINDOW_SET_FULLSCREEN', flag),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('WINDOW_SET_ALWAYS_ON_TOP', flag),
  },
  
  // ==================== Desktop Capturer ====================
  getSources: async (types: Array<'window' | 'screen'> = ['screen', 'window']): Promise<DesktopSource[]> => {
    return ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', {
      types,
      thumbnailSize: { width: 320, height: 200 },
      fetchWindowIcons: true,
    });
  },
  
  // ==================== Database - Metadata ====================
  db: {
    getMeta: (key: string): Promise<string | null> => 
      ipcRenderer.invoke('DB_GET_META', key),
    
    setMeta: (key: string, value: string): Promise<void> => 
      ipcRenderer.invoke('DB_SET_META', key, value),
    
    deleteMeta: (key: string): Promise<void> =>
      ipcRenderer.invoke('DB_DELETE_META', key),
    
    // Messages
    saveMessage: (msg: DbMessageRow): Promise<void> => 
      ipcRenderer.invoke('DB_SAVE_MESSAGE', msg),
    
    getMessages: (roomId: string, limit?: number): Promise<DbMessageRow[]> => 
      ipcRenderer.invoke('DB_GET_MESSAGES', roomId, limit ?? 200),
    
    deleteMessage: (id: string): Promise<void> =>
      ipcRenderer.invoke('DB_DELETE_MESSAGE', id),
    
    deleteMessagesByRoom: (roomId: string): Promise<void> =>
      ipcRenderer.invoke('DB_DELETE_MESSAGES_BY_ROOM', roomId),
    
    // Contacts
    saveContact: (contact: ContactRow): Promise<void> =>
      ipcRenderer.invoke('DB_SAVE_CONTACT', contact),
    
    getContact: (id: string): Promise<ContactRow | null> =>
      ipcRenderer.invoke('DB_GET_CONTACT', id),
    
    getAllContacts: (): Promise<ContactRow[]> =>
      ipcRenderer.invoke('DB_GET_ALL_CONTACTS'),
    
    deleteContact: (id: string): Promise<void> =>
      ipcRenderer.invoke('DB_DELETE_CONTACT', id),
    
    // Conversations
    saveConversation: (conv: ConversationRow): Promise<void> =>
      ipcRenderer.invoke('DB_SAVE_CONVERSATION', conv),
    
    getConversation: (id: string): Promise<ConversationRow | null> =>
      ipcRenderer.invoke('DB_GET_CONVERSATION', id),
    
    getAllConversations: (): Promise<ConversationRow[]> =>
      ipcRenderer.invoke('DB_GET_ALL_CONVERSATIONS'),
    
    deleteConversation: (id: string): Promise<void> =>
      ipcRenderer.invoke('DB_DELETE_CONVERSATION', id),
    
    // Bulk operations
    clearAllData: (): Promise<void> =>
      ipcRenderer.invoke('DB_CLEAR_ALL'),
    
    vacuum: (): Promise<void> =>
      ipcRenderer.invoke('DB_VACUUM'),
  },
  
  // ==================== Secure Storage ====================
  secureStorage: {
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('SECURE_STORAGE_SET', key, value),
    
    get: (key: string): Promise<string | null> =>
      ipcRenderer.invoke('SECURE_STORAGE_GET', key),
    
    delete: (key: string): Promise<void> =>
      ipcRenderer.invoke('SECURE_STORAGE_DELETE', key),
    
    has: (key: string): Promise<boolean> =>
      ipcRenderer.invoke('SECURE_STORAGE_HAS', key),
  },
  
  // ==================== Notifications ====================
  notifications: {
    show: (options: NotificationOptions): Promise<void> =>
      ipcRenderer.invoke('NOTIFICATION_SHOW', options),
    
    setBadgeCount: (count: number): Promise<void> =>
      ipcRenderer.invoke('NOTIFICATION_SET_BADGE', count),
    
    clearBadge: (): Promise<void> =>
      ipcRenderer.invoke('NOTIFICATION_CLEAR_BADGE'),
    
    requestPermission: (): Promise<boolean> =>
      ipcRenderer.invoke('NOTIFICATION_REQUEST_PERMISSION'),
  },
  
  // ==================== File System ====================
  fs: {
    showOpenDialog: (options: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
      properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
    }): Promise<string[] | null> =>
      ipcRenderer.invoke('DIALOG_OPEN_FILE', options),
    
    showSaveDialog: (options: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<string | null> =>
      ipcRenderer.invoke('DIALOG_SAVE_FILE', options),
    
    readFile: (path: string): Promise<Uint8Array> =>
      ipcRenderer.invoke('FS_READ_FILE', path),
    
    writeFile: (path: string, data: Uint8Array): Promise<void> =>
      ipcRenderer.invoke('FS_WRITE_FILE', path, data),
    
    getDownloadsPath: (): Promise<string> =>
      ipcRenderer.invoke('FS_GET_DOWNLOADS_PATH'),
    
    getUserDataPath: (): Promise<string> =>
      ipcRenderer.invoke('FS_GET_USER_DATA_PATH'),
  },
  
  // ==================== Clipboard ====================
  clipboard: {
    writeText: (text: string): Promise<void> =>
      ipcRenderer.invoke('CLIPBOARD_WRITE_TEXT', text),
    
    readText: (): Promise<string> =>
      ipcRenderer.invoke('CLIPBOARD_READ_TEXT'),
    
    writeImage: (dataUrl: string): Promise<void> =>
      ipcRenderer.invoke('CLIPBOARD_WRITE_IMAGE', dataUrl),
    
    hasImage: (): Promise<boolean> =>
      ipcRenderer.invoke('CLIPBOARD_HAS_IMAGE'),
  },
  
  // ==================== Shell ====================
  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('SHELL_OPEN_EXTERNAL', url),
    
    showItemInFolder: (path: string): Promise<void> =>
      ipcRenderer.invoke('SHELL_SHOW_ITEM_IN_FOLDER', path),
  },
  
  // ==================== App Info ====================
  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('APP_GET_VERSION'),
    
    getName: (): Promise<string> =>
      ipcRenderer.invoke('APP_GET_NAME'),
    
    quit: (): Promise<void> =>
      ipcRenderer.invoke('APP_QUIT'),
    
    relaunch: (): Promise<void> =>
      ipcRenderer.invoke('APP_RELAUNCH'),
    
    isPackaged: (): Promise<boolean> =>
      ipcRenderer.invoke('APP_IS_PACKAGED'),
  },
  
  // ==================== Auto Updates ====================
  updater: {
    checkForUpdates: (): Promise<void> =>
      ipcRenderer.invoke('UPDATER_CHECK'),
    
    downloadUpdate: (): Promise<void> =>
      ipcRenderer.invoke('UPDATER_DOWNLOAD'),
    
    installUpdate: (): Promise<void> =>
      ipcRenderer.invoke('UPDATER_INSTALL'),
    
    onUpdateAvailable: (callback: (info: { version: string }) => void) => {
      const handler = (_event: IpcRendererEvent, info: { version: string }) => callback(info);
      ipcRenderer.on('UPDATE_AVAILABLE', handler);
      return () => ipcRenderer.removeListener('UPDATE_AVAILABLE', handler);
    },
    
    onDownloadProgress: (callback: (progress: { percent: number }) => void) => {
      const handler = (_event: IpcRendererEvent, progress: { percent: number }) => callback(progress);
      ipcRenderer.on('UPDATE_DOWNLOAD_PROGRESS', handler);
      return () => ipcRenderer.removeListener('UPDATE_DOWNLOAD_PROGRESS', handler);
    },
  },
  
  // ==================== Event Listeners ====================
  on: (channel: string, callback: (...args: unknown[]) => void) => {
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
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
    return () => {};
  },
  
  once: (channel: string, callback: (...args: unknown[]) => void) => {
    const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
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

// Type exports for TypeScript
export type ElectronAPI = typeof electronAPI;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    db: {
      getMeta: (key: string) => Promise<string | null>;
      setMeta: (key: string, value: string) => Promise<void>;
      saveMessage: (msg: DbMessageRow) => Promise<void>;
      getMessages: (roomId: string, limit?: number) => Promise<DbMessageRow[]>;
    };
  }
}
