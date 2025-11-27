/**
 * VORTEX Protocol - Services Module
 * Central export for all services
 */
// Database
export { db } from './database';
// Identity
export { identityService } from './identity';
// P2P Connection
export { connectionManager } from './p2p';
// Messaging
export { messagingService } from './messaging';
// Contacts
export { contactService } from './contacts';
// Notifications
export { notificationService } from './notifications';
// File Transfer
export { fileTransferService } from './files';
// Calls
export { callService } from './calls';
// Security
export { securityService } from './security';
// Crypto (existing)
export { CryptoService } from './CryptoService';
