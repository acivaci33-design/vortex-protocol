import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

// Type-safe Socket.io events
interface ServerToClientEvents {
  'peer-joined': (payload: { peerId: string }) => void;
  'peer-left': (payload: { peerId: string }) => void;
  signal: (payload: { from: string; data: unknown; targetId?: string }) => void;
  peers: (payload: { peers: string[] }) => void;
}

interface ClientToServerEvents {
  'join-room': (
    payload: { roomId: string },
    ack?: (response: { ok: true; peers: string[] } | { ok: false; error: string }) => void
  ) => void;
  'leave-room': (payload: { roomId: string }) => void;
  signal: (payload: { roomId: string; data: unknown; targetId?: string }) => void;
  'list-peers': (
    payload: { roomId: string },
    ack?: (response: { peers: string[] }) => void
  ) => void;
}

interface InterServerEvents {}

interface SocketData {
  rooms: Set<string>;
}

// Minimal, non-identifying logger
function log(event: string, info?: Record<string, number>): void {
  const base = `[${new Date().toISOString()}] ${event}`;
  if (info) {
    const pairs = Object.entries(info)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    // No identifiers (no room IDs, socket IDs, usernames)
    // eslint-disable-next-line no-console
    console.log(`${base} ${pairs}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(base);
  }
}

// Simple per-socket rate limiter
class SimpleRateLimiter {
  private count = 0;
  private last = Date.now();
  constructor(private readonly limit: number, private readonly windowMs: number) {}
  allow(): boolean {
    const now = Date.now();
    if (now - this.last > this.windowMs) {
      this.count = 0;
      this.last = now;
    }
    this.count += 1;
    return this.count <= this.limit;
  }
}

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) ?? [];

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '64kb' })); // only minimal HTTP usage

const corsOptions: cors.CorsOptions =
  allowedOriginsEnv.length > 0
    ? { origin: allowedOriginsEnv, credentials: false }
    : { origin: true, credentials: false };

app.use(cors(corsOptions));

// HTTP rate limit for any basic endpoints
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 10_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 60),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Minimal health endpoint (no identifiers, no debug)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Catch-all to avoid exposing details
app.use((_req, res) => {
  res.status(404).send('');
});

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 1 * 1024 * 1024, // 1MB max payload for signaling
  }
);

// Presence: roomId -> Set<socketId>
const rooms: Map<string, Set<string>> = new Map();

io.use((socket, next) => {
  socket.data.rooms = new Set<string>();
  next();
});

const joinSchema = z.object({
  roomId: z.string().min(3).max(128),
});

const signalSchema = z.object({
  roomId: z.string().min(3).max(128),
  data: z.unknown(),
  targetId: z.string().min(1).max(64).optional(),
});

const leaveSchema = z.object({
  roomId: z.string().min(3).max(128),
});

io.on('connection', (socket) => {
  const signalLimiter = new SimpleRateLimiter(60, 10_000); // 60 events / 10s
  const controlLimiter = new SimpleRateLimiter(20, 10_000); // 20 events / 10s

  log('ws:connection', { connections: io.engine.clientsCount, roomCount: rooms.size });

  socket.on('join-room', (payload, ack) => {
    if (!controlLimiter.allow()) return;
    const parsed = joinSchema.safeParse(payload);
    if (!parsed.success) {
      if (ack) ack({ ok: false, error: 'invalid_payload' });
      return;
    }
    const { roomId } = parsed.data;

    // Join Socket.io room (implicit), and update presence map
    socket.join(roomId);
    socket.data.rooms.add(roomId);

    let set = rooms.get(roomId);
    if (!set) {
      set = new Set<string>();
      rooms.set(roomId, set);
    }

    // Build peers list excluding self
    const peers: string[] = Array.from(set).filter((id) => id !== socket.id);

    set.add(socket.id);

    // Notify others (no identifiers beyond socket.id to clients)
    socket.to(roomId).emit('peer-joined', { peerId: socket.id });

    // Ack with current peers (client decides how to display without leaking to server)
    if (ack) ack({ ok: true, peers });

    log('ws:join-room', { connections: io.engine.clientsCount, roomCount: rooms.size });
  });

  socket.on('list-peers', (payload, ack) => {
    if (!controlLimiter.allow()) return;
    const parsed = joinSchema.safeParse(payload);
    if (!parsed.success) {
      if (ack) ack({ peers: [] });
      return;
    }
    const { roomId } = parsed.data;
    const set = rooms.get(roomId);
    const peers = set ? Array.from(set).filter((id) => id !== socket.id) : [];
    if (ack) ack({ peers });
  });

  socket.on('signal', (payload) => {
    if (!signalLimiter.allow()) return;
    const parsed = signalSchema.safeParse(payload);
    if (!parsed.success) return;
    const { roomId, data, targetId } = parsed.data;

    // Forward only; server is blind to contents
    if (targetId) {
      // Targeted relay inside room
      socket.to(targetId).emit('signal', { from: socket.id, data, targetId });
    } else {
      // Broadcast to room except sender
      socket.to(roomId).emit('signal', { from: socket.id, data });
    }
  });

  socket.on('leave-room', (payload) => {
    if (!controlLimiter.allow()) return;
    const parsed = leaveSchema.safeParse(payload);
    if (!parsed.success) return;
    const { roomId } = parsed.data;

    if (!socket.data.rooms.has(roomId)) return;

    socket.leave(roomId);
    socket.data.rooms.delete(roomId);

    const set = rooms.get(roomId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) rooms.delete(roomId);
    }

    socket.to(roomId).emit('peer-left', { peerId: socket.id });
    log('ws:leave-room', { connections: io.engine.clientsCount, roomCount: rooms.size });
  });

  socket.on('disconnecting', () => {
    // Clean up presence for each joined room (excluding the auto room of socket.id)
    for (const roomId of socket.data.rooms) {
      const set = rooms.get(roomId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) rooms.delete(roomId);
      }
      socket.to(roomId).emit('peer-left', { peerId: socket.id });
    }
  });

  socket.on('disconnect', () => {
    log('ws:disconnect', { connections: io.engine.clientsCount, roomCount: rooms.size });
  });
});

const PORT = Number(process.env.PORT ?? 5173);
httpServer.listen(PORT, () => {
  log('http:listening');
});

function shutdown() {
  log('server:shutdown:start');
  io.close(() => {
    httpServer.close(() => {
      log('server:shutdown:done');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
