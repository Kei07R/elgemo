import { useState, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import { mediaDevices } from 'react-native-webrtc';

export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export function usePermissions() {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      if (Platform.OS === 'android') {
        const { PermissionsAndroid } = require('react-native');
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        const cameraGranted =
          grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
        const micGranted =
          grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;

        if (!cameraGranted || !micGranted) {
          const missing = [];
          if (!cameraGranted) missing.push('Camera');
          if (!micGranted) missing.push('Microphone');

          setStatus('denied');
          setError(`${missing.join(' and ')} permission denied`);

          Alert.alert(
            'Permissions Required',
            `Elgemo needs ${missing.join(' and ').toLowerCase()} access for video calls. Please enable in Settings.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return false;
        }

        setStatus('granted');
        return true;
      }

      // iOS: permissions are requested when getUserMedia is called.
      // We do a test call to trigger the prompt.
      try {
        const testStream = await mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        // Stop tracks immediately — just checking permissions
        (testStream as any).getTracks().forEach((t: any) => t.stop());
        setStatus('granted');
        return true;
      } catch (err: any) {
        setStatus('denied');
        const msg = err?.message || 'Permission denied';
        setError(msg);

        Alert.alert(
          'Permissions Required',
          'Elgemo needs camera and microphone access for video calls. Please enable in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return false;
      }
    } catch (err: any) {
      setStatus('denied');
      setError(err?.message || 'Failed to request permissions');
      return false;
    }
  }, []);

  return { status, error, requestPermissions };
}
