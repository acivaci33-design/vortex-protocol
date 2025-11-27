/**
 * VORTEX Protocol - Contact Service
 * Manages contacts, verification, and contact-related operations
 */

import { EventEmitter } from 'eventemitter3';
import { db, type Contact } from '../database';
import { identityService } from '../identity';
import _sodium from 'libsodium-wrappers';

export interface AddContactOptions {
  identityKey: string;
  displayName: string;
  avatarUrl?: string;
  notes?: string;
}

export interface ContactVerification {
  contactId: string;
  fingerprint: string;
  verified: boolean;
  verifiedAt?: number;
}

class ContactService extends EventEmitter {
  private sodium: typeof _sodium | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await _sodium.ready;
    this.sodium = _sodium;
    this.initialized = true;
    console.log('[Contacts] Service initialized');
  }

  // ==================== Contact Management ====================

  async addContact(options: AddContactOptions): Promise<Contact> {
    if (!this.sodium) throw new Error('Not initialized');

    const { identityKey, displayName, avatarUrl, notes } = options;

    // Validate identity key
    if (!this.isValidIdentityKey(identityKey)) {
      throw new Error('Invalid identity key');
    }

    // Check if contact already exists
    const existing = db.getContactByIdentityKey(identityKey);
    if (existing) {
      throw new Error('Contact already exists');
    }

    // Create contact
    const contact: Contact = {
      id: crypto.randomUUID(),
      identityKey,
      displayName,
      avatarUrl,
      notes,
      verified: false,
      blocked: false,
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };

    db.saveContact(contact);
    this.emit('contact-added', contact);

    return contact;
  }

  updateContact(id: string, updates: Partial<Omit<Contact, 'id' | 'identityKey' | 'createdAt'>>): Contact {
    const contact = db.getContact(id);
    if (!contact) throw new Error('Contact not found');

    const updated: Contact = {
      ...contact,
      ...updates,
      lastSeen: Date.now(),
    };

    db.saveContact(updated);
    this.emit('contact-updated', updated);

    return updated;
  }

  deleteContact(id: string): void {
    const contact = db.getContact(id);
    if (!contact) return;

    db.deleteContact(id);
    this.emit('contact-deleted', id);
  }

  getContact(id: string): Contact | null {
    return db.getContact(id);
  }

  getContactByKey(identityKey: string): Contact | null {
    return db.getContactByIdentityKey(identityKey);
  }

  getAllContacts(): Contact[] {
    return db.getAllContacts();
  }

  // ==================== Blocking ====================

  blockContact(id: string): void {
    this.updateContact(id, { blocked: true });
    this.emit('contact-blocked', id);
  }

  unblockContact(id: string): void {
    this.updateContact(id, { blocked: false });
    this.emit('contact-unblocked', id);
  }

  isBlocked(id: string): boolean {
    const contact = db.getContact(id);
    return contact?.blocked ?? false;
  }

  // ==================== Verification ====================

  getContactFingerprint(identityKey: string): string {
    if (!this.sodium) return '';

    try {
      const keyBytes = this.sodium.from_hex(identityKey);
      const hash = this.sodium.crypto_generichash(32, keyBytes);
      
      // Format as groups of 4 hex characters
      const hex = this.sodium.to_hex(hash).toUpperCase();
      const groups = hex.match(/.{1,4}/g) || [];
      return groups.slice(0, 8).join(' ');
    } catch {
      return '';
    }
  }

  verifySafetyNumber(contactId: string): ContactVerification {
    const contact = db.getContact(contactId);
    if (!contact) throw new Error('Contact not found');

    const myIdentity = identityService.getIdentity();
    if (!myIdentity) throw new Error('No identity');

    // Generate combined fingerprint
    const myFingerprint = identityService.getFingerprint();
    const theirFingerprint = this.getContactFingerprint(contact.identityKey);

    // Sort to ensure both parties get same result
    const sortedFingerprints = [myFingerprint, theirFingerprint].sort();
    const combinedFingerprint = sortedFingerprints.join(' ');

    return {
      contactId,
      fingerprint: combinedFingerprint,
      verified: contact.verified,
      verifiedAt: contact.verified ? contact.lastSeen : undefined,
    };
  }

  markAsVerified(id: string): void {
    this.updateContact(id, { verified: true });
    this.emit('contact-verified', id);
  }

  markAsUnverified(id: string): void {
    this.updateContact(id, { verified: false });
    this.emit('contact-unverified', id);
  }

  // ==================== Search ====================

  searchContacts(query: string): Contact[] {
    if (!query.trim()) return this.getAllContacts();

    const normalizedQuery = query.toLowerCase().trim();
    const contacts = this.getAllContacts();

    return contacts.filter(contact => 
      contact.displayName.toLowerCase().includes(normalizedQuery) ||
      contact.identityKey.toLowerCase().includes(normalizedQuery) ||
      contact.notes?.toLowerCase().includes(normalizedQuery)
    );
  }

  // ==================== Import/Export ====================

  exportContact(id: string): string | null {
    const contact = db.getContact(id);
    if (!contact) return null;

    const exportData = {
      identityKey: contact.identityKey,
      displayName: contact.displayName,
      fingerprint: this.getContactFingerprint(contact.identityKey),
    };

    return btoa(JSON.stringify(exportData));
  }

  async importContact(data: string): Promise<Contact> {
    try {
      const parsed = JSON.parse(atob(data));
      
      if (!parsed.identityKey || !parsed.displayName) {
        throw new Error('Invalid contact data');
      }

      return this.addContact({
        identityKey: parsed.identityKey,
        displayName: parsed.displayName,
      });
    } catch (error) {
      throw new Error('Failed to import contact');
    }
  }

  // ==================== QR Code ====================

  generateContactQR(): string {
    const identity = identityService.getIdentity();
    if (!identity) throw new Error('No identity');

    const data = {
      type: 'vortex-contact',
      version: 1,
      identityKey: identity.publicKey,
      displayName: identity.displayName,
    };

    return JSON.stringify(data);
  }

  async parseContactQR(qrData: string): Promise<AddContactOptions> {
    try {
      const parsed = JSON.parse(qrData);

      if (parsed.type !== 'vortex-contact') {
        throw new Error('Invalid QR code type');
      }

      return {
        identityKey: parsed.identityKey,
        displayName: parsed.displayName,
      };
    } catch {
      throw new Error('Invalid QR code');
    }
  }

  // ==================== Utilities ====================

  private isValidIdentityKey(key: string): boolean {
    if (!this.sodium) return false;

    try {
      const bytes = this.sodium.from_hex(key);
      return bytes.length === 32; // Ed25519 public key
    } catch {
      return false;
    }
  }

  getContactCount(): number {
    return this.getAllContacts().length;
  }

  getVerifiedCount(): number {
    return this.getAllContacts().filter(c => c.verified).length;
  }
}

// Singleton instance
export const contactService = new ContactService();
export default contactService;
