import { Room } from './types';

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

export class RoomManager {
  private rooms = new Map<string, Room>();

  /** Generate a collision-resistant room code */
  private generateCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
      }
      attempts++;
      if (attempts > 100) throw new Error('Failed to generate unique room code');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId: string): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      hostSocketId,
      guestSocketId: null,
      createdAt: Date.now(),
      reconnectTimers: new Map(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(code: string, guestSocketId: string): { ok: true; room: Room } | { ok: false; error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { ok: false, error: 'Room not found' };
    if (room.guestSocketId && room.guestSocketId !== guestSocketId) {
      return { ok: false, error: 'Room is full' };
    }
    room.guestSocketId = guestSocketId;
    return { ok: true, room };
  }

  /** Get room code by socket ID */
  getRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === socketId || room.guestSocketId === socketId) {
        return room;
      }
    }
    return undefined;
  }

  /** Get the peer's socket ID in a room */
  getPeerId(room: Room, mySocketId: string): string | null {
    if (room.hostSocketId === mySocketId) return room.guestSocketId;
    if (room.guestSocketId === mySocketId) return room.hostSocketId;
    return null;
  }

  /** Remove a user from a room. Returns the room if it still exists (peer waiting). */
  removeUser(socketId: string): { room: Room; peerId: string | null; wasHost: boolean } | null {
    const room = this.getRoomBySocketId(socketId);
    if (!room) return null;

    const wasHost = room.hostSocketId === socketId;
    const peerId = this.getPeerId(room, socketId);

    if (wasHost) {
      // Host leaves → close room
      this.rooms.delete(room.code);
    } else {
      // Guest leaves → room stays, guest slot cleared
      room.guestSocketId = null;
    }

    return { room, peerId, wasHost };
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      // Clear any reconnect timers
      for (const timer of room.reconnectTimers.values()) {
        clearTimeout(timer);
      }
      this.rooms.delete(code);
    }
  }

  /** Mark a user as temporarily disconnected (reconnect window) */
  startReconnectTimer(
    room: Room,
    socketId: string,
    timeoutMs: number,
    onTimeout: () => void,
  ): void {
    // Clear existing timer if any
    const existing = room.reconnectTimers.get(socketId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      room.reconnectTimers.delete(socketId);
      onTimeout();
    }, timeoutMs);

    room.reconnectTimers.set(socketId, timer);
  }

  cancelReconnectTimer(room: Room, socketId: string): void {
    const timer = room.reconnectTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      room.reconnectTimers.delete(socketId);
    }
  }

  /** Stats for health check */
  stats() {
    return {
      activeRooms: this.rooms.size,
      rooms: Array.from(this.rooms.values()).map((r) => ({
        code: r.code,
        hasGuest: !!r.guestSocketId,
        age: Math.round((Date.now() - r.createdAt) / 1000) + 's',
      })),
    };
  }
}
