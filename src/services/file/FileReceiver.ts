import { CryptoService } from '../CryptoService';

export class FileReceiver {
  private chunks: Uint8Array[];
  private received = 0;

  constructor(
    public fileId: string,
    public name: string,
    public size: number,
    public mime: string,
    public totalChunks: number,
    public chunkSize: number,
    private sessionKey: Uint8Array,
    private onProgress?: (receivedBytes: number, totalBytes: number) => void,
    private onComplete?: (blob: Blob) => void
  ) {
    this.chunks = new Array<Uint8Array>(totalChunks);
  }

  async push(idx: number, nonceB64: string, payloadB64: string): Promise<void> {
    const plain = CryptoService.decryptBytes({ nonce: CryptoService.decode(nonceB64), payload: CryptoService.decode(payloadB64) }, this.sessionKey);
    this.chunks[idx] = plain;
    this.received += plain.byteLength;
    this.onProgress?.(this.received, this.size);
  }

  async assemble(): Promise<void> {
    const out = new Uint8Array(this.size);
    let offset = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      const ch = this.chunks[i];
      if (!ch) throw new Error('missing chunk ' + i);
      out.set(ch, offset); offset += ch.byteLength;
    }
    const blob = new Blob([out], { type: this.mime });
    this.onComplete?.(blob);
  }
}
