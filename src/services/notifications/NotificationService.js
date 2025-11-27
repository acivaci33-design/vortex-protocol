/**
 * VORTEX Protocol - Notification Service
 * Handles desktop notifications, sounds, and badge management
 */
import { EventEmitter } from 'eventemitter3';
class NotificationService extends EventEmitter {
    constructor() {
        super(...arguments);
        this.permission = 'default';
        this.soundsEnabled = true;
        this.notificationsEnabled = true;
        this.doNotDisturb = false;
        this.audioContext = null;
        this.soundBuffers = new Map();
        this.unreadCount = 0;
    }
    async initialize() {
        // Check notification permission
        if ('Notification' in window) {
            this.permission = Notification.permission;
            if (this.permission === 'default') {
                this.permission = await Notification.requestPermission();
            }
        }
        // Initialize audio context for sounds
        try {
            this.audioContext = new AudioContext();
            await this.loadSounds();
        }
        catch (error) {
            console.warn('[Notifications] Audio context not available:', error);
        }
        console.log('[Notifications] Service initialized, permission:', this.permission);
    }
    // ==================== Permission Management ====================
    async requestPermission() {
        if (!('Notification' in window))
            return false;
        this.permission = await Notification.requestPermission();
        return this.permission === 'granted';
    }
    hasPermission() {
        return this.permission === 'granted';
    }
    // ==================== Notification Display ====================
    async show(options) {
        if (!this.notificationsEnabled || this.doNotDisturb) {
            return;
        }
        // Try Electron API first
        if (window.electronAPI?.notifications) {
            try {
                await window.electronAPI.notifications.show({
                    title: options.title,
                    body: options.body,
                    silent: options.silent,
                });
                return;
            }
            catch (error) {
                console.warn('[Notifications] Electron notification failed:', error);
            }
        }
        // Fallback to web notifications
        if (this.permission === 'granted') {
            try {
                const notification = new Notification(options.title, {
                    body: options.body,
                    icon: options.icon || '/icon.png',
                    tag: options.tag,
                    silent: options.silent,
                    requireInteraction: options.requireInteraction,
                    data: options.data,
                });
                notification.onclick = () => {
                    window.focus();
                    this.emit('notification-clicked', options.data);
                    notification.close();
                };
            }
            catch (error) {
                console.error('[Notifications] Failed to show notification:', error);
            }
        }
    }
    showMessage(senderName, content, conversationId) {
        this.show({
            title: senderName,
            body: content.length > 100 ? content.substring(0, 100) + '...' : content,
            tag: conversationId || 'message',
            data: { type: 'message', conversationId },
        });
        if (!this.doNotDisturb) {
            this.playSound('message');
        }
    }
    showCall(callerName, isVideo) {
        this.show({
            title: isVideo ? 'Incoming Video Call' : 'Incoming Call',
            body: callerName,
            tag: 'call',
            requireInteraction: true,
            data: { type: 'call', callerName, isVideo },
        });
        if (!this.doNotDisturb) {
            this.playSound('call');
        }
    }
    // ==================== Sound Management ====================
    async loadSounds() {
        if (!this.audioContext)
            return;
        // Generate simple notification sounds using Web Audio API
        const sounds = {
            message: { frequency: 800, duration: 0.1 },
            call: { frequency: 600, duration: 0.5 },
            notification: { frequency: 700, duration: 0.15 },
            sent: { frequency: 1000, duration: 0.05 },
            error: { frequency: 300, duration: 0.2 },
        };
        for (const [name, config] of Object.entries(sounds)) {
            try {
                const buffer = this.generateTone(config.frequency, config.duration);
                this.soundBuffers.set(name, buffer);
            }
            catch (error) {
                console.warn(`[Notifications] Failed to generate sound: ${name}`, error);
            }
        }
    }
    generateTone(frequency, duration) {
        if (!this.audioContext)
            throw new Error('No audio context');
        const sampleRate = this.audioContext.sampleRate;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            // Sine wave with envelope
            const envelope = Math.min(1, 10 * t) * Math.min(1, 5 * (duration - t));
            data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
        }
        return buffer;
    }
    playSound(sound) {
        if (!this.soundsEnabled || this.doNotDisturb || !this.audioContext)
            return;
        const buffer = this.soundBuffers.get(sound);
        if (!buffer)
            return;
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start();
        }
        catch (error) {
            console.warn('[Notifications] Failed to play sound:', error);
        }
    }
    setSoundsEnabled(enabled) {
        this.soundsEnabled = enabled;
    }
    isSoundsEnabled() {
        return this.soundsEnabled;
    }
    // ==================== Settings ====================
    setNotificationsEnabled(enabled) {
        this.notificationsEnabled = enabled;
    }
    isNotificationsEnabled() {
        return this.notificationsEnabled;
    }
    setDoNotDisturb(enabled) {
        this.doNotDisturb = enabled;
        this.emit('dnd-changed', enabled);
    }
    isDoNotDisturb() {
        return this.doNotDisturb;
    }
    // ==================== Badge Management ====================
    setBadgeCount(count) {
        this.unreadCount = count;
        // Update Electron badge
        if (window.electronAPI?.notifications?.setBadgeCount) {
            window.electronAPI.notifications.setBadgeCount(count);
        }
        // Update document title
        if (count > 0) {
            document.title = `(${count}) VORTEX`;
        }
        else {
            document.title = 'VORTEX';
        }
        this.emit('badge-changed', count);
    }
    incrementBadge() {
        this.setBadgeCount(this.unreadCount + 1);
    }
    decrementBadge() {
        this.setBadgeCount(Math.max(0, this.unreadCount - 1));
    }
    clearBadge() {
        this.setBadgeCount(0);
        if (window.electronAPI?.notifications) {
            window.electronAPI.notifications.clearBadge();
        }
    }
    getBadgeCount() {
        return this.unreadCount;
    }
    // ==================== Schedule ====================
    scheduleNotification(options, delay) {
        return setTimeout(() => this.show(options), delay);
    }
    // ==================== Cleanup ====================
    closeAll() {
        // Close all notifications - for web notifications this closes by tag
        if ('Notification' in window) {
            // Web notifications don't have a global close API
            // They close automatically or by user interaction
        }
    }
}
// Singleton instance
export const notificationService = new NotificationService();
export default notificationService;
