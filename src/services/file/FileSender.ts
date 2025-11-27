import { CryptoService } from '../CryptoService';

export interface FileSendProgress {
  fileId: string;
  sentBytes: number;
  totalBytes: number;
  speedBps: number;
  done: boolean;
}

export class FileSender {
  private idx = 0;
  private sentBytes = 0;
  private paused = false;
  private inFlight = 0;
  private lastTickBytes = 0;
  private lastTickAt = Date.now();

  constructor(
    private peer: any,
    private sessionKey: Uint8Array,
    private file: File,
    private chunkSize = 16 * 1024,
    private window = 64,
    private onProgress?: (p: FileSendProgress) => void
  ) {}

  async start(): Promise<void> {
    const fileId = crypto.randomUUID();
    const meta = {
      t: 'file_meta' as const,
      fileId,
      name: this.file.name,
      size: this.file.size,
      mime: this.file.type || 'application/octet-stream',
      totalChunks: Math.ceil(this.file.size / this.chunkSize),
      chunkSize: this.chunkSize,
    };
    this.peer.send(JSON.stringify(meta));
    await this.pump(fileId);
  }

  pause() { this.paused = true; }
  resume() { if (this.paused) { this.paused = false; void this.pump(); } }
  cancel() { this.paused = true; }

  private async pump(fileId?: string) {
    const id = fileId ?? '';
    while (!this.paused && this.idx * this.chunkSize < this.file.size) {
      if (this.inFlight >= this.window) { await this.sleep(2); continue; }
      const start = this.idx * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const buf = new Uint8Array(await this.file.slice(start, end).arrayBuffer());
      const cipher = CryptoService.encryptBytes(buf, this.sessionKey);
      const packet = {
        t: 'file_chunk' as const,
        fileId: id,
        idx: this.idx,
        n: CryptoService.encode(cipher.nonce),
        c: CryptoService.encode(cipher.payload),
      };
      this.peer.send(JSON.stringify(packet));
      this.idx += 1;
      this.inFlight += 1;
      this.sentBytes += buf.byteLength;
      const now = Date.now();
      if (now - this.lastTickAt >= 500) {
        const deltaB = this.sentBytes - this.lastTickBytes;
        const deltaT = (now - this.lastTickAt) / 1000;
        this.lastTickBytes = this.sentBytes; this.lastTickAt = now;
        this.onProgress?.({ fileId: id, sentBytes: this.sentBytes, totalBytes: this.file.size, speedBps: deltaB / deltaT, done: false });
      }
      await this.sleep(0);
    }
    if (this.idx * this.chunkSize >= this.file.size) {
      const endMsg = { t: 'file_complete' as const, fileId: id };
      this.peer.send(JSON.stringify(endMsg));
      this.onProgress?.({ fileId: id, sentBytes: this.file.size, totalBytes: this.file.size, speedBps: 0, done: true });
    }
  }

  ack() {
    if (this.inFlight > 0) this.inFlight -= 1;
  }

  private sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
}
