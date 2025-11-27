import { CryptoService } from '../CryptoService';
export class FileReceiver {
    constructor(fileId, name, size, mime, totalChunks, chunkSize, sessionKey, onProgress, onComplete) {
        this.fileId = fileId;
        this.name = name;
        this.size = size;
        this.mime = mime;
        this.totalChunks = totalChunks;
        this.chunkSize = chunkSize;
        this.sessionKey = sessionKey;
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.received = 0;
        this.chunks = new Array(totalChunks);
    }
    async push(idx, nonceB64, payloadB64) {
        const plain = CryptoService.decryptBytes({ nonce: CryptoService.decode(nonceB64), payload: CryptoService.decode(payloadB64) }, this.sessionKey);
        this.chunks[idx] = plain;
        this.received += plain.byteLength;
        this.onProgress?.(this.received, this.size);
    }
    async assemble() {
        const out = new Uint8Array(this.size);
        let offset = 0;
        for (let i = 0; i < this.totalChunks; i++) {
            const ch = this.chunks[i];
            if (!ch)
                throw new Error('missing chunk ' + i);
            out.set(ch, offset);
            offset += ch.byteLength;
        }
        const blob = new Blob([out], { type: this.mime });
        this.onComplete?.(blob);
    }
}
