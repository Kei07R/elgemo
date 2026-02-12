export interface Room {
  code: string;
  hostSocketId: string;
  guestSocketId: string | null;
  createdAt: number;
  /** If a user disconnects, we store their socket ID + a timer to allow reconnection */
  reconnectTimers: Map<string, NodeJS.Timeout>;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

// ── Client → Server events ──────────────────────────────────────────

export interface ClientToServerEvents {
  'create-room': (callback: (response: { ok: true; code: string } | { ok: false; error: string }) => void) => void;

  'join-room': (
    payload: { code: string },
    callback: (response: { ok: true } | { ok: false; error: string }) => void,
  ) => void;

  'leave-room': () => void;

  // WebRTC signaling
  offer: (payload: { sdp: RTCSessionDescriptionInit }) => void;
  answer: (payload: { sdp: RTCSessionDescriptionInit }) => void;
  'ice-candidate': (payload: { candidate: RTCIceCandidateInit }) => void;

  // Chat
  'chat-message': (payload: { text: string }) => void;
}

// ── Server → Client events ──────────────────────────────────────────

export interface ServerToClientEvents {
  'user-joined': (payload: { peerId: string }) => void;
  'user-left': (payload: { peerId: string; reason: string }) => void;
  'room-closed': (payload: { reason: string }) => void;

  // WebRTC signaling
  offer: (payload: { sdp: RTCSessionDescriptionInit }) => void;
  answer: (payload: { sdp: RTCSessionDescriptionInit }) => void;
  'ice-candidate': (payload: { candidate: RTCIceCandidateInit }) => void;

  // Chat
  'chat-message': (payload: ChatMessage) => void;

  // Reconnection
  'peer-reconnecting': () => void;
  'peer-reconnected': () => void;
}

// Socket.IO types expect these but we don't use them
export interface InterServerEvents {}
export interface SocketData {
  roomCode: string | null;
}

// RTCSessionDescriptionInit / RTCIceCandidateInit are standard WebRTC types.
// We re-declare minimal shapes here so the server compiles without a browser lib.
export interface RTCSessionDescriptionInit {
  type: string;
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}
