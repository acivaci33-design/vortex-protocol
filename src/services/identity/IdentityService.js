/**
 * VORTEX Protocol - Identity Service
 * Manages user identity, key generation, and cryptographic operations
 */
import _sodium from 'libsodium-wrappers';
import { db } from '../database';
class IdentityService {
    constructor() {
        this.sodium = null;
        this.identity = null;
        this.keys = null;
        this.initialized = false;
    }
    async initialize() {
        if (this.initialized)
            return;
        await _sodium.ready;
        this.sodium = _sodium;
        // Initialize database
        await db.initialize();
        // Try to load existing identity
        this.identity = db.getUserIdentity();
        if (this.identity) {
            // Decrypt and restore keys
            await this.restoreKeys();
        }
        this.initialized = true;
        console.log('[Identity] Service initialized, hasIdentity:', !!this.identity);
    }
    hasIdentity() {
        return this.identity !== null;
    }
    getIdentity() {
        return this.identity;
    }
    getPublicKey() {
        return this.identity?.publicKey || null;
    }
    getDisplayName() {
        return this.identity?.displayName || 'Anonymous';
    }
    /**
     * Generate a new identity with cryptographic keys
     */
    async createIdentity(displayName, avatarUrl) {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        // Generate identity key pair (Ed25519 for signing)
        const identityKeyPair = this.sodium.crypto_sign_keypair();
        // Generate signed pre-key (X25519 for key agreement)
        const signedPreKeyPair = this.sodium.crypto_kx_keypair();
        // Generate one-time pre-keys
        const preKeys = [];
        for (let i = 0; i < 100; i++) {
            const kp = this.sodium.crypto_kx_keypair();
            preKeys.push({
                publicKey: kp.publicKey,
                privateKey: kp.privateKey,
            });
        }
        this.keys = {
            identity: {
                publicKey: identityKeyPair.publicKey,
                privateKey: identityKeyPair.privateKey,
            },
            signedPreKey: {
                publicKey: signedPreKeyPair.publicKey,
                privateKey: signedPreKeyPair.privateKey,
            },
            preKeys,
        };
        // Create identity object
        const id = this.generateId();
        const publicKeyHex = this.sodium.to_hex(identityKeyPair.publicKey);
        const now = Date.now();
        // Encrypt private keys for storage
        const encryptedKeys = await this.encryptKeys(this.keys);
        this.identity = {
            id,
            publicKey: publicKeyHex,
            privateKeyEncrypted: encryptedKeys,
            displayName,
            avatarUrl,
            createdAt: now,
            lastSeen: now,
        };
        // Save to database
        db.saveUserIdentity(this.identity);
        console.log('[Identity] Created new identity:', id);
        return this.identity;
    }
    /**
     * Update display name
     */
    updateDisplayName(displayName) {
        if (!this.identity)
            throw new Error('No identity');
        this.identity.displayName = displayName;
        this.identity.lastSeen = Date.now();
        db.saveUserIdentity(this.identity);
    }
    /**
     * Update avatar
     */
    updateAvatar(avatarUrl) {
        if (!this.identity)
            throw new Error('No identity');
        this.identity.avatarUrl = avatarUrl;
        this.identity.lastSeen = Date.now();
        db.saveUserIdentity(this.identity);
    }
    /**
     * Get fingerprint for identity verification
     */
    getFingerprint() {
        if (!this.identity || !this.sodium)
            return '';
        const publicKeyBytes = this.sodium.from_hex(this.identity.publicKey);
        const hash = this.sodium.crypto_generichash(32, publicKeyBytes);
        // Format as groups of 4 hex characters
        const hex = this.sodium.to_hex(hash).toUpperCase();
        const groups = hex.match(/.{1,4}/g) || [];
        return groups.slice(0, 8).join(' ');
    }
    /**
     * Export identity for sharing (public info only)
     */
    exportIdentity() {
        if (!this.identity)
            return null;
        return {
            id: this.identity.id,
            publicKey: this.identity.publicKey,
            displayName: this.identity.displayName,
            fingerprint: this.getFingerprint(),
        };
    }
    /**
     * Sign a message with identity key
     */
    sign(message) {
        if (!this.sodium || !this.keys)
            throw new Error('Not initialized');
        return this.sodium.crypto_sign_detached(message, this.keys.identity.privateKey);
    }
    /**
     * Verify a signature from a peer
     */
    verify(message, signature, publicKeyHex) {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        try {
            const publicKey = this.sodium.from_hex(publicKeyHex);
            return this.sodium.crypto_sign_verify_detached(signature, message, publicKey);
        }
        catch {
            return false;
        }
    }
    /**
     * Get identity key for X3DH key agreement
     */
    getIdentityKeyPair() {
        return this.keys?.identity || null;
    }
    /**
     * Get signed pre-key for X3DH
     */
    getSignedPreKey() {
        return this.keys?.signedPreKey || null;
    }
    /**
     * Get a one-time pre-key (removes it from available pool)
     */
    getOneTimePreKey() {
        if (!this.keys || this.keys.preKeys.length === 0)
            return null;
        const preKey = this.keys.preKeys.pop();
        // Re-encrypt and save updated keys
        this.saveKeys();
        return preKey;
    }
    /**
     * Generate more pre-keys if running low
     */
    async replenishPreKeys(count = 100) {
        if (!this.sodium || !this.keys)
            throw new Error('Not initialized');
        for (let i = 0; i < count; i++) {
            const kp = this.sodium.crypto_kx_keypair();
            this.keys.preKeys.push({
                publicKey: kp.publicKey,
                privateKey: kp.privateKey,
            });
        }
        await this.saveKeys();
    }
    /**
     * Perform X25519 key agreement
     */
    performKeyAgreement(ourPrivateKey, theirPublicKey) {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        return this.sodium.crypto_scalarmult(ourPrivateKey, theirPublicKey);
    }
    /**
     * Derive shared secret using HKDF
     */
    deriveSecret(sharedSecret, info, length = 32) {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        const infoBytes = this.sodium.from_string(info);
        const salt = new Uint8Array(32); // Zero salt for HKDF
        // Use crypto_kdf_derive_from_key as HKDF substitute
        const key = this.sodium.crypto_generichash(32, new Uint8Array([...sharedSecret, ...infoBytes, ...salt]));
        return key.slice(0, length);
    }
    // ==================== Private Methods ====================
    generateId() {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        const bytes = this.sodium.randombytes_buf(16);
        return this.sodium.to_hex(bytes);
    }
    async encryptKeys(keys) {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        // Serialize keys to JSON
        const keysData = {
            identity: {
                publicKey: this.sodium.to_base64(keys.identity.publicKey),
                privateKey: this.sodium.to_base64(keys.identity.privateKey),
            },
            signedPreKey: {
                publicKey: this.sodium.to_base64(keys.signedPreKey.publicKey),
                privateKey: this.sodium.to_base64(keys.signedPreKey.privateKey),
            },
            preKeys: keys.preKeys.map(kp => ({
                publicKey: this.sodium.to_base64(kp.publicKey),
                privateKey: this.sodium.to_base64(kp.privateKey),
            })),
        };
        // For now, we store keys encoded but not encrypted
        // In production, this should be encrypted with a user passphrase
        return btoa(JSON.stringify(keysData));
    }
    async decryptKeys(encrypted) {
        if (!this.sodium)
            throw new Error('Sodium not initialized');
        const keysData = JSON.parse(atob(encrypted));
        return {
            identity: {
                publicKey: this.sodium.from_base64(keysData.identity.publicKey),
                privateKey: this.sodium.from_base64(keysData.identity.privateKey),
            },
            signedPreKey: {
                publicKey: this.sodium.from_base64(keysData.signedPreKey.publicKey),
                privateKey: this.sodium.from_base64(keysData.signedPreKey.privateKey),
            },
            preKeys: keysData.preKeys.map((kp) => ({
                publicKey: this.sodium.from_base64(kp.publicKey),
                privateKey: this.sodium.from_base64(kp.privateKey),
            })),
        };
    }
    async restoreKeys() {
        if (!this.identity)
            return;
        try {
            this.keys = await this.decryptKeys(this.identity.privateKeyEncrypted);
            console.log('[Identity] Keys restored successfully');
        }
        catch (error) {
            console.error('[Identity] Failed to restore keys:', error);
            throw error;
        }
    }
    async saveKeys() {
        if (!this.identity || !this.keys)
            return;
        this.identity.privateKeyEncrypted = await this.encryptKeys(this.keys);
        db.saveUserIdentity(this.identity);
    }
    /**
     * Delete identity and all associated data
     */
    async deleteIdentity() {
        this.identity = null;
        this.keys = null;
        db.clearAll();
        console.log('[Identity] Identity deleted');
    }
}
// Singleton instance
export const identityService = new IdentityService();
export default identityService;
