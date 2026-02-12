import React, { useState, useEffect, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Elgemo</Text>
        <Text style={styles.subtitle}>Video chat, no account needed</Text>
      </View>

      <View style={styles.content}>
        {/* Create Room */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start a call</Text>
          <Text style={styles.cardDesc}>
            Create a room and share the code with someone to connect.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleCreateRoom}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loadingAction === 'create' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Room</Text>
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
          <Text style={styles.cardTitle}>Join a call</Text>
          <Text style={styles.cardDesc}>Enter the room code shared with you.</Text>
          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            placeholder="Enter room code"
            placeholderTextColor="#6b7280"
            maxLength={8}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleJoinRoom}
          />
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              (loading || joinCode.trim().length < 6) && styles.btnDisabled,
            ]}
            onPress={handleJoinRoom}
            disabled={loading || joinCode.trim().length < 6}
            activeOpacity={0.8}
          >
            {loadingAction === 'join' ? (
              <ActivityIndicator color="#3b82f6" />
            ) : (
              <Text style={styles.secondaryBtnText}>Join Room</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footer}>Peer-to-peer. No data stored.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f3f4f6',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: '#9ca3af',
    marginTop: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3f4f6',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 18,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  secondaryBtnText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  codeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    color: '#f3f4f6',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dividerText: {
    color: '#6b7280',
    marginHorizontal: 16,
    fontSize: 14,
  },
  footer: {
    textAlign: 'center',
    color: '#4b5563',
    fontSize: 12,
    paddingBottom: 20,
  },
});
