/**
 * VORTEX Protocol - Security Service
 * Handles app locking, auto-delete, and secure data wiping
 */

import { EventEmitter } from 'eventemitter3';
import { db } from '../database';
import { identityService } from '../identity';
import _sodium from 'libsodium-wrappers';

export type LockMethod = 'pin' | 'password' | 'biometric';

export interface SecuritySettings {
  lockEnabled: boolean;
  lockMethod: LockMethod;
  lockTimeout: number; // minutes, 0 = never
  autoLockOnMinimize: boolean;
  hidePreviewsWhenLocked: boolean;
  disappearingMessagesDefault?: number; // seconds
  screenCaptureAllowed: boolean;
  clipboardTimeout: number; // seconds, 0 = never
}

export interface DisappearingMessageConfig {
  enabled: boolean;
  timeout: number; // seconds
}

class SecurityService extends EventEmitter {
  private sodium: typeof _sodium | null = null;
  private isLocked = false;
  private lockTimer: NodeJS.Timeout | null = null;
  private pinHash: string | null = null;
  private settings: SecuritySettings = {
    lockEnabled: false,
    lockMethod: 'pin',
    lockTimeout: 5,
    autoLockOnMinimize: true,
    hidePreviewsWhenLocked: true,
    screenCaptureAllowed: false,
    clipboardTimeout: 30,
  };
  private lastActivity = Date.now();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await _sodium.ready;
    this.sodium = _sodium;

    // Load settings from database
    await this.loadSettings();

    // Start activity monitoring
    this.startActivityMonitoring();

    this.initialized = true;
    console.log('[Security] Service initialized');
  }

  // ==================== App Locking ====================

  async setupPin(pin: string): Promise<void> {
    if (!this.sodium) throw new Error('Not initialized');
    if (pin.length < 4) throw new Error('PIN must be at least 4 digits');

    // Hash PIN with Argon2
    const salt = this.sodium.randombytes_buf(this.sodium.crypto_pwhash_SALTBYTES);
    const hash = this.sodium.crypto_pwhash(
      32,
      pin,
      salt,
      this.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      this.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      this.sodium.crypto_pwhash_ALG_DEFAULT
    );

    // Store hash and salt
    const combined = new Uint8Array(salt.length + hash.length);
    combined.set(salt, 0);
    combined.set(hash, salt.length);

    this.pinHash = this.sodium.to_base64(combined);
    db.setSetting('security_pin_hash', this.pinHash);
    
    this.settings.lockEnabled = true;
    this.saveSettings();

    this.emit('pin-set');
  }

  async verifyPin(pin: string): Promise<boolean> {
    if (!this.sodium || !this.pinHash) return false;

    try {
      const combined = this.sodium.from_base64(this.pinHash);
      const saltLength = this.sodium.crypto_pwhash_SALTBYTES;
      const salt = combined.slice(0, saltLength);
      const storedHash = combined.slice(saltLength);

      const testHash = this.sodium.crypto_pwhash(
        32,
        pin,
        salt,
        this.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        this.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        this.sodium.crypto_pwhash_ALG_DEFAULT
      );

      return this.sodium.memcmp(testHash, storedHash);
    } catch {
      return false;
    }
  }

  async changePin(currentPin: string, newPin: string): Promise<void> {
    const verified = await this.verifyPin(currentPin);
    if (!verified) throw new Error('Current PIN is incorrect');

    await this.setupPin(newPin);
    this.emit('pin-changed');
  }

  removePin(): void {
    this.pinHash = null;
    this.settings.lockEnabled = false;
    db.setSetting('security_pin_hash', '');
    this.saveSettings();
    this.emit('pin-removed');
  }

  lock(): void {
    if (!this.settings.lockEnabled) return;

    this.isLocked = true;
    this.clearLockTimer();
    this.emit('locked');
  }

  async unlock(pin: string): Promise<boolean> {
    if (!this.isLocked) return true;

    const verified = await this.verifyPin(pin);
    if (verified) {
      this.isLocked = false;
      this.resetLockTimer();
      this.emit('unlocked');
      return true;
    }

    this.emit('unlock-failed');
    return false;
  }

  isAppLocked(): boolean {
    return this.isLocked;
  }

  isLockEnabled(): boolean {
    return this.settings.lockEnabled && this.pinHash !== null;
  }

  // ==================== Activity Monitoring ====================

  private startActivityMonitoring(): void {
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
        window.addEventListener(event, () => this.recordActivity(), { passive: true });
      });

      // Check for inactivity periodically
      setInterval(() => this.checkInactivity(), 30000);

      // Handle window visibility
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.settings.autoLockOnMinimize) {
          this.lock();
        }
      });
    }
  }

  recordActivity(): void {
    this.lastActivity = Date.now();
    this.resetLockTimer();
  }

  private checkInactivity(): void {
    if (!this.settings.lockEnabled || this.isLocked) return;
    if (this.settings.lockTimeout === 0) return;

    const inactiveMinutes = (Date.now() - this.lastActivity) / 60000;
    if (inactiveMinutes >= this.settings.lockTimeout) {
      this.lock();
    }
  }

  private resetLockTimer(): void {
    this.clearLockTimer();

    if (this.settings.lockEnabled && this.settings.lockTimeout > 0) {
      this.lockTimer = setTimeout(() => {
        this.lock();
      }, this.settings.lockTimeout * 60000);
    }
  }

  private clearLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
  }

  // ==================== Disappearing Messages ====================

  setDisappearingMessages(conversationId: string, config: DisappearingMessageConfig): void {
    const key = `disappearing_${conversationId}`;
    db.setSetting(key, JSON.stringify(config));
    this.emit('disappearing-changed', { conversationId, config });
  }

  getDisappearingMessages(conversationId: string): DisappearingMessageConfig {
    const key = `disappearing_${conversationId}`;
    const stored = db.getSetting(key);
    
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to default
      }
    }

    return {
      enabled: false,
      timeout: this.settings.disappearingMessagesDefault || 86400, // 24 hours default
    };
  }

  // Process disappearing messages (call periodically)
  async processDisappearingMessages(): Promise<number> {
    // This would iterate through messages and delete expired ones
    // For now, return 0 as implementation depends on message structure
    return 0;
  }

  // ==================== Secure Wipe ====================

  async secureWipe(): Promise<void> {
    if (!this.sodium) throw new Error('Not initialized');

    this.emit('wipe-started');

    try {
      // Clear database
      db.clearAll();

      // Clear localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }

      // Clear sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // Clear identity
      await identityService.deleteIdentity();

      // Clear any cached data in memory
      this.pinHash = null;
      this.isLocked = false;

      this.emit('wipe-completed');
      
      // Force reload
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      this.emit('wipe-failed', error);
      throw error;
    }
  }

  async secureDeleteConversation(conversationId: string): Promise<void> {
    db.deleteConversation(conversationId);
    this.emit('conversation-wiped', conversationId);
  }

  // ==================== Clipboard Security ====================

  async secureClipboardCopy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);

      // Auto-clear clipboard after timeout
      if (this.settings.clipboardTimeout > 0) {
        setTimeout(async () => {
          try {
            const current = await navigator.clipboard.readText();
            if (current === text) {
              await navigator.clipboard.writeText('');
            }
          } catch {
            // Clipboard access may be denied
          }
        }, this.settings.clipboardTimeout * 1000);
      }
    } catch (error) {
      throw new Error('Failed to copy to clipboard');
    }
  }

  // ==================== Settings ====================

  private async loadSettings(): Promise<void> {
    const stored = db.getSetting('security_settings');
    if (stored) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      } catch {
        // Use defaults
      }
    }

    const pinHash = db.getSetting('security_pin_hash');
    if (pinHash) {
      this.pinHash = pinHash;
    }
  }

  private saveSettings(): void {
    db.setSetting('security_settings', JSON.stringify(this.settings));
  }

  updateSettings(updates: Partial<SecuritySettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    
    // Reset lock timer if timeout changed
    if ('lockTimeout' in updates) {
      this.resetLockTimer();
    }

    this.emit('settings-changed', this.settings);
  }

  getSettings(): SecuritySettings {
    return { ...this.settings };
  }

  // ==================== Screen Capture Protection ====================

  setScreenCaptureAllowed(allowed: boolean): void {
    this.settings.screenCaptureAllowed = allowed;
    this.saveSettings();

    // Note: Actual screen capture prevention requires native implementation
    // This setting is for the app to check before allowing screenshots
    this.emit('screen-capture-changed', allowed);
  }

  isScreenCaptureAllowed(): boolean {
    return this.settings.screenCaptureAllowed;
  }
}

// Singleton instance
export const securityService = new SecurityService();
export default securityService;
