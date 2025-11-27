# VORTEX Protocol

<div align="center">
  <img src="docs/logo.png" alt="VORTEX Protocol" width="120" />
  
  **Enterprise-Grade End-to-End Encrypted Communication Platform**
  
  [![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)
  [![Electron](https://img.shields.io/badge/Electron-31.x-47848F?logo=electron&logoColor=white)](https://electronjs.org/)
  [![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

## Overview

VORTEX Protocol is a privacy-focused, end-to-end encrypted communication platform built with modern web technologies. It provides secure messaging, voice/video calls, and file sharing with military-grade encryption.

### Key Features

- **End-to-End Encryption** - All communications are encrypted using the Signal Protocol (Double Ratchet + X3DH)
- **Perfect Forward Secrecy** - Each message uses unique encryption keys
- **Zero Knowledge Architecture** - Server never sees your messages
- **Peer-to-Peer Communication** - Direct WebRTC connections when possible
- **Cross-Platform** - Windows, macOS, and Linux support
- **Offline Support** - Messages queued and delivered when online
- **Disappearing Messages** - Auto-delete messages after specified time
- **Voice & Video Calls** - Encrypted real-time communication
- **File Sharing** - Secure file transfer with progress tracking
- **Group Chats** - Encrypted group conversations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VORTEX Desktop                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   React UI  │  │   Zustand   │  │   libsodium │             │
│  │  Components │  │   Stores    │  │   Crypto    │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│  ┌──────┴────────────────┴────────────────┴──────┐             │
│  │              Renderer Process                  │             │
│  └──────────────────────┬────────────────────────┘             │
│                         │ IPC Bridge                            │
│  ┌──────────────────────┴────────────────────────┐             │
│  │              Main Process (Electron)           │             │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐    │             │
│  │  │ SQLite3  │  │ Keychain │  │  Native  │    │             │
│  │  │   DB     │  │  Access  │  │   APIs   │    │             │
│  │  └──────────┘  └──────────┘  └──────────┘    │             │
│  └───────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket + WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Signaling Server (Blind Relay)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Socket.io  │  │ Rate Limiter │  │   Express    │         │
│  │   Server     │  │              │  │   HTTP API   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **React 18** - UI Framework
- **TypeScript 5** - Type Safety
- **Zustand** - State Management
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible Components
- **Lucide Icons** - Icon Library

### Desktop
- **Electron 31** - Desktop Framework
- **better-sqlite3** - Local Database
- **Vite** - Build Tool

### Cryptography
- **libsodium** - Cryptographic Library
- **ChaCha20-Poly1305** - AEAD Encryption
- **X25519** - Key Exchange
- **Ed25519** - Digital Signatures
- **Argon2id** - Password Hashing
- **Double Ratchet** - Forward Secrecy

### Communication
- **WebRTC (simple-peer)** - P2P Connections
- **Socket.io** - Signaling
- **STUN/TURN** - NAT Traversal

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Windows 10+ / macOS 12+ / Ubuntu 20.04+

### Installation

```bash
# Clone the repository
git clone https://github.com/vortex-protocol/vortex-desktop.git
cd vortex-desktop

# Install dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### Development

```bash
# Start development (client + server)
npm run dev:all

# Or start separately:
npm run dev        # Start Vite dev server
npm run dev:server # Start signaling server
```

### Building

```bash
# Build for production
npm run build

# Build desktop app
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

---

## Project Structure

```
vortex/
├── electron/                 # Electron main process
│   ├── main.ts              # Main entry point
│   └── preload.ts           # Preload script (IPC bridge)
├── server/                   # Signaling server
│   └── server.ts            # Socket.io server
├── src/
│   ├── components/          # React components
│   │   ├── layout/          # Layout components
│   │   ├── chat/            # Chat components
│   │   ├── call/            # Call components
│   │   └── ui/              # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # Business logic
│   │   ├── crypto/          # Cryptography
│   │   └── file/            # File transfer
│   ├── stores/              # Zustand stores
│   ├── lib/                 # Utilities
│   └── types/               # TypeScript definitions
├── package.json
├── vite.config.ts
├── tailwind.config.cjs
└── tsconfig.json
```

---

## Security

### Encryption Protocol

VORTEX uses a Signal-inspired protocol for message encryption:

1. **X3DH (Extended Triple Diffie-Hellman)** - Initial key agreement
2. **Double Ratchet** - Ongoing key derivation with forward secrecy
3. **ChaCha20-Poly1305** - Authenticated encryption for messages
4. **Argon2id** - Password-based key derivation

### Key Storage

- Identity keys are encrypted with user password
- Session keys are ephemeral and stored in memory
- Local database is encrypted with device-specific key

### Security Features

- ✅ End-to-end encryption for all messages
- ✅ Perfect forward secrecy
- ✅ Message authentication (AEAD)
- ✅ Key verification via safety numbers
- ✅ Secure key backup with password
- ✅ Memory-safe cryptographic operations
- ✅ No plaintext logging

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Signaling Server
VITE_SIGNALING_URL=http://localhost:8443

# STUN Server
VITE_STUN_URL=stun:stun.l.google.com:19302

# TURN Server (optional)
VITE_TURN_URL=turn:your.turn.server:3478
VITE_TURN_USER=username
VITE_TURN_PASS=password
```

### Server Configuration

Server-side environment variables:

```env
PORT=8443
ALLOWED_ORIGINS=http://localhost:5173
RATE_LIMIT_WINDOW_MS=10000
RATE_LIMIT_MAX=60
```

---

## API Reference

### Preload API (Renderer → Main)

```typescript
// Database
window.electronAPI.db.getMeta(key: string): Promise<string | null>
window.electronAPI.db.setMeta(key: string, value: string): Promise<void>
window.electronAPI.db.saveMessage(msg: Message): Promise<void>
window.electronAPI.db.getMessages(roomId: string, limit?: number): Promise<Message[]>

// Notifications
window.electronAPI.notifications.show(options: NotificationOptions): Promise<void>

// File System
window.electronAPI.fs.showOpenDialog(options): Promise<string[] | null>
window.electronAPI.fs.readFile(path: string): Promise<Uint8Array>

// Clipboard
window.electronAPI.clipboard.writeText(text: string): Promise<void>

// Desktop Capturer
window.electronAPI.getSources(types: Array<'window' | 'screen'>): Promise<Source[]>
```

### Socket.io Events

```typescript
// Client → Server
'join-room': { roomId: string }
'leave-room': { roomId: string }
'signal': { roomId: string, data: unknown, targetId?: string }

// Server → Client
'peer-joined': { peerId: string }
'peer-left': { peerId: string }
'signal': { from: string, data: unknown }
```

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Guidelines

1. Follow TypeScript best practices
2. Write tests for new features
3. Use conventional commits
4. Update documentation as needed

---

## License

This project is **UNLICENSED** - All rights reserved.

---

## Acknowledgments

- [Signal Protocol](https://signal.org/docs/) - Inspiration for cryptographic protocol
- [libsodium](https://doc.libsodium.org/) - Cryptographic library
- [Electron](https://www.electronjs.org/) - Desktop framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

<div align="center">
  <sub>Built with ❤️ by the VORTEX Team</sub>
</div>
