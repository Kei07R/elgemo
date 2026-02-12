import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
  unreadCount: number;
}

function ControlButton({
  label,
  icon,
  active = false,
  danger = false,
  badge,
  onPress,
}: {
  label: string;
  icon: string;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        active && styles.buttonActive,
        danger && styles.buttonDanger,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function ControlBar({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onSwitchCamera,
  onToggleChat,
  onEndCall,
  unreadCount,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ControlButton
          label={isMuted ? 'Unmute' : 'Mute'}
          icon={isMuted ? '\u{1F507}' : '\u{1F50A}'}
          active={isMuted}
          onPress={onToggleMute}
        />
        <ControlButton
          label={isCameraOff ? 'Camera On' : 'Camera Off'}
          icon={isCameraOff ? '\u{1F6AB}' : '\u{1F4F7}'}
          active={isCameraOff}
          onPress={onToggleCamera}
        />
        <ControlButton
          label="Flip"
          icon={'\u{1F504}'}
          onPress={onSwitchCamera}
        />
        <ControlButton
          label="Chat"
          icon={'\u{1F4AC}'}
          badge={unreadCount}
          onPress={onToggleChat}
        />
        <ControlButton
          label="End"
          icon={'\u{1F4F5}'}
          danger
          onPress={onEndCall}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  buttonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  icon: {
    fontSize: 22,
  },
  label: {
    color: '#e5e7eb',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  labelDanger: {
    color: '#fca5a5',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
