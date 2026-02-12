export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isMine: boolean;
}

export type RoomRole = 'host' | 'guest';

export interface RoomState {
  code: string;
  role: RoomRole;
  peerId: string | null;
}
