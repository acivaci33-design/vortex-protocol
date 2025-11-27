/**
 * VORTEX Protocol - Electron Main Process
 * Handles window management, IPC, and native integrations
 */
import { app, BrowserWindow, ipcMain, desktopCapturer, session, shell, clipboard, nativeImage, dialog, Notification, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs';
// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// SQLite disabled due to Electron compatibility issues
// Using in-memory storage with localStorage sync
// TODO: Re-enable when better-sqlite3 supports Electron 31
const Database = null;
console.log('[Main] Using in-memory storage (SQLite disabled)');
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;
let mainWindow = null;
let db = null;
// In-memory storage fallback
const memoryStore = {
    meta: new Map(),
    messages: new Map(),
    contacts: new Map(),
    conversations: new Map(),
};
function getDb() {
    if (!Database) {
        return null; // Will use memory store
    }
    if (db)
        return db;
    try {
        const userDataPath = app.getPath('userData');
        const dbPath = path.join(userDataPath, 'vortex.db');
        const instance = new Database(dbPath);
        instance.pragma('journal_mode = WAL');
        // Meta table
        instance.prepare(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).run();
        // Messages table
        instance.prepare(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        peer_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        ttl_ms INTEGER,
        nonce_b64 TEXT NOT NULL,
        payload_b64 TEXT NOT NULL
      )
    `).run();
        // Contacts table
        instance.prepare(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        public_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        verified INTEGER DEFAULT 0,
        blocked INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_seen INTEGER
      )
    `).run();
        // Conversations table
        instance.prepare(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT,
        avatar_url TEXT,
        participants TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        settings TEXT DEFAULT '{}'
      )
    `).run();
        // Create indexes
        instance.prepare('CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id)').run();
        instance.prepare('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)').run();
        db = instance;
        console.log('[DB] Database initialized at:', dbPath);
        return instance;
    }
    catch (error) {
        console.error('[DB] Failed to initialize database:', error);
        throw error;
    }
}
function createWindow() {
    // Remove menu bar
    Menu.setApplicationMenu(null);
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#09090b',
        title: 'VORTEX Protocol',
        frame: true,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#09090b',
            symbolColor: '#ffffff',
            height: 32
        },
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Required for better-sqlite3
        },
    });
    // Permission handling
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
        const allowed = new Set(['media', 'display-capture', 'notifications']);
        callback(allowed.has(permission));
    });
    // CSP headers - only apply in production for better dev experience
    if (!isDev) {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; script-src 'self' 'wasm-unsafe-eval'; img-src 'self' data: blob: https:; connect-src 'self' wss: https:; media-src 'self' blob: data:;",
                    ],
                },
            });
        });
    }
    // Load the app
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Window event listeners
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    mainWindow.on('maximize', () => {
        mainWindow?.webContents.send('WINDOW_MAXIMIZED');
    });
    mainWindow.on('unmaximize', () => {
        mainWindow?.webContents.send('WINDOW_UNMAXIMIZED');
    });
    console.log('[Main] Window created, isDev:', isDev);
}
app.whenReady().then(() => {
    // Try to initialize database, but don't block on failure
    try {
        getDb();
    }
    catch (err) {
        console.error('[Main] Database initialization failed, continuing without DB:', err);
    }
    createWindow();
    // Setup auto-updater (only in production)
    if (!isDev) {
        setupAutoUpdater();
    }
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
// ==================== Auto-Updater ====================
function setupAutoUpdater() {
    console.log('[Updater] Checking for updates...');
    autoUpdater.on('checking-for-update', () => {
        console.log('[Updater] Checking for update...');
        mainWindow?.webContents.send('update-status', { status: 'checking' });
    });
    autoUpdater.on('update-available', (info) => {
        console.log('[Updater] Update available:', info.version);
        mainWindow?.webContents.send('update-status', {
            status: 'available',
            version: info.version,
            releaseNotes: info.releaseNotes,
        });
        // Ask user if they want to download
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${info.version}) is available. Would you like to download it now?`,
            buttons: ['Download', 'Later'],
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });
    autoUpdater.on('update-not-available', () => {
        console.log('[Updater] No update available');
        mainWindow?.webContents.send('update-status', { status: 'not-available' });
    });
    autoUpdater.on('download-progress', (progress) => {
        console.log(`[Updater] Download progress: ${Math.round(progress.percent)}%`);
        mainWindow?.webContents.send('update-status', {
            status: 'downloading',
            progress: progress.percent,
        });
    });
    autoUpdater.on('update-downloaded', (info) => {
        console.log('[Updater] Update downloaded:', info.version);
        mainWindow?.webContents.send('update-status', {
            status: 'downloaded',
            version: info.version,
        });
        // Ask user if they want to install now
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Update Ready',
            message: `Version ${info.version} has been downloaded. Restart now to install?`,
            buttons: ['Restart', 'Later'],
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        });
    });
    autoUpdater.on('error', (error) => {
        console.error('[Updater] Error:', error);
        mainWindow?.webContents.send('update-status', {
            status: 'error',
            error: error.message,
        });
    });
    // Check for updates after a short delay
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
            console.error('[Updater] Check failed:', err);
        });
    }, 3000);
}
// IPC handlers for manual update check
ipcMain.handle('CHECK_FOR_UPDATES', async () => {
    if (isDev) {
        return { status: 'dev-mode' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        return { status: 'checked', updateInfo: result?.updateInfo };
    }
    catch (error) {
        return { status: 'error', error: error.message };
    }
});
ipcMain.handle('DOWNLOAD_UPDATE', async () => {
    try {
        await autoUpdater.downloadUpdate();
        return { status: 'downloading' };
    }
    catch (error) {
        return { status: 'error', error: error.message };
    }
});
ipcMain.handle('INSTALL_UPDATE', () => {
    autoUpdater.quitAndInstall(false, true);
});
ipcMain.handle('GET_APP_VERSION', () => {
    return app.getVersion();
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});
ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', async (_event, opts) => {
    const sources = await desktopCapturer.getSources(opts);
    return Promise.all(sources.map(async (s) => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL(),
        display_id: s.display_id,
    })));
});
ipcMain.handle('DB_GET_META', (_event, key) => {
    const database = getDb();
    if (!database) {
        return memoryStore.meta.get(key) ?? null;
    }
    const row = database.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return row?.value ?? null;
});
ipcMain.handle('DB_SET_META', (_event, key, value) => {
    const database = getDb();
    if (!database) {
        memoryStore.meta.set(key, value);
        return;
    }
    database
        .prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run(key, value);
});
ipcMain.handle('DB_SAVE_MESSAGE', (_event, msg) => {
    const database = getDb();
    if (!database) {
        const messages = memoryStore.messages.get(msg.roomId) || [];
        messages.push(msg);
        memoryStore.messages.set(msg.roomId, messages);
        return;
    }
    database
        .prepare(`INSERT INTO messages (id, room_id, peer_id, direction, created_at, status, ttl_ms, nonce_b64, payload_b64)
       VALUES (@id, @roomId, @peerId, @direction, @createdAt, @status, @ttlMs, @nonceB64, @payloadB64)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         ttl_ms = excluded.ttl_ms,
         nonce_b64 = excluded.nonce_b64,
         payload_b64 = excluded.payload_b64`)
        .run(msg);
});
ipcMain.handle('DB_GET_MESSAGES', (_event, roomId, limit = 200) => {
    const database = getDb();
    if (!database) {
        const messages = memoryStore.messages.get(roomId) || [];
        return messages.slice(0, limit);
    }
    const rows = database
        .prepare(`SELECT
         id,
         room_id as roomId,
         peer_id as peerId,
         direction,
         created_at as createdAt,
         status,
         ttl_ms as ttlMs,
         nonce_b64 as nonceB64,
         payload_b64 as payloadB64
       FROM messages
       WHERE room_id = ?
       ORDER BY created_at DESC
       LIMIT ?`)
        .all(roomId, limit);
    return rows;
});
// ==================== Window Controls ====================
ipcMain.handle('WINDOW_CONTROL', (_event, action) => {
    if (!mainWindow)
        return;
    switch (action) {
        case 'minimize':
            mainWindow.minimize();
            break;
        case 'maximize':
            mainWindow.maximize();
            break;
        case 'close':
            mainWindow.close();
            break;
        case 'restore':
            mainWindow.restore();
            break;
        case 'focus':
            mainWindow.focus();
            break;
    }
});
ipcMain.handle('WINDOW_IS_MAXIMIZED', () => mainWindow?.isMaximized() ?? false);
ipcMain.handle('WINDOW_IS_FULLSCREEN', () => mainWindow?.isFullScreen() ?? false);
ipcMain.handle('WINDOW_SET_FULLSCREEN', (_event, flag) => mainWindow?.setFullScreen(flag));
ipcMain.handle('WINDOW_SET_ALWAYS_ON_TOP', (_event, flag) => mainWindow?.setAlwaysOnTop(flag));
// ==================== Contacts ====================
ipcMain.handle('DB_SAVE_CONTACT', (_event, contact) => {
    const database = getDb();
    if (!database) {
        memoryStore.contacts.set(contact.id, contact);
        return;
    }
    database.prepare(`
    INSERT INTO contacts (id, public_key, display_name, avatar_url, verified, blocked, created_at, last_seen)
    VALUES (@id, @publicKey, @displayName, @avatarUrl, @verified, @blocked, @createdAt, @lastSeen)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      verified = excluded.verified,
      blocked = excluded.blocked,
      last_seen = excluded.last_seen
  `).run({
        ...contact,
        verified: contact.verified ? 1 : 0,
        blocked: contact.blocked ? 1 : 0,
    });
});
ipcMain.handle('DB_GET_CONTACT', (_event, id) => {
    const database = getDb();
    if (!database) {
        return memoryStore.contacts.get(id) ?? null;
    }
    const row = database.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    if (!row)
        return null;
    return { ...row, verified: !!row.verified, blocked: !!row.blocked };
});
ipcMain.handle('DB_GET_ALL_CONTACTS', () => {
    const database = getDb();
    if (!database) {
        return Array.from(memoryStore.contacts.values());
    }
    const rows = database.prepare('SELECT * FROM contacts ORDER BY display_name').all();
    return rows.map((r) => ({ ...r, verified: !!r.verified, blocked: !!r.blocked }));
});
ipcMain.handle('DB_DELETE_CONTACT', (_event, id) => {
    const database = getDb();
    if (!database) {
        memoryStore.contacts.delete(id);
        return;
    }
    database.prepare('DELETE FROM contacts WHERE id = ?').run(id);
});
// ==================== Conversations ====================
ipcMain.handle('DB_SAVE_CONVERSATION', (_event, conv) => {
    const database = getDb();
    if (!database) {
        memoryStore.conversations.set(conv.id, conv);
        return;
    }
    database.prepare(`
    INSERT INTO conversations (id, type, name, avatar_url, participants, created_at, updated_at, settings)
    VALUES (@id, @type, @name, @avatarUrl, @participants, @createdAt, @updatedAt, @settings)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      participants = excluded.participants,
      updated_at = excluded.updated_at,
      settings = excluded.settings
  `).run(conv);
});
ipcMain.handle('DB_GET_CONVERSATION', (_event, id) => {
    const database = getDb();
    if (!database) {
        return memoryStore.conversations.get(id) ?? null;
    }
    return database.prepare('SELECT * FROM conversations WHERE id = ?').get(id) ?? null;
});
ipcMain.handle('DB_GET_ALL_CONVERSATIONS', () => {
    const database = getDb();
    if (!database) {
        return Array.from(memoryStore.conversations.values());
    }
    return database.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
});
ipcMain.handle('DB_DELETE_CONVERSATION', (_event, id) => {
    const database = getDb();
    if (!database) {
        memoryStore.conversations.delete(id);
        memoryStore.messages.delete(id);
        return;
    }
    database.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    database.prepare('DELETE FROM messages WHERE room_id = ?').run(id);
});
ipcMain.handle('DB_DELETE_META', (_event, key) => {
    const database = getDb();
    if (!database) {
        memoryStore.meta.delete(key);
        return;
    }
    database.prepare('DELETE FROM meta WHERE key = ?').run(key);
});
ipcMain.handle('DB_DELETE_MESSAGE', (_event, id) => {
    const database = getDb();
    if (!database) {
        // For memory store, we'd need to iterate all rooms - simplified version
        return;
    }
    database.prepare('DELETE FROM messages WHERE id = ?').run(id);
});
ipcMain.handle('DB_DELETE_MESSAGES_BY_ROOM', (_event, roomId) => {
    const database = getDb();
    if (!database) {
        memoryStore.messages.delete(roomId);
        return;
    }
    database.prepare('DELETE FROM messages WHERE room_id = ?').run(roomId);
});
ipcMain.handle('DB_CLEAR_ALL', () => {
    const database = getDb();
    if (!database) {
        memoryStore.meta.clear();
        memoryStore.messages.clear();
        memoryStore.contacts.clear();
        memoryStore.conversations.clear();
        return;
    }
    database.prepare('DELETE FROM messages').run();
    database.prepare('DELETE FROM contacts').run();
    database.prepare('DELETE FROM conversations').run();
    database.prepare('DELETE FROM meta').run();
});
ipcMain.handle('DB_VACUUM', () => {
    const database = getDb();
    if (!database)
        return; // No-op for memory store
    database.prepare('VACUUM').run();
});
// ==================== Notifications ====================
ipcMain.handle('NOTIFICATION_SHOW', (_event, options) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: options.title,
            body: options.body,
            silent: options.silent ?? false,
            icon: path.join(__dirname, '../dist/icon.png'),
            urgency: 'normal',
        });
        notification.on('click', () => {
            // Focus the window when notification is clicked
            if (mainWindow) {
                if (mainWindow.isMinimized())
                    mainWindow.restore();
                mainWindow.focus();
                // Send event to renderer to navigate to the conversation
                if (options.conversationId) {
                    mainWindow.webContents.send('NOTIFICATION_CLICK', {
                        conversationId: options.conversationId
                    });
                }
            }
        });
        notification.show();
        // Flash taskbar on Windows
        if (process.platform === 'win32' && mainWindow && !mainWindow.isFocused()) {
            mainWindow.flashFrame(true);
        }
    }
});
ipcMain.handle('NOTIFICATION_SET_BADGE', (_event, count) => {
    // Windows taskbar badge overlay
    if (process.platform === 'win32' && mainWindow) {
        if (count > 0) {
            mainWindow.setOverlayIcon(null, `${count} unread`);
        }
        else {
            mainWindow.setOverlayIcon(null, '');
        }
    }
    // macOS dock badge
    if (process.platform === 'darwin') {
        app.dock?.setBadge(count > 0 ? String(count) : '');
    }
});
ipcMain.handle('NOTIFICATION_CLEAR_BADGE', () => {
    if (process.platform === 'win32' && mainWindow) {
        mainWindow.setOverlayIcon(null, '');
        mainWindow.flashFrame(false);
    }
    if (process.platform === 'darwin') {
        app.dock?.setBadge('');
    }
});
ipcMain.handle('NOTIFICATION_REQUEST_PERMISSION', () => Notification.isSupported());
// ==================== File System ====================
ipcMain.handle('DIALOG_OPEN_FILE', async (_event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result.canceled ? null : result.filePaths;
});
ipcMain.handle('DIALOG_SAVE_FILE', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result.canceled ? null : result.filePath;
});
ipcMain.handle('FS_READ_FILE', async (_event, filePath) => {
    return fs.promises.readFile(filePath);
});
ipcMain.handle('FS_WRITE_FILE', async (_event, filePath, data) => {
    await fs.promises.writeFile(filePath, data);
});
ipcMain.handle('FS_GET_DOWNLOADS_PATH', () => app.getPath('downloads'));
ipcMain.handle('FS_GET_USER_DATA_PATH', () => app.getPath('userData'));
// ==================== Clipboard ====================
ipcMain.handle('CLIPBOARD_WRITE_TEXT', (_event, text) => {
    clipboard.writeText(text);
});
ipcMain.handle('CLIPBOARD_READ_TEXT', () => clipboard.readText());
ipcMain.handle('CLIPBOARD_WRITE_IMAGE', (_event, dataUrl) => {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
});
ipcMain.handle('CLIPBOARD_HAS_IMAGE', () => !clipboard.readImage().isEmpty());
// ==================== Shell ====================
ipcMain.handle('SHELL_OPEN_EXTERNAL', async (_event, url) => {
    await shell.openExternal(url);
});
ipcMain.handle('SHELL_SHOW_ITEM_IN_FOLDER', (_event, fullPath) => {
    shell.showItemInFolder(fullPath);
});
// ==================== App Info ====================
ipcMain.handle('APP_GET_VERSION', () => app.getVersion());
ipcMain.handle('APP_GET_NAME', () => app.getName());
ipcMain.handle('APP_QUIT', () => app.quit());
ipcMain.handle('APP_RELAUNCH', () => { app.relaunch(); app.exit(0); });
ipcMain.handle('APP_IS_PACKAGED', () => app.isPackaged);
// ==================== Secure Storage (simple implementation) ====================
const secureStore = new Map();
ipcMain.handle('SECURE_STORAGE_SET', (_event, key, value) => {
    secureStore.set(key, value);
});
ipcMain.handle('SECURE_STORAGE_GET', (_event, key) => {
    return secureStore.get(key) ?? null;
});
ipcMain.handle('SECURE_STORAGE_DELETE', (_event, key) => {
    secureStore.delete(key);
});
ipcMain.handle('SECURE_STORAGE_HAS', (_event, key) => {
    return secureStore.has(key);
});
