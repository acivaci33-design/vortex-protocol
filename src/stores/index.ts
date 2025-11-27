/**
 * VORTEX Protocol - Store Exports
 * Central export for all Zustand stores
 */

export { useAuthStore, resetAutoLockTimer, startAutoLockTimer } from './authStore';
export type { AuthStatus, UserProfile } from './authStore';

export { useChatStore } from './chatStore';
export type {
  MessageType,
  MessageStatus,
  Reaction,
  MessageAttachment,
  Message,
  TypingIndicator,
  Draft,
  ConversationType,
  Participant,
  Conversation,
} from './chatStore';

export { usePeerStore } from './peerStore';
export type {
  ConnectionStatus,
  CallStatus,
  IceCandidate,
  PeerConnection,
  ActiveCall,
  SignalingState,
  MediaState,
} from './peerStore';

export { useSettingsStore } from './settingsStore';
export type {
  Theme,
  Language,
  FontSize,
  MessageDensity,
  AppearanceSettings,
  PrivacySettings,
  NotificationSettings,
  MediaSettings,
  ChatSettings,
  NetworkSettings,
  StorageSettings,
  KeyboardShortcuts,
} from './settingsStore';
