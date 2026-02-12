import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { ConnectionStatus } from '../types';

interface Props {
  status: ConnectionStatus;
  peerConnected: boolean;
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; bg: string }> = {
  idle: { label: 'Waiting', color: '#9ca3af', bg: 'transparent' },
  connecting: { label: 'Connecting...', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  connected: { label: 'Connected', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
  reconnecting: { label: 'Reconnecting...', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)' },
  disconnected: { label: 'Disconnected', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
};

export function ConnectionStatusBar({ status, peerConnected }: Props) {
  const config = STATUS_CONFIG[status];

  // Show "Waiting for peer..." when host is alone
  const label = status === 'connected' && !peerConnected ? 'Waiting for peer...' : config.label;
  const dotColor = status === 'connected' && !peerConnected ? '#fbbf24' : config.color;

  if (status === 'idle') return null;

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: config.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
