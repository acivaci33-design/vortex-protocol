/**
 * VORTEX Protocol - Services Module
 * Central export for all services
 */

// Database
export { db } from './database';
export type { 
  UserIdentity, 
  Contact, 
  Conversation, 
  Message, 
  CryptoSession,
  Setting,
  PendingMessage 
} from './database';

// Identity
export { identityService } from './identity';
export type { KeyPair, IdentityKeys, ExportedIdentity } from './identity';

// P2P Connection
export { connectionManager } from './p2p';
export type { 
  PeerConnection, 
  SignalData, 
  PeerMessage, 
  ConnectionStatus 
} from './p2p';

// Messaging
export { messagingService } from './messaging';
export type { SendMessageOptions, ReceivedMessage, TypingState } from './messaging';

// Contacts
export { contactService } from './contacts';
export type { AddContactOptions, ContactVerification } from './contacts';

// Notifications
export { notificationService } from './notifications';
export type { NotificationOptions, NotificationSound } from './notifications';

// File Transfer
export { fileTransferService } from './files';
export type { FileMetadata, FileTransfer, TransferProgress } from './files';

// Calls
export { callService } from './calls';
export type { CallType, CallStatus, CallEndReason, CallParticipant, ActiveCall, CallSettings } from './calls';

// Security
export { securityService } from './security';
export type { LockMethod, SecuritySettings, DisappearingMessageConfig } from './security';

// Crypto (existing)
export { CryptoService } from './CryptoService';
