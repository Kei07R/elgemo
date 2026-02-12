import { Platform } from 'react-native';

// On Android emulator, 10.0.2.2 maps to the host machine's localhost.
// On iOS simulator, localhost works directly.
// For physical devices, use your machine's LAN IP.
const DEFAULT_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const SIGNALING_SERVER_URL = DEFAULT_URL;

export const ICE_SERVERS: RTCIceServer[] = [
  // Public Google STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add your TURN server here for production / NAT traversal:
  // {
  //   urls: 'turn:your-turn-server.com:3478',
  //   username: 'your-username',
  //   credential: 'your-credential',
  // },
];

export const RECONNECT_TIMEOUT_MS = 15_000;
