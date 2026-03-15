import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  StatusBar,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWebRTC } from '../hooks/useWebRTC';
import { useChat } from '../hooks/useChat';
import { VideoView } from '../components/VideoView';
import { ControlBar } from '../components/ControlBar';
import { ChatPanel } from '../components/ChatPanel';
import { ConnectionStatusBar } from '../components/ConnectionStatusBar';
import type { RoomRole } from '../types';

interface Props {
  navigation: any;
  route: {
    params: {
      roomCode: string;
      role: RoomRole;
    };
  };
}

export function CallScreen({ navigation, route }: Props) {
  const { roomCode, role } = route.params;
  const [chatVisible, setChatVisible] = useState(false);
  const hasSetupMedia = useRef(false);

  const handleRoomClosed = useCallback(
    (reason: string) => {
      Alert.alert('Room Closed', reason, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    [navigation],
  );

  const handlePeerLeft = useCallback((_reason: string) => {
    // Peer left but room stays open (host waiting for next peer)
  }, []);

  const {
    localStream,
    remoteStream,
    connectionStatus,
    isMuted,
    isCameraOff,
    peerConnected,
    startMedia,
    toggleMute,
    toggleCamera,
    switchCamera,
    endCall,
  } = useWebRTC({
    onRoomClosed: handleRoomClosed,
    onPeerLeft: handlePeerLeft,
  });

  const { messages, unreadCount, sendMessage, setPanelOpen, clearMessages } = useChat();

  // Start local media on mount
  useEffect(() => {
    if (!hasSetupMedia.current) {
      hasSetupMedia.current = true;
      startMedia().catch((err) => {
        console.error('[CallScreen] Failed to start media:', err);
        Alert.alert('Media Error', 'Could not access camera/microphone.');
      });
    }
  }, [startMedia]);

  // Handle Android back button
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true;
    });
    return () => handler.remove();
  }, []);

  const handleEndCall = useCallback(() => {
    Alert.alert('End Call', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          endCall();
          clearMessages();
          navigation.goBack();
        },
      },
    ]);
  }, [endCall, clearMessages, navigation]);

  const handleCopyCode = useCallback(async () => {
    await Clipboard.setStringAsync(roomCode);
    Alert.alert('Copied', `Room code "${roomCode}" copied to clipboard.`);
  }, [roomCode]);

  const handleToggleChat = useCallback(() => {
    const next = !chatVisible;
    setChatVisible(next);
    setPanelOpen(next);
  }, [chatVisible, setPanelOpen]);

  const handleCloseChat = useCallback(() => {
    setChatVisible(false);
    setPanelOpen(false);
  }, [setPanelOpen]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Remote video (full screen) */}
      <VideoView stream={remoteStream} isLocal={false} style={StyleSheet.absoluteFillObject} />

      {/* Overlay UI */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.roomInfo}>
            <Text style={styles.roomLabel}>Room</Text>
            <TouchableOpacity style={styles.roomCodeBtn} onPress={handleCopyCode} activeOpacity={0.7}>
              <Text style={styles.roomCode}>{roomCode}</Text>
              <Ionicons name="copy-outline" size={13} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
          <ConnectionStatusBar status={connectionStatus} peerConnected={peerConnected} />
        </View>

        {/* Waiting overlay when no peer */}
        {!peerConnected && (
          <View style={styles.waitingOverlay}>
            <Text style={styles.waitingTitle}>
              {role === 'host' ? 'Waiting for someone to join...' : 'Connecting...'}
            </Text>
            {role === 'host' && (
              <>
                <Text style={styles.waitingSubtitle}>Share this code:</Text>
                <TouchableOpacity onPress={handleCopyCode} style={styles.codeBadge} activeOpacity={0.7}>
                  <Text style={styles.codeBadgeText}>{roomCode}</Text>
                  <Text style={styles.copyHint}>Tap to copy</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Local video (PiP) */}
        <View style={styles.pipContainer}>
          <VideoView
            stream={localStream}
            isLocal
            isCameraOff={isCameraOff}
            style={styles.pip}
          />
        </View>

        {/* Bottom controls */}
        <View style={styles.bottom}>
          <ControlBar
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onSwitchCamera={switchCamera}
            onToggleChat={handleToggleChat}
            onEndCall={handleEndCall}
            unreadCount={unreadCount}
          />
        </View>
      </SafeAreaView>

      {/* Chat panel */}
      <ChatPanel
        visible={chatVisible}
        messages={messages}
        onSend={sendMessage}
        onClose={handleCloseChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  roomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
  },
  roomCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  roomCode: {
    color: '#f3f4f6',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    overflow: 'hidden',
  },
  waitingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  waitingTitle: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  waitingSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
  },
  codeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  codeBadgeText: {
    color: '#60a5fa',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
  },
  copyHint: {
    color: 'rgba(96, 165, 250, 0.6)',
    fontSize: 12,
    marginTop: 6,
  },
  pipContainer: {
    position: 'absolute',
    top: 100,
    right: 16,
    width: 110,
    height: 155,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pip: {
    flex: 1,
  },
  bottom: {
    // ControlBar handles its own styling
  },
});
