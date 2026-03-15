import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { Ionicons } from '@expo/vector-icons';

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
          <Ionicons
            name={isCameraOff ? 'videocam-off' : 'person'}
            size={isLocal ? 22 : 40}
            color="#6b7280"
          />
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
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offLabel: {
    color: '#4b5563',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '500',
  },
});