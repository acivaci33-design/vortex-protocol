/**
 * VORTEX Protocol - Signaling Server
 * Simple WebSocket server for WebRTC signaling
 * 
 * Run with: node server/signaling.js
 */

const { Server } = require('socket.io');
const http = require('http');

const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: io.engine.clientsCount }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('VORTEX Signaling Server');
});

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Store online users: peerId -> socketId
const onlineUsers = new Map();
// Store socket -> peerId mapping
const socketToPeer = new Map();

io.on('connection', (socket) => {
  console.log(`[Signaling] New connection: ${socket.id}`);

  // User registers with their peer ID
  socket.on('register', (data) => {
    const { peerId, publicKey, displayName } = data;
    
    if (!peerId) {
      socket.emit('error', { message: 'peerId is required' });
      return;
    }

    // Store mapping
    onlineUsers.set(peerId, {
      socketId: socket.id,
      publicKey,
      displayName,
      registeredAt: Date.now(),
    });
    socketToPeer.set(socket.id, peerId);

    console.log(`[Signaling] User registered: ${peerId} (${displayName || 'Anonymous'})`);
    
    // Confirm registration
    socket.emit('registered', { 
      peerId,
      onlineCount: onlineUsers.size,
    });

    // Broadcast online status to all
    socket.broadcast.emit('user-online', { peerId, displayName });
  });

  // Check if a peer is online
  socket.on('check-online', (data) => {
    const { peerId } = data;
    const isOnline = onlineUsers.has(peerId);
    const peerInfo = onlineUsers.get(peerId);
    
    socket.emit('online-status', { 
      peerId, 
      online: isOnline,
      publicKey: peerInfo?.publicKey,
    });
  });

  // Get list of online users (for debugging)
  socket.on('get-online-users', () => {
    const users = Array.from(onlineUsers.entries()).map(([peerId, info]) => ({
      peerId,
      displayName: info.displayName,
      online: true,
    }));
    socket.emit('online-users', users);
  });

  // WebRTC Signaling: Offer
  socket.on('signal-offer', (data) => {
    const { targetPeerId, signal, fromPeerId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      console.log(`[Signaling] Offer: ${fromPeerId} -> ${targetPeerId}`);
      io.to(target.socketId).emit('signal-offer', {
        fromPeerId,
        signal,
      });
    } else {
      socket.emit('peer-offline', { peerId: targetPeerId });
    }
  });

  // WebRTC Signaling: Answer
  socket.on('signal-answer', (data) => {
    const { targetPeerId, signal, fromPeerId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      console.log(`[Signaling] Answer: ${fromPeerId} -> ${targetPeerId}`);
      io.to(target.socketId).emit('signal-answer', {
        fromPeerId,
        signal,
      });
    }
  });

  // WebRTC Signaling: ICE Candidate
  socket.on('signal-ice', (data) => {
    const { targetPeerId, candidate, fromPeerId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      io.to(target.socketId).emit('signal-ice', {
        fromPeerId,
        candidate,
      });
    }
  });

  // Call signaling
  socket.on('call-request', (data) => {
    const { targetPeerId, fromPeerId, callType, callId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      console.log(`[Signaling] Call request: ${fromPeerId} -> ${targetPeerId} (${callType})`);
      io.to(target.socketId).emit('call-request', {
        fromPeerId,
        callType,
        callId,
        displayName: onlineUsers.get(fromPeerId)?.displayName,
      });
    } else {
      socket.emit('call-failed', { reason: 'peer-offline', targetPeerId });
    }
  });

  socket.on('call-accept', (data) => {
    const { targetPeerId, fromPeerId, callId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      io.to(target.socketId).emit('call-accepted', { fromPeerId, callId });
    }
  });

  socket.on('call-reject', (data) => {
    const { targetPeerId, fromPeerId, callId, reason } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      io.to(target.socketId).emit('call-rejected', { fromPeerId, callId, reason });
    }
  });

  socket.on('call-end', (data) => {
    const { targetPeerId, fromPeerId, callId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      io.to(target.socketId).emit('call-ended', { fromPeerId, callId });
    }
  });

  // Direct message through server (fallback when P2P fails)
  socket.on('relay-message', (data) => {
    const { targetPeerId, message, fromPeerId } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      io.to(target.socketId).emit('relayed-message', {
        fromPeerId,
        message,
      });
    } else {
      socket.emit('message-failed', { 
        targetPeerId, 
        reason: 'peer-offline',
        messageId: message.id,
      });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { targetPeerId, fromPeerId, isTyping } = data;
    const target = onlineUsers.get(targetPeerId);
    
    if (target) {
      io.to(target.socketId).emit('typing', { fromPeerId, isTyping });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const peerId = socketToPeer.get(socket.id);
    
    if (peerId) {
      console.log(`[Signaling] User disconnected: ${peerId}`);
      onlineUsers.delete(peerId);
      socketToPeer.delete(socket.id);
      
      // Broadcast offline status
      socket.broadcast.emit('user-offline', { peerId });
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         VORTEX Protocol - Signaling Server            ║
╠═══════════════════════════════════════════════════════╣
║  Status:  RUNNING                                     ║
║  Port:    ${PORT}                                          ║
║  URL:     http://localhost:${PORT}                         ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Signaling] Shutting down...');
  io.close();
  process.exit(0);
});
