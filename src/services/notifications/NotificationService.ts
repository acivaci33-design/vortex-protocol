/**
 * VORTEX Protocol - Notification Service
 * Handles desktop notifications, sounds, and badge management
 */

import { EventEmitter } from 'eventemitter3';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  requireInteraction?: boolean;
  data?: any;
}

export type NotificationSound = 'message' | 'call' | 'notification' | 'sent' | 'error';

class NotificationService extends EventEmitter {
  private permission: NotificationPermission = 'default';
  private soundsEnabled = true;
  private notificationsEnabled = true;
  private doNotDisturb = false;
  private audioContext: AudioContext | null = null;
  private soundBuffers: Map<NotificationSound, AudioBuffer> = new Map();
  private unreadCount = 0;

  async initialize(): Promise<void> {
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
    } catch (error) {
      console.warn('[Notifications] Audio context not available:', error);
    }

    console.log('[Notifications] Service initialized, permission:', this.permission);
  }

  // ==================== Permission Management ====================

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;

    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  hasPermission(): boolean {
    return this.permission === 'granted';
  }

  // ==================== Notification Display ====================

  async show(options: NotificationOptions): Promise<void> {
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
      } catch (error) {
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
      } catch (error) {
        console.error('[Notifications] Failed to show notification:', error);
      }
    }
  }

  showMessage(senderName: string, content: string, conversationId?: string): void {
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

  showCall(callerName: string, isVideo: boolean): void {
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

  private async loadSounds(): Promise<void> {
    if (!this.audioContext) return;

    // Generate simple notification sounds using Web Audio API
    const sounds: Record<NotificationSound, { frequency: number; duration: number }> = {
      message: { frequency: 800, duration: 0.1 },
      call: { frequency: 600, duration: 0.5 },
      notification: { frequency: 700, duration: 0.15 },
      sent: { frequency: 1000, duration: 0.05 },
      error: { frequency: 300, duration: 0.2 },
    };

    for (const [name, config] of Object.entries(sounds)) {
      try {
        const buffer = this.generateTone(config.frequency, config.duration);
        this.soundBuffers.set(name as NotificationSound, buffer);
      } catch (error) {
        console.warn(`[Notifications] Failed to generate sound: ${name}`, error);
      }
    }
  }

  private generateTone(frequency: number, duration: number): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');

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

  playSound(sound: NotificationSound): void {
    if (!this.soundsEnabled || this.doNotDisturb || !this.audioContext) return;

    const buffer = this.soundBuffers.get(sound);
    if (!buffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.warn('[Notifications] Failed to play sound:', error);
    }
  }

  setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;
  }

  isSoundsEnabled(): boolean {
    return this.soundsEnabled;
  }

  // ==================== Settings ====================

  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  isNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  setDoNotDisturb(enabled: boolean): void {
    this.doNotDisturb = enabled;
    this.emit('dnd-changed', enabled);
  }

  isDoNotDisturb(): boolean {
    return this.doNotDisturb;
  }

  // ==================== Badge Management ====================

  setBadgeCount(count: number): void {
    this.unreadCount = count;

    // Update Electron badge
    if (window.electronAPI?.notifications?.setBadgeCount) {
      window.electronAPI.notifications.setBadgeCount(count);
    }

    // Update document title
    if (count > 0) {
      document.title = `(${count}) VORTEX`;
    } else {
      document.title = 'VORTEX';
    }

    this.emit('badge-changed', count);
  }

  incrementBadge(): void {
    this.setBadgeCount(this.unreadCount + 1);
  }

  decrementBadge(): void {
    this.setBadgeCount(Math.max(0, this.unreadCount - 1));
  }

  clearBadge(): void {
    this.setBadgeCount(0);
    
    if (window.electronAPI?.notifications) {
      window.electronAPI.notifications.clearBadge();
    }
  }

  getBadgeCount(): number {
    return this.unreadCount;
  }

  // ==================== Schedule ====================

  scheduleNotification(options: NotificationOptions, delay: number): NodeJS.Timeout {
    return setTimeout(() => this.show(options), delay);
  }

  // ==================== Cleanup ====================

  closeAll(): void {
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
