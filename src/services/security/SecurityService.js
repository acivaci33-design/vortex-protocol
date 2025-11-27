/**
 * VORTEX Protocol - Security Service
 * Handles app locking, auto-delete, and secure data wiping
 */
import { EventEmitter } from 'eventemitter3';
import { db } from '../database';
import { identityService } from '../identity';
import _sodium from 'libsodium-wrappers';
class SecurityService extends EventEmitter {
    constructor() {
        super(...arguments);
        this.sodium = null;
        this.isLocked = false;
        this.lockTimer = null;
        this.pinHash = null;
        this.settings = {
            lockEnabled: false,
            lockMethod: 'pin',
            lockTimeout: 5,
            autoLockOnMinimize: true,
            hidePreviewsWhenLocked: true,
            screenCaptureAllowed: false,
            clipboardTimeout: 30,
        };
        this.lastActivity = Date.now();
        this.initialized = false;
    }
    async initialize() {
        if (this.initialized)
            return;
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
    async setupPin(pin) {
        if (!this.sodium)
            throw new Error('Not initialized');
        if (pin.length < 4)
            throw new Error('PIN must be at least 4 digits');
        // Hash PIN with Argon2
        const salt = this.sodium.randombytes_buf(this.sodium.crypto_pwhash_SALTBYTES);
        const hash = this.sodium.crypto_pwhash(32, pin, salt, this.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, this.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE, this.sodium.crypto_pwhash_ALG_DEFAULT);
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
    async verifyPin(pin) {
        if (!this.sodium || !this.pinHash)
            return false;
        try {
            const combined = this.sodium.from_base64(this.pinHash);
            const saltLength = this.sodium.crypto_pwhash_SALTBYTES;
            const salt = combined.slice(0, saltLength);
            const storedHash = combined.slice(saltLength);
            const testHash = this.sodium.crypto_pwhash(32, pin, salt, this.sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE, this.sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE, this.sodium.crypto_pwhash_ALG_DEFAULT);
            return this.sodium.memcmp(testHash, storedHash);
        }
        catch {
            return false;
        }
    }
    async changePin(currentPin, newPin) {
        const verified = await this.verifyPin(currentPin);
        if (!verified)
            throw new Error('Current PIN is incorrect');
        await this.setupPin(newPin);
        this.emit('pin-changed');
    }
    removePin() {
        this.pinHash = null;
        this.settings.lockEnabled = false;
        db.setSetting('security_pin_hash', '');
        this.saveSettings();
        this.emit('pin-removed');
    }
    lock() {
        if (!this.settings.lockEnabled)
            return;
        this.isLocked = true;
        this.clearLockTimer();
        this.emit('locked');
    }
    async unlock(pin) {
        if (!this.isLocked)
            return true;
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
    isAppLocked() {
        return this.isLocked;
    }
    isLockEnabled() {
        return this.settings.lockEnabled && this.pinHash !== null;
    }
    // ==================== Activity Monitoring ====================
    startActivityMonitoring() {
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
    recordActivity() {
        this.lastActivity = Date.now();
        this.resetLockTimer();
    }
    checkInactivity() {
        if (!this.settings.lockEnabled || this.isLocked)
            return;
        if (this.settings.lockTimeout === 0)
            return;
        const inactiveMinutes = (Date.now() - this.lastActivity) / 60000;
        if (inactiveMinutes >= this.settings.lockTimeout) {
            this.lock();
        }
    }
    resetLockTimer() {
        this.clearLockTimer();
        if (this.settings.lockEnabled && this.settings.lockTimeout > 0) {
            this.lockTimer = setTimeout(() => {
                this.lock();
            }, this.settings.lockTimeout * 60000);
        }
    }
    clearLockTimer() {
        if (this.lockTimer) {
            clearTimeout(this.lockTimer);
            this.lockTimer = null;
        }
    }
    // ==================== Disappearing Messages ====================
    setDisappearingMessages(conversationId, config) {
        const key = `disappearing_${conversationId}`;
        db.setSetting(key, JSON.stringify(config));
        this.emit('disappearing-changed', { conversationId, config });
    }
    getDisappearingMessages(conversationId) {
        const key = `disappearing_${conversationId}`;
        const stored = db.getSetting(key);
        if (stored) {
            try {
                return JSON.parse(stored);
            }
            catch {
                // Fall through to default
            }
        }
        return {
            enabled: false,
            timeout: this.settings.disappearingMessagesDefault || 86400, // 24 hours default
        };
    }
    // Process disappearing messages (call periodically)
    async processDisappearingMessages() {
        // This would iterate through messages and delete expired ones
        // For now, return 0 as implementation depends on message structure
        return 0;
    }
    // ==================== Secure Wipe ====================
    async secureWipe() {
        if (!this.sodium)
            throw new Error('Not initialized');
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
        }
        catch (error) {
            this.emit('wipe-failed', error);
            throw error;
        }
    }
    async secureDeleteConversation(conversationId) {
        db.deleteConversation(conversationId);
        this.emit('conversation-wiped', conversationId);
    }
    // ==================== Clipboard Security ====================
    async secureClipboardCopy(text) {
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
                    }
                    catch {
                        // Clipboard access may be denied
                    }
                }, this.settings.clipboardTimeout * 1000);
            }
        }
        catch (error) {
            throw new Error('Failed to copy to clipboard');
        }
    }
    // ==================== Settings ====================
    async loadSettings() {
        const stored = db.getSetting('security_settings');
        if (stored) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
            catch {
                // Use defaults
            }
        }
        const pinHash = db.getSetting('security_pin_hash');
        if (pinHash) {
            this.pinHash = pinHash;
        }
    }
    saveSettings() {
        db.setSetting('security_settings', JSON.stringify(this.settings));
    }
    updateSettings(updates) {
        this.settings = { ...this.settings, ...updates };
        this.saveSettings();
        // Reset lock timer if timeout changed
        if ('lockTimeout' in updates) {
            this.resetLockTimer();
        }
        this.emit('settings-changed', this.settings);
    }
    getSettings() {
        return { ...this.settings };
    }
    // ==================== Screen Capture Protection ====================
    setScreenCaptureAllowed(allowed) {
        this.settings.screenCaptureAllowed = allowed;
        this.saveSettings();
        // Note: Actual screen capture prevention requires native implementation
        // This setting is for the app to check before allowing screenshots
        this.emit('screen-capture-changed', allowed);
    }
    isScreenCaptureAllowed() {
        return this.settings.screenCaptureAllowed;
    }
}
// Singleton instance
export const securityService = new SecurityService();
export default securityService;
