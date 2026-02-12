import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LobbyScreen } from '../screens/LobbyScreen';
import { CallScreen } from '../screens/CallScreen';
import type { RoomRole } from '../types';

export type RootStackParamList = {
  Lobby: undefined;
  Call: { roomCode: string; role: RoomRole };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Lobby"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0f0f1e' },
      }}
    >
      <Stack.Screen name="Lobby" component={LobbyScreen} />
      <Stack.Screen
        name="Call"
        component={CallScreen}
        options={{
          gestureEnabled: false, // Prevent accidental swipe-back during a call
          animation: 'fade',
        }}
      />
    </Stack.Navigator>
  );
}
