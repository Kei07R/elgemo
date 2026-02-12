import { io, Socket } from 'socket.io-client';
import { SIGNALING_SERVER_URL } from '../utils/constants';
import type { ChatMessage } from '../types';

type Listener = (...args: any[]) => void;

/**
 * Thin wrapper around a Socket.IO connection to the signaling server.
 * All WebRTC-related socket events flow through here.
 */
export class SignalingService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private _socketId: string | null = null;

  get socketId(): string | null {
    return this._socketId;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Connection ──────────────────────────────────────────────────

  connect(serverUrl: string = SIGNALING_SERVER_URL): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10_000,
      });

      this.socket.on('connect', () => {
        this._socketId = this.socket!.id!;
        console.log('[Signaling] connected:', this._socketId);
        resolve();
      });

      this.socket.on('connect_error', (err) => {
        console.error('[Signaling] connect_error:', err.message);
        reject(err);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Signaling] disconnected:', reason);
        this.emit('connection-status', 'disconnected');
      });

      this.socket.on('reconnect', () => {
        this._socketId = this.socket!.id!;
        console.log('[Signaling] reconnected:', this._socketId);
        this.emit('connection-status', 'reconnected');
      });

      this.socket.on('reconnect_attempt', () => {
        this.emit('connection-status', 'reconnecting');
      });

      // Forward server events to local listeners
      this.socket.on('user-joined', (payload: { peerId: string }) => {
        this.emit('user-joined', payload);
      });

      this.socket.on('user-left', (payload: { peerId: string; reason: string }) => {
        this.emit('user-left', payload);
      });

      this.socket.on('room-closed', (payload: { reason: string }) => {
        this.emit('room-closed', payload);
      });

      this.socket.on('offer', (payload: { sdp: RTCSessionDescriptionInit }) => {
        this.emit('offer', payload);
      });

      this.socket.on('answer', (payload: { sdp: RTCSessionDescriptionInit }) => {
        this.emit('answer', payload);
      });

      this.socket.on('ice-candidate', (payload: { candidate: RTCIceCandidateInit }) => {
        this.emit('ice-candidate', payload);
      });

      this.socket.on('chat-message', (payload: ChatMessage) => {
        this.emit('chat-message', payload);
      });

      this.socket.on('peer-reconnecting', () => {
        this.emit('peer-reconnecting');
      });

      this.socket.on('peer-reconnected', () => {
        this.emit('peer-reconnected');
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this._socketId = null;
  }

  // ── Room management ─────────────────────────────────────────────

  createRoom(): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
    return new Promise((resolve) => {
      this.socket!.emit('create-room', (response: any) => {
        resolve(response);
      });
    });
  }

  joinRoom(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
    return new Promise((resolve) => {
      this.socket!.emit('join-room', { code: code.toUpperCase() }, (response: any) => {
        resolve(response);
      });
    });
  }

  leaveRoom(): void {
    this.socket?.emit('leave-room');
  }

  // ── WebRTC signaling ────────────────────────────────────────────

  sendOffer(sdp: RTCSessionDescriptionInit): void {
    this.socket?.emit('offer', { sdp });
  }

  sendAnswer(sdp: RTCSessionDescriptionInit): void {
    this.socket?.emit('answer', { sdp });
  }

  sendIceCandidate(candidate: RTCIceCandidateInit): void {
    this.socket?.emit('ice-candidate', { candidate });
  }

  // ── Chat ────────────────────────────────────────────────────────

  sendChatMessage(text: string): void {
    this.socket?.emit('chat-message', { text });
  }

  // ── Local event emitter ─────────────────────────────────────────

  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }
}

// Singleton instance
export const signalingService = new SignalingService();
