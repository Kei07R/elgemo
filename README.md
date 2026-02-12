# Elgemo

Room-code based 1-to-1 video chat app. No accounts, no login — just create a room, share the code, and connect.

Built with **React Native (Expo Dev Client)** + **WebRTC** + **Node.js/Socket.IO** signaling.

---

## Architecture Overview

```
┌──────────────────┐        WebSocket        ┌──────────────────┐
│   React Native   │◄──────(Socket.IO)──────►│  Signaling Server │
│   (Expo + RN)    │                          │  (Node + Express) │
│                  │    SDP offer/answer       │                  │
│  WebRTC Media    │    ICE candidates         │  Room management  │
│  Local camera    │    Room join/leave         │  Chat relay       │
│  Peer connection │    Chat messages           │  Ephemeral rooms  │
└────────┬─────────┘                          └──────────────────┘
         │
         │  Peer-to-peer (after signaling)
         │  Audio + Video via WebRTC
         │
┌────────▼─────────┐
│   Remote Peer    │
│   (Another app   │
│    instance)     │
└──────────────────┘
```

**Key design choices:**

- **Expo Dev Client** (not Expo Go) because `react-native-webrtc` requires native modules. You must run `expo prebuild` and use a development build.
- **Socket.IO** for signaling (WebSocket transport with auto-reconnect, heartbeats, rooms).
- **WebRTC** for peer-to-peer audio/video — media never touches the server.
- **Chat messages** flow through Socket.IO (not WebRTC data channels) for simplicity and reliability during ICE negotiation.

---

## Project Structure

```
elgemo/
├── server/                          # Signaling server
│   ├── src/
│   │   ├── index.ts                 # Express + Socket.IO server
│   │   ├── roomManager.ts           # Room lifecycle (create/join/leave)
│   │   └── types.ts                 # TypeScript interfaces & event contracts
│   ├── package.json
│   └── tsconfig.json
│
├── app/                             # React Native app
│   ├── App.tsx                      # Root component
│   ├── index.ts                     # Entry point
│   ├── app.json                     # Expo config (plugins, permissions)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── LobbyScreen.tsx      # Create/Join room UI
│   │   │   └── CallScreen.tsx       # Video call + chat + controls
│   │   ├── components/
│   │   │   ├── VideoView.tsx        # RTCView wrapper with fallback
│   │   │   ├── ControlBar.tsx       # Mic/camera/chat/end buttons
│   │   │   ├── ChatPanel.tsx        # Slide-up chat overlay
│   │   │   └── ConnectionStatusBar.tsx # Connection state indicator
│   │   ├── services/
│   │   │   ├── SignalingService.ts   # Socket.IO wrapper
│   │   │   └── WebRTCService.ts     # Peer connection lifecycle
│   │   ├── hooks/
│   │   │   ├── useWebRTC.ts         # React hook for call state
│   │   │   ├── useChat.ts           # Chat messages + unread count
│   │   │   └── usePermissions.ts    # Camera/mic permission flow
│   │   ├── utils/
│   │   │   └── constants.ts         # Server URL, ICE config
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript types
│   │   └── navigation/
│   │       └── AppNavigator.tsx      # Stack navigator
│   └── package.json
│
└── README.md
```

---

## Setup & Running

### Local Development

#### Prerequisites

- Node.js 18+
- npm or yarn

#### 1. Signaling Server

```bash
cd server
npm install
npm run dev          # Starts on http://localhost:3000
```

The server exposes:
- `GET /health` — JSON health check with active room stats
- WebSocket (Socket.IO) — signaling events
- Static web client at `/` (also served from `public/`)

#### 2. Web Client (Browser)

With the server running, just open **http://localhost:3000** in your browser. Open a second tab to test calls between two peers.

#### 3. React Native App (Optional)

```bash
cd app
npm install
```

Edit `src/utils/constants.ts` and set the URL to your machine's LAN IP for physical devices:
```ts
const DEFAULT_URL = 'http://192.168.x.x:3000';
```

```bash
npx expo prebuild
npx expo run:ios      # or run:android
```

> **Why not Expo Go?** `react-native-webrtc` requires native modules. You need a development build.

---

## Deployment

Vercel is serverless and **does not support WebSockets**, which Socket.IO requires. The deployment uses:

- **Vercel** — hosts the static web client (`web/`)
- **Render** — hosts the signaling server (`server/`) with WebSocket support (free tier)

### Step 1: Deploy signaling server to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml`. Or configure manually:
   - **Root directory:** `server`
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node dist/index.js`
   - **Environment:** Node
5. After deploy, note your server URL (e.g. `https://elgemo-signaling.onrender.com`)
6. Optionally set `CORS_ORIGIN` env var to your Vercel domain for tighter security

### Step 2: Deploy web client to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
2. Set **Root Directory** to `web`
3. Add environment variable:
   - `SIGNALING_URL` = `https://elgemo-signaling.onrender.com` (your Render URL from step 1)
4. Deploy

That's it. Your Vercel URL (e.g. `https://elgemo.vercel.app`) is the app. Share it with anyone to start video calls.

### Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `PORT` | Render (server) | Server port (Render sets this automatically) |
| `CORS_ORIGIN` | Render (server) | Allowed origin for CORS (default: `*`, set to your Vercel domain for production) |
| `SIGNALING_URL` | Vercel (web) | Full URL of the signaling server |

---

## Socket Events Protocol

### Client → Server

| Event | Payload | Callback Response | Description |
|---|---|---|---|
| `create-room` | — | `{ ok: true, code: string }` or `{ ok: false, error: string }` | Creates a new room, caller becomes host |
| `join-room` | `{ code: string }` | `{ ok: true }` or `{ ok: false, error: string }` | Joins existing room by code |
| `leave-room` | — | — | Voluntarily leaves current room |
| `offer` | `{ sdp: RTCSessionDescriptionInit }` | — | Sends WebRTC SDP offer to peer |
| `answer` | `{ sdp: RTCSessionDescriptionInit }` | — | Sends WebRTC SDP answer to peer |
| `ice-candidate` | `{ candidate: RTCIceCandidateInit }` | — | Sends ICE candidate to peer |
| `chat-message` | `{ text: string }` | — | Sends chat message (relayed + echoed) |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `user-joined` | `{ peerId: string }` | A peer joined your room |
| `user-left` | `{ peerId: string, reason: string }` | Peer left the room |
| `room-closed` | `{ reason: string }` | Room was closed (host left) |
| `offer` | `{ sdp: RTCSessionDescriptionInit }` | Incoming SDP offer |
| `answer` | `{ sdp: RTCSessionDescriptionInit }` | Incoming SDP answer |
| `ice-candidate` | `{ candidate: RTCIceCandidateInit }` | Incoming ICE candidate |
| `chat-message` | `{ id, senderId, text, timestamp }` | Chat message (from peer or echo) |
| `peer-reconnecting` | — | Peer temporarily disconnected |
| `peer-reconnected` | — | Peer reconnected successfully |

### Signaling Sequence

```
Host                    Server                    Guest
 │                        │                         │
 ├── create-room ────────►│                         │
 │◄── { ok, code } ──────┤                         │
 │                        │◄── join-room { code } ──┤
 │                        ├──► { ok } ──────────────┤
 │◄── user-joined ────────┤──► user-joined ────────►│
 │                        │                         │
 │── offer { sdp } ──────►│──► offer { sdp } ──────►│
 │                        │◄── answer { sdp } ──────┤
 │◄── answer { sdp } ─────┤                         │
 │                        │                         │
 │◄─► ice-candidate ─────►│◄─► ice-candidate ──────►│
 │          (multiple exchanges)                    │
 │                        │                         │
 │◄═══════ WebRTC P2P connected ═══════════════════►│
 │         (audio/video/data direct)                │
```

---

## Room Code Generation

- **Length:** 6 characters
- **Alphabet:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (28 chars, excluding `0/O/1/I` to avoid visual confusion)
- **Collision resistance:** 28^6 = ~481 million possible codes. The server checks for collisions before returning.
- **Case insensitive:** Input is uppercased on both client and server.

---

## ICE Server Configuration

Default config uses public Google STUN servers:

```ts
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];
```

### When You Need TURN

STUN works when both peers have at least one public-facing network path. **TURN is required when:**

- One or both peers are behind symmetric NAT (common on cellular networks, corporate firewalls)
- Both peers are behind strict NAT that doesn't allow UDP hole-punching

**To add TURN**, update `app/src/utils/constants.ts`:

```ts
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'your-username',
    credential: 'your-credential',
  },
];
```

Recommended TURN providers: [Twilio TURN](https://www.twilio.com/docs/stun-turn), [Metered TURN](https://www.metered.ca/turn-server), or self-host with [coturn](https://github.com/coturn/coturn).

---

## Room Behavior

| Scenario | Behavior |
|---|---|
| Host creates room | Gets 6-char code, waits for guest |
| Guest joins | Both get `user-joined`, host sends WebRTC offer |
| 3rd user tries to join | Gets `"Room is full"` error |
| Guest leaves | Room stays open, host can wait for new guest |
| Host leaves | Room is closed, guest gets `room-closed` event |
| Transport disconnect | 15-second reconnection window before room cleanup |

---

## Known Limitations

1. **NAT traversal**: Without a TURN server, connections will fail on some networks (symmetric NAT, strict firewalls). This is a fundamental WebRTC limitation. For production, always configure TURN.

2. **Expo Go incompatible**: Must use development builds (`expo prebuild` + `expo run:ios/android`). Expo Go cannot load `react-native-webrtc` native modules.

3. **No persistence**: Rooms are in-memory. Server restart clears all rooms. Chat history is not stored.

4. **1-to-1 only**: Room capacity is strictly 2. No group calls.

5. **No authentication**: Anyone with the room code can join. For production, consider adding room passwords or tokens.

6. **Speaker toggle**: Not implemented in this MVP. Audio routes to the default output (earpiece/speaker is controlled by the OS).

7. **Background mode**: The app doesn't maintain calls in the background. Backgrounding may cause the WebRTC connection to drop.

---

## License

See [LICENSE](./LICENSE) file.
