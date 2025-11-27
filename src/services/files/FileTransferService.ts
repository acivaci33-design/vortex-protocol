/**
 * VORTEX Protocol - File Transfer Service
 * Handles encrypted file transfer over P2P connections
 */

import { EventEmitter } from 'eventemitter3';
import { connectionManager, type PeerMessage } from '../p2p';
import { identityService } from '../identity';
import _sodium from 'libsodium-wrappers';

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  chunks: number;
  checksum: string;
}

export interface FileTransfer {
  id: string;
  peerId: string;
  direction: 'send' | 'receive';
  metadata: FileMetadata;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface TransferProgress {
  transferId: string;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  speed: number; // bytes per second
}

const CHUNK_SIZE = 64 * 1024; // 64KB chunks

class FileTransferService extends EventEmitter {
  private sodium: typeof _sodium | null = null;
  private transfers: Map<string, FileTransfer> = new Map();
  private receivingBuffers: Map<string, Uint8Array[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await _sodium.ready;
    this.sodium = _sodium;

    this.setupEventHandlers();
    this.initialized = true;
    console.log('[FileTransfer] Service initialized');
  }

  private setupEventHandlers(): void {
    connectionManager.on('file-meta', this.handleFileMetadata.bind(this));
    connectionManager.on('file-chunk', this.handleFileChunk.bind(this));
  }

  // ==================== Sending Files ====================

  async sendFile(peerId: string, file: File): Promise<string> {
    if (!this.sodium) throw new Error('Not initialized');

    const transferId = crypto.randomUUID();
    const chunks = Math.ceil(file.size / CHUNK_SIZE);

    // Calculate checksum
    const fileBuffer = await file.arrayBuffer();
    const checksum = this.sodium.to_hex(
      this.sodium.crypto_generichash(32, new Uint8Array(fileBuffer))
    );

    const metadata: FileMetadata = {
      id: transferId,
      name: file.name,
      size: file.size,
      type: file.type,
      chunks,
      checksum,
    };

    const transfer: FileTransfer = {
      id: transferId,
      peerId,
      direction: 'send',
      metadata,
      progress: 0,
      status: 'pending',
      startedAt: Date.now(),
    };

    this.transfers.set(transferId, transfer);

    // Send metadata first
    const sent = connectionManager.sendToPeer(peerId, {
      type: 'file-meta',
      id: crypto.randomUUID(),
      payload: metadata,
      timestamp: Date.now(),
    });

    if (!sent) {
      transfer.status = 'failed';
      transfer.error = 'Peer not connected';
      this.emit('transfer-failed', transfer);
      return transferId;
    }

    // Start sending chunks
    transfer.status = 'transferring';
    this.emit('transfer-started', transfer);

    await this.sendChunks(peerId, transferId, new Uint8Array(fileBuffer));

    return transferId;
  }

  private async sendChunks(peerId: string, transferId: string, data: Uint8Array): Promise<void> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    const chunks = Math.ceil(data.length / CHUNK_SIZE);
    let bytesSent = 0;
    const startTime = Date.now();

    for (let i = 0; i < chunks; i++) {
      if (transfer.status === 'cancelled') {
        this.emit('transfer-cancelled', transfer);
        return;
      }

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.length);
      const chunk = data.slice(start, end);

      // Encrypt chunk
      const encryptedChunk = this.encryptChunk(chunk);

      const sent = connectionManager.sendToPeer(peerId, {
        type: 'file-chunk',
        id: crypto.randomUUID(),
        payload: {
          transferId,
          chunkIndex: i,
          totalChunks: chunks,
          data: this.sodium!.to_base64(encryptedChunk),
        },
        timestamp: Date.now(),
      });

      if (!sent) {
        transfer.status = 'failed';
        transfer.error = 'Failed to send chunk';
        this.emit('transfer-failed', transfer);
        return;
      }

      bytesSent += chunk.length;
      transfer.progress = Math.round((bytesSent / data.length) * 100);

      // Calculate speed
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const speed = elapsedSeconds > 0 ? bytesSent / elapsedSeconds : 0;

      this.emit('transfer-progress', {
        transferId,
        progress: transfer.progress,
        bytesTransferred: bytesSent,
        totalBytes: data.length,
        speed,
      } as TransferProgress);

      // Small delay to prevent overwhelming the connection
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    transfer.status = 'completed';
    transfer.progress = 100;
    transfer.completedAt = Date.now();
    this.emit('transfer-completed', transfer);
  }

  // ==================== Receiving Files ====================

  private handleFileMetadata(data: { peerId: string } & FileMetadata): void {
    const { peerId, ...metadata } = data;

    const transfer: FileTransfer = {
      id: metadata.id,
      peerId,
      direction: 'receive',
      metadata,
      progress: 0,
      status: 'pending',
      startedAt: Date.now(),
    };

    this.transfers.set(metadata.id, transfer);
    this.receivingBuffers.set(metadata.id, []);

    // Emit event to ask user for confirmation
    this.emit('transfer-request', transfer);
  }

  acceptTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.direction !== 'receive') return;

    transfer.status = 'transferring';
    this.emit('transfer-started', transfer);
  }

  rejectTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    transfer.status = 'cancelled';
    this.transfers.delete(transferId);
    this.receivingBuffers.delete(transferId);
    this.emit('transfer-rejected', transfer);
  }

  private handleFileChunk(data: {
    peerId: string;
    transferId: string;
    chunkIndex: number;
    totalChunks: number;
    data: string;
  }): void {
    const { transferId, chunkIndex, totalChunks, data: chunkData } = data;

    const transfer = this.transfers.get(transferId);
    if (!transfer || transfer.status !== 'transferring') return;

    const buffer = this.receivingBuffers.get(transferId);
    if (!buffer) return;

    try {
      // Decrypt chunk
      const encryptedChunk = this.sodium!.from_base64(chunkData);
      const decryptedChunk = this.decryptChunk(encryptedChunk);

      buffer[chunkIndex] = decryptedChunk;

      // Update progress
      const receivedChunks = buffer.filter(c => c !== undefined).length;
      transfer.progress = Math.round((receivedChunks / totalChunks) * 100);

      this.emit('transfer-progress', {
        transferId,
        progress: transfer.progress,
        bytesTransferred: receivedChunks * CHUNK_SIZE,
        totalBytes: transfer.metadata.size,
        speed: 0, // Could calculate based on timing
      } as TransferProgress);

      // Check if complete
      if (receivedChunks === totalChunks) {
        this.completeReceive(transferId);
      }
    } catch (error) {
      transfer.status = 'failed';
      transfer.error = 'Failed to process chunk';
      this.emit('transfer-failed', transfer);
    }
  }

  private async completeReceive(transferId: string): Promise<void> {
    const transfer = this.transfers.get(transferId);
    const buffer = this.receivingBuffers.get(transferId);
    if (!transfer || !buffer) return;

    // Combine chunks
    const totalSize = buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of buffer) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Verify checksum
    const checksum = this.sodium!.to_hex(
      this.sodium!.crypto_generichash(32, combined)
    );

    if (checksum !== transfer.metadata.checksum) {
      transfer.status = 'failed';
      transfer.error = 'Checksum mismatch';
      this.emit('transfer-failed', transfer);
      return;
    }

    transfer.status = 'completed';
    transfer.progress = 100;
    transfer.completedAt = Date.now();

    // Create blob and emit
    const blob = new Blob([combined], { type: transfer.metadata.type });
    this.emit('transfer-completed', transfer, blob);

    // Cleanup
    this.receivingBuffers.delete(transferId);
  }

  // ==================== Encryption ====================

  private encryptChunk(chunk: Uint8Array): Uint8Array {
    if (!this.sodium) throw new Error('Sodium not initialized');

    // Simple XChaCha20-Poly1305 encryption
    // In production, use keys derived from the ratchet
    const key = this.sodium.randombytes_buf(this.sodium.crypto_secretbox_KEYBYTES);
    const nonce = this.sodium.randombytes_buf(this.sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = this.sodium.crypto_secretbox_easy(chunk, nonce, key);

    // Combine key + nonce + ciphertext (simplified - real impl would use key agreement)
    const result = new Uint8Array(key.length + nonce.length + ciphertext.length);
    result.set(key, 0);
    result.set(nonce, key.length);
    result.set(ciphertext, key.length + nonce.length);

    return result;
  }

  private decryptChunk(encrypted: Uint8Array): Uint8Array {
    if (!this.sodium) throw new Error('Sodium not initialized');

    const keyLength = this.sodium.crypto_secretbox_KEYBYTES;
    const nonceLength = this.sodium.crypto_secretbox_NONCEBYTES;

    const key = encrypted.slice(0, keyLength);
    const nonce = encrypted.slice(keyLength, keyLength + nonceLength);
    const ciphertext = encrypted.slice(keyLength + nonceLength);

    return this.sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  }

  // ==================== Transfer Management ====================

  cancelTransfer(transferId: string): void {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    transfer.status = 'cancelled';
    this.emit('transfer-cancelled', transfer);

    // Cleanup
    this.receivingBuffers.delete(transferId);
  }

  getTransfer(transferId: string): FileTransfer | null {
    return this.transfers.get(transferId) || null;
  }

  getAllTransfers(): FileTransfer[] {
    return Array.from(this.transfers.values());
  }

  getActiveTransfers(): FileTransfer[] {
    return this.getAllTransfers().filter(
      t => t.status === 'pending' || t.status === 'transferring'
    );
  }

  clearCompletedTransfers(): void {
    for (const [id, transfer] of this.transfers) {
      if (transfer.status === 'completed' || transfer.status === 'cancelled') {
        this.transfers.delete(id);
      }
    }
  }

  // ==================== Utilities ====================

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatTransferSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  estimateTimeRemaining(transfer: FileTransfer, speed: number): string {
    if (speed === 0) return 'Calculating...';

    const bytesRemaining = transfer.metadata.size * (1 - transfer.progress / 100);
    const secondsRemaining = bytesRemaining / speed;

    if (secondsRemaining < 60) {
      return `${Math.round(secondsRemaining)}s remaining`;
    } else if (secondsRemaining < 3600) {
      return `${Math.round(secondsRemaining / 60)}m remaining`;
    } else {
      return `${Math.round(secondsRemaining / 3600)}h remaining`;
    }
  }
}

// Singleton instance
export const fileTransferService = new FileTransferService();
export default fileTransferService;
