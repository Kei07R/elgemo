import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  iconName,
  active = false,
  danger = false,
  badge,
  onPress,
}: {
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  active?: boolean;
  danger?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  const iconColor = danger ? '#fca5a5' : active ? '#fbbf24' : '#e5e7eb';

  return (
    <TouchableOpacity
      style={[styles.button, active && styles.buttonActive, danger && styles.buttonDanger]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={iconName} size={24} color={iconColor} />
      <Text style={[styles.label, active && styles.labelActive, danger && styles.labelDanger]}>
        {label}
      </Text>
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
          iconName={isMuted ? 'mic-off' : 'mic'}
          active={isMuted}
          onPress={onToggleMute}
        />
        <ControlButton
          label={isCameraOff ? 'Show' : 'Hide'}
          iconName={isCameraOff ? 'videocam-off' : 'videocam'}
          active={isCameraOff}
          onPress={onToggleCamera}
        />
        <ControlButton
          label="Flip"
          iconName="camera-reverse-outline"
          onPress={onSwitchCamera}
        />
        <ControlButton
          label="Chat"
          iconName="chatbubble-ellipses-outline"
          badge={unreadCount}
          onPress={onToggleChat}
        />
        <ControlButton
          label="End"
          iconName="call"
          danger
          onPress={onEndCall}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  buttonActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  buttonDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.28)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  label: {
    color: '#d1d5db',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  labelActive: {
    color: '#fbbf24',
  },
  labelDanger: {
    color: '#fca5a5',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 5,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.4)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});