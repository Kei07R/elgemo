import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePermissions } from '../hooks/usePermissions';
import { signalingService } from '../services/SignalingService';
import { SIGNALING_SERVER_URL } from '../utils/constants';

interface Props {
  navigation: any;
}

export function LobbyScreen({ navigation }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'create' | 'join' | null>(null);
  const { requestPermissions } = usePermissions();

  const handleCreateRoom = useCallback(async () => {
    Keyboard.dismiss();

    const granted = await requestPermissions();
    if (!granted) return;

    setLoading(true);
    setLoadingAction('create');

    try {
      await signalingService.connect(SIGNALING_SERVER_URL);
      const result = await signalingService.createRoom();

      if (!result.ok) {
        Alert.alert('Error', result.error);
        return;
      }

      navigation.navigate('Call', {
        roomCode: result.code,
        role: 'host',
      });
    } catch (err: any) {
      Alert.alert('Connection Error', err.message || 'Could not connect to server');
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }, [navigation, requestPermissions]);

  const handleJoinRoom = useCallback(async () => {
    Keyboard.dismiss();

    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character room code.');
      return;
    }

    const granted = await requestPermissions();
    if (!granted) return;

    setLoading(true);
    setLoadingAction('join');

    try {
      await signalingService.connect(SIGNALING_SERVER_URL);
      const result = await signalingService.joinRoom(code);

      if (!result.ok) {
        Alert.alert('Error', result.error);
        return;
      }

      navigation.navigate('Call', {
        roomCode: code,
        role: 'guest',
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not join room');
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  }, [joinCode, navigation, requestPermissions]);

  const joinDisabled = loading || joinCode.trim().length < 6;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Ionicons name="videocam" size={28} color="#3b82f6" />
        </View>
        <Text style={styles.title}>Elgemo</Text>
        <Text style={styles.subtitle}>Video chat, no account needed</Text>
      </View>

      {/* Cards */}
      <View style={styles.content}>
        {/* Create Room */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Start a call</Text>
              <Text style={styles.cardDesc}>Create a room and share the code to connect.</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleCreateRoom}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loadingAction === 'create' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="videocam-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Create Room</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Join Room */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="enter-outline" size={20} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Join a call</Text>
              <Text style={styles.cardDesc}>Enter the room code shared with you.</Text>
            </View>
          </View>
          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            placeholder="Enter room code"
            placeholderTextColor="#4b5563"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleJoinRoom}
          />
          <TouchableOpacity
            style={[styles.secondaryBtn, joinDisabled && styles.btnDisabled]}
            onPress={handleJoinRoom}
            disabled={joinDisabled}
            activeOpacity={0.8}
          >
            {loadingAction === 'join' ? (
              <ActivityIndicator color="#60a5fa" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-forward-circle-outline" size={18} color="#60a5fa" />
                <Text style={styles.secondaryBtnText}>Join Room</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Ionicons name="lock-closed-outline" size={12} color="#374151" />
        <Text style={styles.footer}>Peer-to-peer. No data stored.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  header: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f9fafb',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  cardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f3f4f6',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#60a5fa',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#f3f4f6',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 5,
    textAlign: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#4b5563',
    marginHorizontal: 16,
    fontSize: 13,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 24,
  },
  footer: {
    color: '#374151',
    fontSize: 12,
  },
});