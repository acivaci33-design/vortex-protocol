/**
 * VORTEX Protocol - Database Service
 * Persistent SQLite storage using sql.js
 * Works in both Electron main and renderer processes
 */

import initSqlJs, { Database as SqlJsDatabase, SqlValue } from 'sql.js';

// Types
export interface UserIdentity {
  id: string;
  publicKey: string;
  privateKeyEncrypted: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  lastSeen: number;
}

export interface Contact {
  id: string;
  identityKey: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
  blocked: boolean;
  notes?: string;
  createdAt: number;
  lastSeen: number;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string;
  participants: string; // JSON stringified array
  encryptionEnabled: boolean;
  disappearingTimeout?: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  unreadCount: number;
  lastMessageId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video' | 'system';
  content: string;
  encryptedPayload?: string;
  nonce?: string;
  replyToId?: string;
  reactions?: string; // JSON stringified
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isEdited: boolean;
  isDeleted: boolean;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CryptoSession {
  id: string;
  peerId: string;
  rootKey: string;
  sendChainKey: string;
  receiveChainKey: string;
  sendMessageNumber: number;
  receiveMessageNumber: number;
  previousChainLength: number;
  skippedKeys: string; // JSON stringified
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: number;
}

export interface PendingMessage {
  id: string;
  conversationId: string;
  peerId: string;
  encryptedPayload: string;
  nonce: string;
  createdAt: number;
  retryCount: number;
}

class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string = '';
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  async initialize(storagePath?: string): Promise<void> {
    if (this.initialized) return;

    try {
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });

      // Try to load existing database
      this.dbPath = storagePath || 'vortex.db';
      let existingData: Uint8Array | null = null;

      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem('vortex_db');
          if (stored) {
            existingData = new Uint8Array(JSON.parse(stored));
          }
        }
      } catch (e) {
        console.warn('[DB] Could not load existing database:', e);
      }

      this.db = existingData ? new SQL.Database(existingData) : new SQL.Database();
      this.createTables();
      this.initialized = true;
      console.log('[DB] Database initialized successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize database:', error);
      throw error;
    }
  }

  private createTables(): void {
    if (!this.db) return;

    // User Identity
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_identity (
        id TEXT PRIMARY KEY,
        public_key TEXT NOT NULL UNIQUE,
        private_key_encrypted TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      )
    `);

    // Contacts
    this.db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        identity_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        verified INTEGER DEFAULT 0,
        blocked INTEGER DEFAULT 0,
        notes TEXT,
        created_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      )
    `);

    // Conversations
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('direct', 'group')),
        name TEXT,
        avatar_url TEXT,
        participants TEXT NOT NULL,
        encryption_enabled INTEGER DEFAULT 1,
        disappearing_timeout INTEGER,
        is_pinned INTEGER DEFAULT 0,
        is_muted INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        unread_count INTEGER DEFAULT 0,
        last_message_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Messages
    this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'text',
        content TEXT NOT NULL,
        encrypted_payload TEXT,
        nonce TEXT,
        reply_to_id TEXT,
        reactions TEXT,
        status TEXT DEFAULT 'sending',
        is_edited INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        expires_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Crypto Sessions (for Double Ratchet)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS crypto_sessions (
        id TEXT PRIMARY KEY,
        peer_id TEXT NOT NULL UNIQUE,
        root_key TEXT NOT NULL,
        send_chain_key TEXT NOT NULL,
        receive_chain_key TEXT NOT NULL,
        send_message_number INTEGER DEFAULT 0,
        receive_message_number INTEGER DEFAULT 0,
        previous_chain_length INTEGER DEFAULT 0,
        skipped_keys TEXT DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Settings
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Pending Messages (for offline queue)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS pending_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        peer_id TEXT NOT NULL,
        encrypted_payload TEXT NOT NULL,
        nonce TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0
      )
    `);

    // Create indexes
    this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_contacts_identity ON contacts(identity_key)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_pending_peer ON pending_messages(peer_id)');
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => this.saveToStorage(), 1000);
  }

  private saveToStorage(): void {
    if (!this.db) return;

    try {
      const data = this.db.export();
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('vortex_db', JSON.stringify(Array.from(data)));
      }
    } catch (e) {
      console.error('[DB] Failed to save database:', e);
    }
  }

  // ==================== User Identity ====================
  
  saveUserIdentity(identity: UserIdentity): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(`
      INSERT OR REPLACE INTO user_identity 
      (id, public_key, private_key_encrypted, display_name, avatar_url, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      identity.id,
      identity.publicKey,
      identity.privateKeyEncrypted,
      identity.displayName,
      identity.avatarUrl || null,
      identity.createdAt,
      identity.lastSeen,
    ]);
    // Force immediate save for critical identity data
    this.forceSave();
    console.log('[DB] User identity saved:', identity.displayName);
  }

  getUserIdentity(): UserIdentity | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT * FROM user_identity LIMIT 1');
    if (!result.length || !result[0].values.length) return null;
    
    const row = result[0].values[0];
    const cols = result[0].columns;
    return this.rowToObject<UserIdentity>(cols, row);
  }

  // ==================== Contacts ====================
  
  saveContact(contact: Contact): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(`
      INSERT OR REPLACE INTO contacts 
      (id, identity_key, display_name, avatar_url, verified, blocked, notes, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      contact.id,
      contact.identityKey,
      contact.displayName,
      contact.avatarUrl || null,
      contact.verified ? 1 : 0,
      contact.blocked ? 1 : 0,
      contact.notes || null,
      contact.createdAt,
      contact.lastSeen,
    ]);
    this.scheduleSave();
  }

  getContact(id: string): Contact | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT * FROM contacts WHERE id = ?', [id]);
    if (!result.length || !result[0].values.length) return null;
    
    return this.rowToContact(result[0].columns, result[0].values[0]);
  }

  getContactByIdentityKey(key: string): Contact | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT * FROM contacts WHERE identity_key = ?', [key]);
    if (!result.length || !result[0].values.length) return null;
    
    return this.rowToContact(result[0].columns, result[0].values[0]);
  }

  getAllContacts(): Contact[] {
    if (!this.db) return [];
    
    const result = this.db.exec('SELECT * FROM contacts WHERE blocked = 0 ORDER BY display_name');
    if (!result.length) return [];
    
    return result[0].values.map((row: SqlValue[]) => this.rowToContact(result[0].columns, row));
  }

  deleteContact(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM contacts WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ==================== Conversations ====================
  
  saveConversation(conv: Conversation): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(`
      INSERT OR REPLACE INTO conversations 
      (id, type, name, avatar_url, participants, encryption_enabled, disappearing_timeout, 
       is_pinned, is_muted, is_archived, unread_count, last_message_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      conv.id,
      conv.type,
      conv.name || null,
      conv.avatarUrl || null,
      conv.participants,
      conv.encryptionEnabled ? 1 : 0,
      conv.disappearingTimeout || null,
      conv.isPinned ? 1 : 0,
      conv.isMuted ? 1 : 0,
      conv.isArchived ? 1 : 0,
      conv.unreadCount,
      conv.lastMessageId || null,
      conv.createdAt,
      conv.updatedAt,
    ]);
    this.scheduleSave();
  }

  getConversation(id: string): Conversation | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT * FROM conversations WHERE id = ?', [id]);
    if (!result.length || !result[0].values.length) return null;
    
    return this.rowToConversation(result[0].columns, result[0].values[0]);
  }

  getAllConversations(): Conversation[] {
    if (!this.db) return [];
    
    const result = this.db.exec(`
      SELECT * FROM conversations 
      WHERE is_archived = 0 
      ORDER BY is_pinned DESC, updated_at DESC
    `);
    if (!result.length) return [];
    
    return result[0].values.map((row: SqlValue[]) => this.rowToConversation(result[0].columns, row));
  }

  deleteConversation(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ==================== Messages ====================
  
  saveMessage(message: Message): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(`
      INSERT OR REPLACE INTO messages 
      (id, conversation_id, sender_id, type, content, encrypted_payload, nonce, 
       reply_to_id, reactions, status, is_edited, is_deleted, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.conversationId,
      message.senderId,
      message.type,
      message.content,
      message.encryptedPayload || null,
      message.nonce || null,
      message.replyToId || null,
      message.reactions || null,
      message.status,
      message.isEdited ? 1 : 0,
      message.isDeleted ? 1 : 0,
      message.expiresAt || null,
      message.createdAt,
      message.updatedAt,
    ]);
    
    // Update conversation
    this.db.run(`
      UPDATE conversations 
      SET last_message_id = ?, updated_at = ?
      WHERE id = ?
    `, [message.id, message.updatedAt, message.conversationId]);
    
    this.scheduleSave();
  }

  getMessage(id: string): Message | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT * FROM messages WHERE id = ?', [id]);
    if (!result.length || !result[0].values.length) return null;
    
    return this.rowToMessage(result[0].columns, result[0].values[0]);
  }

  getMessages(conversationId: string, limit = 100, beforeId?: string): Message[] {
    if (!this.db) return [];
    
    let query = `
      SELECT * FROM messages 
      WHERE conversation_id = ? AND is_deleted = 0
    `;
    const params: any[] = [conversationId];
    
    if (beforeId) {
      query += ' AND created_at < (SELECT created_at FROM messages WHERE id = ?)';
      params.push(beforeId);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const result = this.db.exec(query, params);
    if (!result.length) return [];
    
    return result[0].values.map((row: SqlValue[]) => this.rowToMessage(result[0].columns, row)).reverse();
  }

  updateMessageStatus(id: string, status: Message['status']): void {
    if (!this.db) return;
    this.db.run('UPDATE messages SET status = ?, updated_at = ? WHERE id = ?', [status, Date.now(), id]);
    this.scheduleSave();
  }

  deleteMessage(id: string, hardDelete = false): void {
    if (!this.db) return;
    if (hardDelete) {
      this.db.run('DELETE FROM messages WHERE id = ?', [id]);
    } else {
      this.db.run('UPDATE messages SET is_deleted = 1, content = "", updated_at = ? WHERE id = ?', [Date.now(), id]);
    }
    this.scheduleSave();
  }

  // ==================== Crypto Sessions ====================
  
  saveCryptoSession(session: CryptoSession): void {
    if (!this.db) throw new Error('Database not initialized');
    
    this.db.run(`
      INSERT OR REPLACE INTO crypto_sessions 
      (id, peer_id, root_key, send_chain_key, receive_chain_key, 
       send_message_number, receive_message_number, previous_chain_length, skipped_keys, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      session.id,
      session.peerId,
      session.rootKey,
      session.sendChainKey,
      session.receiveChainKey,
      session.sendMessageNumber,
      session.receiveMessageNumber,
      session.previousChainLength,
      session.skippedKeys,
      session.createdAt,
      session.updatedAt,
    ]);
    this.scheduleSave();
  }

  getCryptoSession(peerId: string): CryptoSession | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT * FROM crypto_sessions WHERE peer_id = ?', [peerId]);
    if (!result.length || !result[0].values.length) return null;
    
    return this.rowToObject<CryptoSession>(result[0].columns, result[0].values[0]);
  }

  // ==================== Settings ====================
  
  setSetting(key: string, value: string): void {
    if (!this.db) return;
    
    this.db.run(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `, [key, value, Date.now()]);
    this.forceSave();
    console.log('[DB] Setting saved:', key);
  }

  getSetting(key: string): string | null {
    if (!this.db) return null;
    
    const result = this.db.exec('SELECT value FROM settings WHERE key = ?', [key]);
    if (!result.length || !result[0].values.length) return null;
    
    return result[0].values[0][0] as string;
  }

  getAllSettings(): Record<string, string> {
    if (!this.db) return {};
    
    const result = this.db.exec('SELECT key, value FROM settings');
    if (!result.length) return {};
    
    const settings: Record<string, string> = {};
    result[0].values.forEach((row) => {
      settings[row[0] as string] = row[1] as string;
    });
    return settings;
  }

  // ==================== Pending Messages ====================
  
  addPendingMessage(msg: PendingMessage): void {
    if (!this.db) return;
    this.db.run(`
      INSERT INTO pending_messages 
      (id, conversation_id, peer_id, encrypted_payload, nonce, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [msg.id, msg.conversationId, msg.peerId, msg.encryptedPayload, msg.nonce, msg.createdAt, msg.retryCount]);
    this.scheduleSave();
  }

  getPendingMessages(peerId?: string): PendingMessage[] {
    if (!this.db) return [];
    
    const query = peerId 
      ? 'SELECT * FROM pending_messages WHERE peer_id = ? ORDER BY created_at'
      : 'SELECT * FROM pending_messages ORDER BY created_at';
    const params = peerId ? [peerId] : [];
    
    const result = this.db.exec(query, params);
    if (!result.length) return [];
    
    return result[0].values.map((row: SqlValue[]) => this.rowToObject<PendingMessage>(result[0].columns, row));
  }

  removePendingMessage(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM pending_messages WHERE id = ?', [id]);
    this.scheduleSave();
  }

  incrementPendingRetry(id: string): void {
    if (!this.db) return;
    this.db.run('UPDATE pending_messages SET retry_count = retry_count + 1 WHERE id = ?', [id]);
    this.scheduleSave();
  }

  // ==================== Utilities ====================
  
  private rowToObject<T>(columns: string[], values: SqlValue[]): T {
    const obj: any = {};
    columns.forEach((col, i) => {
      // Convert snake_case to camelCase
      const key = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      obj[key] = values[i];
    });
    return obj as T;
  }

  private rowToContact(columns: string[], values: SqlValue[]): Contact {
    const obj = this.rowToObject<any>(columns, values);
    return {
      ...obj,
      verified: !!obj.verified,
      blocked: !!obj.blocked,
    };
  }

  private rowToConversation(columns: string[], values: SqlValue[]): Conversation {
    const obj = this.rowToObject<any>(columns, values);
    return {
      ...obj,
      encryptionEnabled: !!obj.encryptionEnabled,
      isPinned: !!obj.isPinned,
      isMuted: !!obj.isMuted,
      isArchived: !!obj.isArchived,
    };
  }

  private rowToMessage(columns: string[], values: SqlValue[]): Message {
    const obj = this.rowToObject<any>(columns, values);
    return {
      ...obj,
      isEdited: !!obj.isEdited,
      isDeleted: !!obj.isDeleted,
    };
  }

  // Clear all data
  clearAll(): void {
    if (!this.db) return;
    this.db.run('DELETE FROM pending_messages');
    this.db.run('DELETE FROM crypto_sessions');
    this.db.run('DELETE FROM messages');
    this.db.run('DELETE FROM conversations');
    this.db.run('DELETE FROM contacts');
    this.db.run('DELETE FROM settings');
    // Keep user_identity for now
    this.scheduleSave();
  }

  // Export database for backup
  exportDatabase(): Uint8Array | null {
    if (!this.db) return null;
    return this.db.export();
  }

  // Import database from backup
  async importDatabase(data: Uint8Array): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });
    
    this.db = new SQL.Database(data);
    this.scheduleSave();
  }

  // Force save
  forceSave(): void {
    this.saveToStorage();
  }
}

// Singleton instance
export const db = new DatabaseService();
export default db;
