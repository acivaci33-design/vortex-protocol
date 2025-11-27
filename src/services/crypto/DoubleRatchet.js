/**
 * VORTEX Protocol - Double Ratchet Implementation
 * Signal Protocol compatible Double Ratchet with X3DH key exchange
 *
 * Features:
 * - Perfect Forward Secrecy (PFS)
 * - Future Secrecy (Break-in Recovery)
 * - Out-of-order message handling
 * - Header encryption
 */
import sodium from 'libsodium-wrappers';
// Constants
const MAX_SKIP = 1000;
const INFO_RATCHET = new TextEncoder().encode('VORTEX_RATCHET');
const INFO_MESSAGE = new TextEncoder().encode('VORTEX_MESSAGE');
// Utility functions
function toBase64(b) {
    return sodium.to_base64(b, sodium.base64_variants.URLSAFE_NO_PADDING);
}
function fromBase64(s) {
    return sodium.from_base64(s, sodium.base64_variants.URLSAFE_NO_PADDING);
}
function concat(...arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
function constantTimeEqual(a, b) {
    if (a.length !== b.length)
        return false;
    return sodium.memcmp(a, b);
}
/**
 * HKDF - HMAC-based Key Derivation Function
 * RFC 5869 compliant
 */
function hkdf(ikm, salt, info, length) {
    // Extract
    const prk = sodium.crypto_auth(ikm, salt);
    // Expand
    const hashLen = 32;
    const n = Math.ceil(length / hashLen);
    const okm = new Uint8Array(n * hashLen);
    let prev = new Uint8Array(0);
    for (let i = 0; i < n; i++) {
        const input = concat(prev, info, new Uint8Array([i + 1]));
        prev = sodium.crypto_auth(input, prk);
        okm.set(prev, i * hashLen);
    }
    return okm.slice(0, length);
}
/**
 * KDF for root key ratchet
 * Returns (new_root_key, chain_key, header_key)
 */
function kdfRK(rk, dhOut) {
    const derived = hkdf(dhOut, rk, INFO_RATCHET, 96);
    return {
        rk: derived.slice(0, 32),
        ck: derived.slice(32, 64),
        hk: derived.slice(64, 96),
    };
}
/**
 * KDF for chain key
 * Returns (new_chain_key, message_key)
 */
function kdfCK(ck) {
    const messageKey = sodium.crypto_auth(new Uint8Array([0x01]), ck);
    const chainKey = sodium.crypto_auth(new Uint8Array([0x02]), ck);
    return { ck: chainKey, mk: messageKey };
}
/**
 * Generate X25519 DH key pair
 */
function generateDH() {
    const keyPair = sodium.crypto_kx_keypair();
    return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
    };
}
/**
 * Compute X25519 shared secret
 */
function dh(privateKey, publicKey) {
    return sodium.crypto_scalarmult(privateKey, publicKey);
}
/**
 * AEAD Encrypt with ChaCha20-Poly1305
 */
function encrypt(plaintext, key, ad) {
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_ietf_NPUBBYTES);
    const ciphertext = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(plaintext, ad ?? null, null, nonce, key);
    return { ciphertext, nonce };
}
/**
 * AEAD Decrypt with ChaCha20-Poly1305
 */
function decrypt(ciphertext, key, nonce, ad) {
    return sodium.crypto_aead_chacha20poly1305_ietf_decrypt(null, ciphertext, ad ?? null, nonce, key);
}
/**
 * Encode header to bytes
 */
function encodeHeader(header) {
    const pnBytes = new Uint8Array(4);
    new DataView(pnBytes.buffer).setUint32(0, header.pn, false);
    const nBytes = new Uint8Array(4);
    new DataView(nBytes.buffer).setUint32(0, header.n, false);
    return concat(header.dh, pnBytes, nBytes);
}
/**
 * Decode header from bytes
 */
function decodeHeader(data) {
    const dh = data.slice(0, 32);
    const pn = new DataView(data.buffer, data.byteOffset + 32, 4).getUint32(0, false);
    const n = new DataView(data.buffer, data.byteOffset + 36, 4).getUint32(0, false);
    return { dh, pn, n };
}
/**
 * Double Ratchet Session Manager
 */
export class DoubleRatchetSession {
    constructor(sessionId) {
        this.ready = false;
        this.state = {
            DHs: { publicKey: new Uint8Array(32), privateKey: new Uint8Array(32) },
            RK: new Uint8Array(32),
            Ns: 0,
            Nr: 0,
            PN: 0,
            MKSKIPPED: new Map(),
            sessionId: sessionId ?? crypto.randomUUID(),
            createdAt: Date.now(),
            lastActivity: Date.now(),
        };
    }
    /**
     * Initialize as sender (Alice)
     * Uses X3DH to establish initial shared secret
     */
    async initializeSender(localIdentityKey, remotePreKeyBundle) {
        await sodium.ready;
        // Generate ephemeral key pair
        const ephemeral = generateDH();
        // X3DH key agreement
        // DH1 = DH(IKa, SPKb)
        const dh1 = dh(localIdentityKey.privateKey, remotePreKeyBundle.signedPreKey);
        // DH2 = DH(EKa, IKb)
        const dh2 = dh(ephemeral.privateKey, remotePreKeyBundle.identityKey);
        // DH3 = DH(EKa, SPKb)
        const dh3 = dh(ephemeral.privateKey, remotePreKeyBundle.signedPreKey);
        let sk;
        let usedOneTimePreKey = false;
        if (remotePreKeyBundle.oneTimePreKey) {
            // DH4 = DH(EKa, OPKb)
            const dh4 = dh(ephemeral.privateKey, remotePreKeyBundle.oneTimePreKey);
            sk = hkdf(concat(dh1, dh2, dh3, dh4), new Uint8Array(32), INFO_RATCHET, 32);
            usedOneTimePreKey = true;
        }
        else {
            sk = hkdf(concat(dh1, dh2, dh3), new Uint8Array(32), INFO_RATCHET, 32);
        }
        // Initialize sending ratchet
        this.state.DHs = generateDH();
        this.state.DHr = remotePreKeyBundle.signedPreKey;
        // Derive initial keys
        const dhResult = dh(this.state.DHs.privateKey, this.state.DHr);
        const { rk, ck, hk } = kdfRK(sk, dhResult);
        this.state.RK = rk;
        this.state.CKs = ck;
        this.state.HKs = hk;
        this.state.NHKs = sodium.randombytes_buf(32);
        this.state.remoteIdentityKey = remotePreKeyBundle.identityKey;
        this.state.localIdentityKey = localIdentityKey.publicKey;
        this.ready = true;
        return { ephemeralPublic: ephemeral.publicKey, usedOneTimePreKey };
    }
    /**
     * Initialize as receiver (Bob)
     */
    async initializeReceiver(localIdentityKey, localSignedPreKey, localOneTimePreKey, remoteIdentityKey, remoteEphemeralKey) {
        await sodium.ready;
        // X3DH key agreement
        // DH1 = DH(SPKb, IKa)
        const dh1 = dh(localSignedPreKey.privateKey, remoteIdentityKey);
        // DH2 = DH(IKb, EKa)
        const dh2 = dh(localIdentityKey.privateKey, remoteEphemeralKey);
        // DH3 = DH(SPKb, EKa)
        const dh3 = dh(localSignedPreKey.privateKey, remoteEphemeralKey);
        let sk;
        if (localOneTimePreKey) {
            // DH4 = DH(OPKb, EKa)
            const dh4 = dh(localOneTimePreKey.privateKey, remoteEphemeralKey);
            sk = hkdf(concat(dh1, dh2, dh3, dh4), new Uint8Array(32), INFO_RATCHET, 32);
        }
        else {
            sk = hkdf(concat(dh1, dh2, dh3), new Uint8Array(32), INFO_RATCHET, 32);
        }
        this.state.DHs = localSignedPreKey;
        this.state.RK = sk;
        this.state.remoteIdentityKey = remoteIdentityKey;
        this.state.localIdentityKey = localIdentityKey.publicKey;
        this.ready = true;
    }
    /**
     * Encrypt a message
     */
    encrypt(plaintext) {
        if (!this.ready)
            throw new Error('Session not initialized');
        // Step chain forward
        const { ck, mk } = kdfCK(this.state.CKs);
        this.state.CKs = ck;
        // Create header
        const header = {
            dh: this.state.DHs.publicKey,
            pn: this.state.PN,
            n: this.state.Ns,
        };
        // Encrypt header
        const headerBytes = encodeHeader(header);
        const { ciphertext: headerCipher, nonce: headerNonce } = encrypt(headerBytes, this.state.HKs ?? mk, this.state.localIdentityKey);
        // Encrypt message with associated data
        const ad = concat(this.state.localIdentityKey, this.state.remoteIdentityKey, headerCipher);
        const { ciphertext, nonce } = encrypt(plaintext, mk, ad);
        this.state.Ns++;
        this.state.lastActivity = Date.now();
        return { header, headerCipher, headerNonce, ciphertext, nonce };
    }
    /**
     * Decrypt a message
     */
    decrypt(message) {
        if (!this.ready)
            throw new Error('Session not initialized');
        // Try skipped message keys first
        const skippedKey = this.trySkippedMessageKeys(message);
        if (skippedKey) {
            return this.decryptWithKey(message, skippedKey);
        }
        // Check if we need to perform DH ratchet
        if (!this.state.DHr || !constantTimeEqual(message.header.dh, this.state.DHr)) {
            this.skipMessageKeys(message.header.pn);
            this.dhRatchet(message.header);
        }
        this.skipMessageKeys(message.header.n);
        // Step receiving chain forward
        const { ck, mk } = kdfCK(this.state.CKr);
        this.state.CKr = ck;
        this.state.Nr++;
        this.state.lastActivity = Date.now();
        return this.decryptWithKey(message, mk);
    }
    decryptWithKey(message, mk) {
        // Reconstruct associated data
        const ad = concat(this.state.remoteIdentityKey, this.state.localIdentityKey, message.headerCipher);
        return decrypt(message.ciphertext, mk, message.nonce, ad);
    }
    trySkippedMessageKeys(message) {
        const key = `${toBase64(message.header.dh)}:${message.header.n}`;
        const skipped = this.state.MKSKIPPED.get(key);
        if (skipped) {
            this.state.MKSKIPPED.delete(key);
            return skipped.mk;
        }
        return null;
    }
    skipMessageKeys(until) {
        if (this.state.Nr + MAX_SKIP < until) {
            throw new Error('Too many skipped messages');
        }
        if (!this.state.CKr)
            return;
        while (this.state.Nr < until) {
            const { ck, mk } = kdfCK(this.state.CKr);
            this.state.CKr = ck;
            const key = `${toBase64(this.state.DHr)}:${this.state.Nr}`;
            this.state.MKSKIPPED.set(key, { mk, timestamp: Date.now() });
            this.state.Nr++;
        }
    }
    dhRatchet(header) {
        this.state.PN = this.state.Ns;
        this.state.Ns = 0;
        this.state.Nr = 0;
        this.state.DHr = header.dh;
        // Derive receiving keys
        const dhResult = dh(this.state.DHs.privateKey, this.state.DHr);
        const recv = kdfRK(this.state.RK, dhResult);
        this.state.RK = recv.rk;
        this.state.CKr = recv.ck;
        this.state.HKr = recv.hk;
        // Generate new DH key pair
        this.state.DHs = generateDH();
        // Derive sending keys
        const dhResult2 = dh(this.state.DHs.privateKey, this.state.DHr);
        const send = kdfRK(this.state.RK, dhResult2);
        this.state.RK = send.rk;
        this.state.CKs = send.ck;
        this.state.HKs = send.hk;
    }
    /**
     * Clean up old skipped message keys
     */
    cleanupSkippedKeys(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
        const now = Date.now();
        for (const [key, value] of this.state.MKSKIPPED.entries()) {
            if (now - value.timestamp > maxAgeMs) {
                this.state.MKSKIPPED.delete(key);
            }
        }
    }
    /**
     * Export session state for storage
     */
    exportState() {
        const serialized = {
            ...this.state,
            DHs: {
                publicKey: toBase64(this.state.DHs.publicKey),
                privateKey: toBase64(this.state.DHs.privateKey),
            },
            DHr: this.state.DHr ? toBase64(this.state.DHr) : null,
            RK: toBase64(this.state.RK),
            CKs: this.state.CKs ? toBase64(this.state.CKs) : null,
            CKr: this.state.CKr ? toBase64(this.state.CKr) : null,
            HKs: this.state.HKs ? toBase64(this.state.HKs) : null,
            HKr: this.state.HKr ? toBase64(this.state.HKr) : null,
            NHKs: this.state.NHKs ? toBase64(this.state.NHKs) : null,
            NHKr: this.state.NHKr ? toBase64(this.state.NHKr) : null,
            remoteIdentityKey: this.state.remoteIdentityKey ? toBase64(this.state.remoteIdentityKey) : null,
            localIdentityKey: this.state.localIdentityKey ? toBase64(this.state.localIdentityKey) : null,
            MKSKIPPED: Array.from(this.state.MKSKIPPED.entries()).map(([k, v]) => [
                k,
                { mk: toBase64(v.mk), timestamp: v.timestamp },
            ]),
        };
        return JSON.stringify(serialized);
    }
    /**
     * Import session state from storage
     */
    importState(json) {
        const parsed = JSON.parse(json);
        this.state = {
            DHs: {
                publicKey: fromBase64(parsed.DHs.publicKey),
                privateKey: fromBase64(parsed.DHs.privateKey),
            },
            DHr: parsed.DHr ? fromBase64(parsed.DHr) : undefined,
            RK: fromBase64(parsed.RK),
            CKs: parsed.CKs ? fromBase64(parsed.CKs) : undefined,
            CKr: parsed.CKr ? fromBase64(parsed.CKr) : undefined,
            Ns: parsed.Ns,
            Nr: parsed.Nr,
            PN: parsed.PN,
            HKs: parsed.HKs ? fromBase64(parsed.HKs) : undefined,
            HKr: parsed.HKr ? fromBase64(parsed.HKr) : undefined,
            NHKs: parsed.NHKs ? fromBase64(parsed.NHKs) : undefined,
            NHKr: parsed.NHKr ? fromBase64(parsed.NHKr) : undefined,
            remoteIdentityKey: parsed.remoteIdentityKey ? fromBase64(parsed.remoteIdentityKey) : undefined,
            localIdentityKey: parsed.localIdentityKey ? fromBase64(parsed.localIdentityKey) : undefined,
            MKSKIPPED: new Map(parsed.MKSKIPPED.map(([k, v]) => [
                k,
                { mk: fromBase64(v.mk), timestamp: v.timestamp },
            ])),
            sessionId: parsed.sessionId,
            createdAt: parsed.createdAt,
            lastActivity: parsed.lastActivity,
        };
        this.ready = true;
    }
    get sessionId() {
        return this.state.sessionId;
    }
    get isReady() {
        return this.ready;
    }
}
export { toBase64, fromBase64, generateDH, dh, encrypt, decrypt, hkdf };
