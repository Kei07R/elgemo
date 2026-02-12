import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { RoomManager } from './roomManager';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from './types';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const RECONNECT_WINDOW_MS = 15_000; // 15 seconds

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

const roomManager = new RoomManager();

// ── REST endpoints ──────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ...roomManager.stats() });
});

// ── Socket.IO ───────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);
  socket.data.roomCode = null;

  // ── Create room ─────────────────────────────────────────────────

  socket.on('create-room', (callback) => {
    // If already in a room, leave it first
    if (socket.data.roomCode) {
      handleLeave(socket);
    }

    const room = roomManager.createRoom(socket.id);
    socket.data.roomCode = room.code;
    socket.join(room.code);
    console.log(`[create-room] ${socket.id} → ${room.code}`);
    callback({ ok: true, code: room.code });
  });

  // ── Join room ───────────────────────────────────────────────────

  socket.on('join-room', ({ code }, callback) => {
    if (socket.data.roomCode) {
      handleLeave(socket);
    }

    const result = roomManager.joinRoom(code, socket.id);
    if (!result.ok) {
      console.log(`[join-room] ${socket.id} → ${code} FAILED: ${result.error}`);
      callback({ ok: false, error: result.error });
      return;
    }

    const room = result.room;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    console.log(`[join-room] ${socket.id} → ${room.code}`);

    // Notify the host that a peer joined
    const peerId = roomManager.getPeerId(room, socket.id);
    if (peerId) {
      io.to(peerId).emit('user-joined', { peerId: socket.id });
      socket.emit('user-joined', { peerId });
    }

    callback({ ok: true });
  });

  // ── Leave room ──────────────────────────────────────────────────

  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  // ── WebRTC signaling ────────────────────────────────────────────

  socket.on('offer', ({ sdp }) => {
    const room = socket.data.roomCode ? roomManager.getRoom(socket.data.roomCode) : undefined;
    if (!room) return;
    const peerId = roomManager.getPeerId(room, socket.id);
    if (peerId) {
      io.to(peerId).emit('offer', { sdp });
    }
  });

  socket.on('answer', ({ sdp }) => {
    const room = socket.data.roomCode ? roomManager.getRoom(socket.data.roomCode) : undefined;
    if (!room) return;
    const peerId = roomManager.getPeerId(room, socket.id);
    if (peerId) {
      io.to(peerId).emit('answer', { sdp });
    }
  });

  socket.on('ice-candidate', ({ candidate }) => {
    const room = socket.data.roomCode ? roomManager.getRoom(socket.data.roomCode) : undefined;
    if (!room) return;
    const peerId = roomManager.getPeerId(room, socket.id);
    if (peerId) {
      io.to(peerId).emit('ice-candidate', { candidate });
    }
  });

  // ── Chat ────────────────────────────────────────────────────────

  socket.on('chat-message', ({ text }) => {
    const room = socket.data.roomCode ? roomManager.getRoom(socket.data.roomCode) : undefined;
    if (!room) return;
    const peerId = roomManager.getPeerId(room, socket.id);
    if (peerId) {
      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: socket.id,
        text,
        timestamp: Date.now(),
      };
      // Send to peer
      io.to(peerId).emit('chat-message', message);
      // Echo back to sender so they get the server-assigned ID/timestamp
      socket.emit('chat-message', message);
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} reason=${reason}`);

    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const peerId = roomManager.getPeerId(room, socket.id);

    // For transport-level disconnects, give a reconnect window
    const isTransportDisconnect = ['transport close', 'transport error', 'ping timeout'].includes(reason);

    if (isTransportDisconnect && peerId) {
      // Notify peer that this user is reconnecting
      io.to(peerId).emit('peer-reconnecting');

      roomManager.startReconnectTimer(room, socket.id, RECONNECT_WINDOW_MS, () => {
        // Reconnect window expired → treat as permanent leave
        handleLeave(socket);
        if (peerId) {
          const wasHost = room.hostSocketId === socket.id;
          if (wasHost) {
            io.to(peerId).emit('room-closed', { reason: 'Host disconnected' });
          } else {
            io.to(peerId).emit('user-left', { peerId: socket.id, reason: 'Disconnected' });
          }
        }
      });
    } else {
      handleLeave(socket);
    }
  });
});

/** Clean up when a socket leaves its room */
function handleLeave(socket: any) {
  const roomCode = socket.data.roomCode;
  if (!roomCode) return;

  const result = roomManager.removeUser(socket.id);
  socket.data.roomCode = null;
  socket.leave(roomCode);

  if (!result) return;

  const { peerId, wasHost } = result;

  if (peerId) {
    if (wasHost) {
      // Host left → close room, kick peer
      io.to(peerId).emit('room-closed', { reason: 'Host left the room' });
      // Force-remove peer from room
      const peerSocket = io.sockets.sockets.get(peerId);
      if (peerSocket) {
        peerSocket.data.roomCode = null;
        peerSocket.leave(roomCode);
      }
    } else {
      io.to(peerId).emit('user-left', { peerId: socket.id, reason: 'Left the room' });
    }
  }

  console.log(`[leave] ${socket.id} left ${roomCode} (wasHost=${wasHost})`);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on http://0.0.0.0:${PORT}`);
});
