/**
 * VORTEX Protocol - Identity & PreKey Manager
 * Manages long-term identity keys, signed pre-keys, and one-time pre-keys
 */

import sodium from 'libsodium-wrappers';
import type { KeyPair, Bytes, Base64, PreKeyBundle } from './DoubleRatchet';
import { toBase64, fromBase64, generateDH } from './DoubleRatchet';

export interface IdentityStore {
  identityKeyPair: KeyPair;
  registrationId: number;
  signedPreKey: SignedPreKey;
  oneTimePreKeys: OneTimePreKey[];
  createdAt: number;
  fingerprint: string;
}

export interface SignedPreKey {
  keyId: number;
  keyPair: KeyPair;
  signature: Bytes;
  timestamp: number;
}

export interface OneTimePreKey {
  keyId: number;
  keyPair: KeyPair;
  used: boolean;
}

// Ed25519 signing key pair from X25519
function generateSigningKeyPair(): { publicKey: Bytes; privateKey: Bytes } {
  const keyPair = sodium.crypto_sign_keypair();
  return { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
}

// Sign data with Ed25519
function sign(message: Bytes, privateKey: Bytes): Bytes {
  return sodium.crypto_sign_detached(message, privateKey);
}

// Verify Ed25519 signature
function verify(message: Bytes, signature: Bytes, publicKey: Bytes): boolean {
  try {
    return sodium.crypto_sign_verify_detached(signature, message, publicKey);
  } catch {
    return false;
  }
}

// Generate fingerprint from public key (for verification)
function generateFingerprint(publicKey: Bytes): string {
  const hash = sodium.crypto_generichash(32, publicKey);
  const hex = sodium.to_hex(hash);
  // Format as groups of 4 characters
  return hex.match(/.{1,4}/g)?.join(' ') ?? hex;
}

// Securely generate registration ID
function generateRegistrationId(): number {
  const bytes = sodium.randombytes_buf(4);
  const view = new DataView(bytes.buffer);
  return Math.abs(view.getInt32(0, true)) % 16380 + 1; // 1-16380 range
}

/**
 * Identity Manager - Handles all identity-related crypto operations
 */
export class IdentityManager {
  private store: IdentityStore | null = null;
  private signingKeyPair: { publicKey: Bytes; privateKey: Bytes } | null = null;
  private ready = false;
  
  async initialize(): Promise<void> {
    await sodium.ready;
    this.ready = true;
  }
  
  /**
   * Generate new identity (first-time setup)
   */
  async generateIdentity(): Promise<IdentityStore> {
    if (!this.ready) await this.initialize();
    
    // Generate identity key pair
    const identityKeyPair = generateDH();
    
    // Generate signing key pair (for pre-key signatures)
    this.signingKeyPair = generateSigningKeyPair();
    
    // Generate registration ID
    const registrationId = generateRegistrationId();
    
    // Generate signed pre-key
    const signedPreKey = this.generateSignedPreKey(1);
    
    // Generate initial batch of one-time pre-keys
    const oneTimePreKeys = this.generateOneTimePreKeys(100, 1);
    
    // Create fingerprint
    const fingerprint = generateFingerprint(identityKeyPair.publicKey);
    
    this.store = {
      identityKeyPair,
      registrationId,
      signedPreKey,
      oneTimePreKeys,
      createdAt: Date.now(),
      fingerprint,
    };
    
    return this.store;
  }
  
  /**
   * Generate a new signed pre-key
   */
  generateSignedPreKey(keyId: number): SignedPreKey {
    if (!this.signingKeyPair) {
      this.signingKeyPair = generateSigningKeyPair();
    }
    
    const keyPair = generateDH();
    const signature = sign(keyPair.publicKey, this.signingKeyPair.privateKey);
    
    return {
      keyId,
      keyPair,
      signature,
      timestamp: Date.now(),
    };
  }
  
  /**
   * Generate batch of one-time pre-keys
   */
  generateOneTimePreKeys(count: number, startId: number): OneTimePreKey[] {
    const keys: OneTimePreKey[] = [];
    for (let i = 0; i < count; i++) {
      keys.push({
        keyId: startId + i,
        keyPair: generateDH(),
        used: false,
      });
    }
    return keys;
  }
  
  /**
   * Get pre-key bundle for sharing with others
   */
  getPreKeyBundle(): PreKeyBundle | null {
    if (!this.store) return null;
    
    // Find an unused one-time pre-key
    const unusedOtpk = this.store.oneTimePreKeys.find(k => !k.used);
    
    return {
      identityKey: this.store.identityKeyPair.publicKey,
      signedPreKey: this.store.signedPreKey.keyPair.publicKey,
      signedPreKeySig: this.store.signedPreKey.signature,
      oneTimePreKey: unusedOtpk?.keyPair.publicKey,
      registrationId: this.store.registrationId,
    };
  }
  
  /**
   * Mark one-time pre-key as used
   */
  markOneTimePreKeyUsed(publicKey: Bytes): void {
    if (!this.store) return;
    
    const key = this.store.oneTimePreKeys.find(
      k => sodium.memcmp(k.keyPair.publicKey, publicKey)
    );
    
    if (key) {
      key.used = true;
    }
    
    // Check if we need to replenish
    const unusedCount = this.store.oneTimePreKeys.filter(k => !k.used).length;
    if (unusedCount < 20) {
      const maxId = Math.max(...this.store.oneTimePreKeys.map(k => k.keyId));
      const newKeys = this.generateOneTimePreKeys(50, maxId + 1);
      this.store.oneTimePreKeys.push(...newKeys);
    }
  }
  
  /**
   * Get one-time pre-key by public key
   */
  getOneTimePreKey(publicKey: Bytes): OneTimePreKey | null {
    if (!this.store) return null;
    
    return this.store.oneTimePreKeys.find(
      k => sodium.memcmp(k.keyPair.publicKey, publicKey)
    ) ?? null;
  }
  
  /**
   * Rotate signed pre-key (recommended every 7-30 days)
   */
  rotateSignedPreKey(): SignedPreKey {
    if (!this.store) throw new Error('Identity not initialized');
    
    const newKeyId = this.store.signedPreKey.keyId + 1;
    const newSignedPreKey = this.generateSignedPreKey(newKeyId);
    this.store.signedPreKey = newSignedPreKey;
    
    return newSignedPreKey;
  }
  
  /**
   * Verify a pre-key bundle signature
   */
  verifyPreKeyBundle(bundle: PreKeyBundle, signingPublicKey: Bytes): boolean {
    return verify(bundle.signedPreKey, bundle.signedPreKeySig, signingPublicKey);
  }
  
  /**
   * Get identity fingerprint for verification
   */
  getFingerprint(): string {
    return this.store?.fingerprint ?? '';
  }
  
  /**
   * Compare fingerprints for safety number verification
   */
  computeSafetyNumber(theirIdentityKey: Bytes): string {
    if (!this.store) throw new Error('Identity not initialized');
    
    // Combine both identity keys deterministically
    const combined = this.store.identityKeyPair.publicKey < theirIdentityKey
      ? new Uint8Array([...this.store.identityKeyPair.publicKey, ...theirIdentityKey])
      : new Uint8Array([...theirIdentityKey, ...this.store.identityKeyPair.publicKey]);
    
    // Hash to get safety number
    const hash = sodium.crypto_generichash(32, combined);
    
    // Convert to numeric groups (like Signal)
    const numbers: string[] = [];
    for (let i = 0; i < 6; i++) {
      const chunk = (hash[i * 5] << 32) | (hash[i * 5 + 1] << 24) | 
                    (hash[i * 5 + 2] << 16) | (hash[i * 5 + 3] << 8) | 
                    hash[i * 5 + 4];
      numbers.push(String(Math.abs(chunk) % 100000).padStart(5, '0'));
    }
    
    return numbers.join(' ');
  }
  
  /**
   * Export identity for backup (encrypted with password)
   */
  async exportIdentity(password: string): Promise<string> {
    if (!this.store) throw new Error('Identity not initialized');
    
    const serialized = JSON.stringify({
      identityKeyPair: {
        publicKey: toBase64(this.store.identityKeyPair.publicKey),
        privateKey: toBase64(this.store.identityKeyPair.privateKey),
      },
      registrationId: this.store.registrationId,
      signedPreKey: {
        keyId: this.store.signedPreKey.keyId,
        keyPair: {
          publicKey: toBase64(this.store.signedPreKey.keyPair.publicKey),
          privateKey: toBase64(this.store.signedPreKey.keyPair.privateKey),
        },
        signature: toBase64(this.store.signedPreKey.signature),
        timestamp: this.store.signedPreKey.timestamp,
      },
      oneTimePreKeys: this.store.oneTimePreKeys.map(k => ({
        keyId: k.keyId,
        keyPair: {
          publicKey: toBase64(k.keyPair.publicKey),
          privateKey: toBase64(k.keyPair.privateKey),
        },
        used: k.used,
      })),
      createdAt: this.store.createdAt,
      fingerprint: this.store.fingerprint,
      signingKeyPair: this.signingKeyPair ? {
        publicKey: toBase64(this.signingKeyPair.publicKey),
        privateKey: toBase64(this.signingKeyPair.privateKey),
      } : null,
    });
    
    // Derive key from password
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const key = sodium.crypto_pwhash(
      32,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    
    // Encrypt
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_chacha20poly1305_ietf_NPUBBYTES);
    const ciphertext = sodium.crypto_aead_chacha20poly1305_ietf_encrypt(
      new TextEncoder().encode(serialized),
      null,
      null,
      nonce,
      key
    );
    
    return JSON.stringify({
      v: 1, // version
      salt: toBase64(salt),
      nonce: toBase64(nonce),
      data: toBase64(ciphertext),
    });
  }
  
  /**
   * Import identity from backup
   */
  async importIdentity(backup: string, password: string): Promise<IdentityStore> {
    if (!this.ready) await this.initialize();
    
    const { v, salt, nonce, data } = JSON.parse(backup);
    if (v !== 1) throw new Error('Unsupported backup version');
    
    // Derive key from password
    const key = sodium.crypto_pwhash(
      32,
      password,
      fromBase64(salt),
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    
    // Decrypt
    const plaintext = sodium.crypto_aead_chacha20poly1305_ietf_decrypt(
      null,
      fromBase64(data),
      null,
      fromBase64(nonce),
      key
    );
    
    const parsed = JSON.parse(new TextDecoder().decode(plaintext));
    
    // Restore signing key pair
    if (parsed.signingKeyPair) {
      this.signingKeyPair = {
        publicKey: fromBase64(parsed.signingKeyPair.publicKey),
        privateKey: fromBase64(parsed.signingKeyPair.privateKey),
      };
    }
    
    // Restore identity store
    this.store = {
      identityKeyPair: {
        publicKey: fromBase64(parsed.identityKeyPair.publicKey),
        privateKey: fromBase64(parsed.identityKeyPair.privateKey),
      },
      registrationId: parsed.registrationId,
      signedPreKey: {
        keyId: parsed.signedPreKey.keyId,
        keyPair: {
          publicKey: fromBase64(parsed.signedPreKey.keyPair.publicKey),
          privateKey: fromBase64(parsed.signedPreKey.keyPair.privateKey),
        },
        signature: fromBase64(parsed.signedPreKey.signature),
        timestamp: parsed.signedPreKey.timestamp,
      },
      oneTimePreKeys: parsed.oneTimePreKeys.map((k: any) => ({
        keyId: k.keyId,
        keyPair: {
          publicKey: fromBase64(k.keyPair.publicKey),
          privateKey: fromBase64(k.keyPair.privateKey),
        },
        used: k.used,
      })),
      createdAt: parsed.createdAt,
      fingerprint: parsed.fingerprint,
    };
    
    return this.store;
  }
  
  /**
   * Get identity key pair
   */
  getIdentityKeyPair(): KeyPair | null {
    return this.store?.identityKeyPair ?? null;
  }
  
  /**
   * Get signed pre-key pair
   */
  getSignedPreKeyPair(): KeyPair | null {
    return this.store?.signedPreKey.keyPair ?? null;
  }
  
  /**
   * Get signing public key
   */
  getSigningPublicKey(): Bytes | null {
    return this.signingKeyPair?.publicKey ?? null;
  }
  
  /**
   * Check if identity is initialized
   */
  get isInitialized(): boolean {
    return this.store !== null;
  }
  
  /**
   * Get registration ID
   */
  get registrationId(): number {
    return this.store?.registrationId ?? 0;
  }
}

export const identityManager = new IdentityManager();
