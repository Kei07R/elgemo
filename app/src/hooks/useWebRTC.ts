import { useState, useCallback, useRef, useEffect } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { signalingService } from '../services/SignalingService';
import { WebRTCService } from '../services/WebRTCService';
import type { ConnectionStatus, RoomRole } from '../types';

interface UseWebRTCOptions {
  onRoomClosed?: (reason: string) => void;
  onPeerLeft?: (reason: string) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const webrtcRef = useRef<WebRTCService | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [role, setRole] = useState<RoomRole | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);

  // Initialize WebRTC service
  const getWebRTC = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService(signalingService);
    }
    return webrtcRef.current;
  }, []);

  // Start local media
  const startMedia = useCallback(async () => {
    const webrtc = getWebRTC();
    const stream = await webrtc.startLocalMedia();
    setLocalStream(stream);
    return stream;
  }, [getWebRTC]);

  // Create a room (host)
  const createRoom = useCallback(async (): Promise<string | null> => {
    try {
      setConnectionStatus('connecting');
      await signalingService.connect();

      const result = await signalingService.createRoom();
      if (!result.ok) {
        setConnectionStatus('disconnected');
        return null;
      }

      setRoomCode(result.code);
      setRole('host');
      setConnectionStatus('connected');

      return result.code;
    } catch (err) {
      console.error('[useWebRTC] createRoom error:', err);
      setConnectionStatus('disconnected');
      return null;
    }
  }, []);

  // Join a room (guest)
  const joinRoom = useCallback(async (code: string): Promise<boolean> => {
    try {
      setConnectionStatus('connecting');
      await signalingService.connect();

      const result = await signalingService.joinRoom(code);
      if (!result.ok) {
        setConnectionStatus('disconnected');
        throw new Error(result.error);
      }

      setRoomCode(code.toUpperCase());
      setRole('guest');
      setConnectionStatus('connected');

      return true;
    } catch (err) {
      setConnectionStatus('disconnected');
      throw err;
    }
  }, []);

  // Handle peer joining → set up WebRTC connection
  useEffect(() => {
    const handleUserJoined = async (payload: { peerId: string }) => {
      console.log('[useWebRTC] peer joined:', payload.peerId);
      setPeerConnected(true);

      const webrtc = getWebRTC();

      // Listen for remote stream
      webrtc.on('remote-stream', (stream: MediaStream) => {
        setRemoteStream(stream);
      });

      webrtc.on('connection-state', (state: string) => {
        switch (state) {
          case 'connecting':
            setConnectionStatus('connecting');
            break;
          case 'connected':
            setConnectionStatus('connected');
            break;
          case 'disconnected':
          case 'failed':
            setConnectionStatus('reconnecting');
            break;
          case 'closed':
            setConnectionStatus('disconnected');
            break;
        }
      });

      webrtc.on('ice-connection-state', (state: string) => {
        if (state === 'connected' || state === 'completed') {
          setConnectionStatus('connected');
        }
      });

      // Create peer connection
      webrtc.createPeerConnection();

      // If we're the host (or whoever was already in the room), we send the offer
      if (role === 'host') {
        await webrtc.createAndSendOffer();
      }
    };

    const handleUserLeft = (payload: { peerId: string; reason: string }) => {
      console.log('[useWebRTC] peer left:', payload.reason);
      setPeerConnected(false);
      setRemoteStream(null);

      const webrtc = getWebRTC();
      webrtc.closePeerConnection();

      // Re-create PC so we're ready for next peer
      if (role === 'host') {
        webrtc.createPeerConnection();
      }

      options.onPeerLeft?.(payload.reason);
    };

    const handleRoomClosed = (payload: { reason: string }) => {
      console.log('[useWebRTC] room closed:', payload.reason);
      options.onRoomClosed?.(payload.reason);
    };

    const handlePeerReconnecting = () => {
      setConnectionStatus('reconnecting');
    };

    const handlePeerReconnected = () => {
      setConnectionStatus('connected');
    };

    signalingService.on('user-joined', handleUserJoined);
    signalingService.on('user-left', handleUserLeft);
    signalingService.on('room-closed', handleRoomClosed);
    signalingService.on('peer-reconnecting', handlePeerReconnecting);
    signalingService.on('peer-reconnected', handlePeerReconnected);

    return () => {
      signalingService.off('user-joined', handleUserJoined);
      signalingService.off('user-left', handleUserLeft);
      signalingService.off('room-closed', handleRoomClosed);
      signalingService.off('peer-reconnecting', handlePeerReconnecting);
      signalingService.off('peer-reconnected', handlePeerReconnected);
    };
  }, [getWebRTC, role, options]);

  // Toggle mic
  const toggleMute = useCallback(() => {
    const webrtc = getWebRTC();
    const muted = webrtc.toggleMute();
    setIsMuted(muted);
  }, [getWebRTC]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    const webrtc = getWebRTC();
    const off = webrtc.toggleCamera();
    setIsCameraOff(off);
  }, [getWebRTC]);

  // Switch camera
  const switchCamera = useCallback(async () => {
    const webrtc = getWebRTC();
    await webrtc.switchCamera();
  }, [getWebRTC]);

  // End call / leave
  const endCall = useCallback(() => {
    signalingService.leaveRoom();
    const webrtc = getWebRTC();
    webrtc.cleanup();

    setLocalStream(null);
    setRemoteStream(null);
    setConnectionStatus('idle');
    setIsMuted(false);
    setIsCameraOff(false);
    setRoomCode(null);
    setRole(null);
    setPeerConnected(false);

    signalingService.disconnect();
    webrtcRef.current = null;
  }, [getWebRTC]);

  return {
    localStream,
    remoteStream,
    connectionStatus,
    isMuted,
    isCameraOff,
    roomCode,
    role,
    peerConnected,
    startMedia,
    createRoom,
    joinRoom,
    toggleMute,
    toggleCamera,
    switchCamera,
    endCall,
  };
}
