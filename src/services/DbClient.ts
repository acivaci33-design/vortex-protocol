export type MessageDirection = 'in' | 'out';

export interface StoredMessageRow {
  id: string;
  roomId: string;
  peerId: string;
  direction: MessageDirection;
  createdAt: number;
  status: 'sent' | 'delivered' | 'read';
  ttlMs?: number | null;
  nonceB64: string;
  payloadB64: string;
}

export interface DbApi {
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  saveMessage(row: StoredMessageRow): Promise<void>;
  getMessages(roomId: string, limit?: number): Promise<StoredMessageRow[]>;
}

function getApi(): DbApi | null {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as unknown as { db?: DbApi };
  return anyWindow.db ?? null;
}

class DbClientImpl {
  async getMeta(key: string): Promise<string | null> {
    const api = getApi();
    if (!api) return null;
    return api.getMeta(key);
  }

  async setMeta(key: string, value: string): Promise<void> {
    const api = getApi();
    if (!api) return;
    await api.setMeta(key, value);
  }

  async saveMessage(row: StoredMessageRow): Promise<void> {
    const api = getApi();
    if (!api) return;
    await api.saveMessage(row);
  }

  async getMessages(roomId: string, limit = 200): Promise<StoredMessageRow[]> {
    const api = getApi();
    if (!api) return [];
    return api.getMessages(roomId, limit);
  }
}

export const dbClient = new DbClientImpl();
