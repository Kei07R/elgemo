import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';

interface Props {
  stream: MediaStream | null;
  isLocal?: boolean;
  isCameraOff?: boolean;
  style?: any;
}

export function VideoView({ stream, isLocal = false, isCameraOff = false, style }: Props) {
  if (!stream || isCameraOff) {
    return (
      <View style={[styles.placeholder, style]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{isLocal ? 'You' : 'Peer'}</Text>
        </View>
        {isCameraOff && (
          <Text style={styles.offLabel}>Camera off</Text>
        )}
      </View>
    );
  }

  return (
    <RTCView
      streamURL={stream.toURL()}
      style={[styles.video, style]}
      objectFit="cover"
      mirror={isLocal}
      zOrder={isLocal ? 1 : 0}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
  },
  offLabel: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 10,
  },
});
