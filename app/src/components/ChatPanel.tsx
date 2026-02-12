import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import type { ChatMessage } from '../types';

interface Props {
  visible: boolean;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <View style={[styles.bubble, message.isMine ? styles.bubbleMine : styles.bubblePeer]}>
      <Text style={[styles.bubbleText, message.isMine ? styles.textMine : styles.textPeer]}>
        {message.text}
      </Text>
      <Text style={[styles.timestamp, message.isMine ? styles.timestampMine : styles.timestampPeer]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

export function ChatPanel({ visible, messages, onSend, onClose }: Props) {
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  useEffect(() => {
    if (visible && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, visible]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.6, 0],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtn}>Close</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#6b7280"
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(15, 15, 30, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 3,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  bubblePeer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMine: {
    color: '#fff',
  },
  textPeer: {
    color: '#e5e7eb',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  timestampMine: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  timestampPeer: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f3f4f6',
    fontSize: 15,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
