import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { ICE_SERVERS } from '../utils/constants';
import { SignalingService } from './SignalingService';

type Listener = (...args: any[]) => void;

/**
 * Manages the WebRTC peer connection lifecycle:
 * - Media capture (local camera/mic)
 * - Peer connection setup
 * - Offer/answer negotiation via the SignalingService
 * - ICE candidate exchange
 */
export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private signaling: SignalingService;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private listeners = new Map<string, Set<Listener>>();
  private isFrontCamera = true;
  private _isMuted = false;
  private _isCameraOff = false;

  constructor(signaling: SignalingService) {
    this.signaling = signaling;
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get remoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get isCameraOff(): boolean {
    return this._isCameraOff;
  }

  // ── Media ───────────────────────────────────────────────────────

  async startLocalMedia(): Promise<MediaStream> {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: this.isFrontCamera ? 'user' : 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });
    this.localStream = stream as MediaStream;
    return this.localStream;
  }

  stopLocalMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return this._isMuted;
    const audioTracks = this.localStream.getAudioTracks();
    this._isMuted = !this._isMuted;
    audioTracks.forEach((track: any) => {
      track.enabled = !this._isMuted;
    });
    return this._isMuted;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return this._isCameraOff;
    const videoTracks = this.localStream.getVideoTracks();
    this._isCameraOff = !this._isCameraOff;
    videoTracks.forEach((track: any) => {
      track.enabled = !this._isCameraOff;
    });
    return this._isCameraOff;
  }

  async switchCamera(): Promise<void> {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0] as any;
    if (videoTrack && typeof videoTrack._switchCamera === 'function') {
      videoTrack._switchCamera();
      this.isFrontCamera = !this.isFrontCamera;
    }
  }

  // ── Peer Connection ─────────────────────────────────────────────

  createPeerConnection(): RTCPeerConnection {
    if (this.pc) {
      this.closePeerConnection();
    }

    const config = {
      iceServers: ICE_SERVERS,
    };

    this.pc = new RTCPeerConnection(config);

    // Add local tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming remote tracks
    this.pc.addEventListener('track' as any, (event: any) => {
      const stream = event.streams?.[0];
      if (stream) {
        this.remoteStream = stream;
        this.emit('remote-stream', stream);
      }
    });

    // Handle ICE candidates
    this.pc.addEventListener('icecandidate' as any, (event: any) => {
      if (event.candidate) {
        this.signaling.sendIceCandidate(event.candidate.toJSON());
      }
    });

    // Connection state changes
    this.pc.addEventListener('connectionstatechange' as any, () => {
      const state = this.pc?.connectionState;
      console.log('[WebRTC] connectionState:', state);
      this.emit('connection-state', state);
    });

    this.pc.addEventListener('iceconnectionstatechange' as any, () => {
      const state = this.pc?.iceConnectionState;
      console.log('[WebRTC] iceConnectionState:', state);
      this.emit('ice-connection-state', state);

      if (state === 'failed') {
        // Attempt ICE restart
        this.restartIce();
      }
    });

    this.pc.addEventListener('icegatheringstatechange' as any, () => {
      console.log('[WebRTC] iceGatheringState:', this.pc?.iceGatheringState);
    });

    // Set up signaling event handlers
    this.setupSignalingHandlers();

    return this.pc;
  }

  private setupSignalingHandlers(): void {
    this.signaling.on('offer', this.handleOffer);
    this.signaling.on('answer', this.handleAnswer);
    this.signaling.on('ice-candidate', this.handleIceCandidate);
  }

  private removeSignalingHandlers(): void {
    this.signaling.off('offer', this.handleOffer);
    this.signaling.off('answer', this.handleAnswer);
    this.signaling.off('ice-candidate', this.handleIceCandidate);
  }

  // ── Offer / Answer ──────────────────────────────────────────────

  async createAndSendOffer(): Promise<void> {
    if (!this.pc) return;

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    } as any);

    await this.pc.setLocalDescription(offer);
    this.signaling.sendOffer(offer as any);
    console.log('[WebRTC] Sent offer');
  }

  private handleOffer = async (payload: { sdp: RTCSessionDescriptionInit }): Promise<void> => {
    if (!this.pc) return;

    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as any));
    console.log('[WebRTC] Set remote description (offer)');

    // Flush any pending ICE candidates
    await this.flushPendingCandidates();

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.signaling.sendAnswer(answer as any);
    console.log('[WebRTC] Sent answer');
  };

  private handleAnswer = async (payload: { sdp: RTCSessionDescriptionInit }): Promise<void> => {
    if (!this.pc) return;

    await this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as any));
    console.log('[WebRTC] Set remote description (answer)');

    // Flush any pending ICE candidates
    await this.flushPendingCandidates();
  };

  private handleIceCandidate = async (payload: { candidate: RTCIceCandidateInit }): Promise<void> => {
    if (!this.pc) return;

    if (!this.pc.remoteDescription) {
      // Queue candidate until remote description is set
      this.pendingCandidates.push(payload.candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (err) {
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  };

  private async flushPendingCandidates(): Promise<void> {
    const candidates = [...this.pendingCandidates];
    this.pendingCandidates = [];

    for (const candidate of candidates) {
      try {
        await this.pc!.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Failed to add queued ICE candidate:', err);
      }
    }
  }

  // ── ICE Restart ─────────────────────────────────────────────────

  async restartIce(): Promise<void> {
    if (!this.pc) return;
    console.log('[WebRTC] Restarting ICE...');

    try {
      const offer = await this.pc.createOffer({
        iceRestart: true,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      } as any);
      await this.pc.setLocalDescription(offer);
      this.signaling.sendOffer(offer as any);
    } catch (err) {
      console.error('[WebRTC] ICE restart failed:', err);
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  closePeerConnection(): void {
    this.removeSignalingHandlers();

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.remoteStream = null;
    this.pendingCandidates = [];
    this._isMuted = false;
    this._isCameraOff = false;
  }

  cleanup(): void {
    this.closePeerConnection();
    this.stopLocalMedia();
    this.listeners.clear();
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
