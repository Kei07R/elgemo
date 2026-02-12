import { useState, useCallback, useEffect, useRef } from 'react';
import { signalingService } from '../services/SignalingService';
import type { ChatMessage } from '../types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isPanelOpenRef = useRef(false);

  useEffect(() => {
    const handleMessage = (msg: any) => {
      const isMine = msg.senderId === signalingService.socketId;
      const chatMsg: ChatMessage = {
        id: msg.id,
        senderId: msg.senderId,
        text: msg.text,
        timestamp: msg.timestamp,
        isMine,
      };

      setMessages((prev) => [...prev, chatMsg]);

      if (!isMine && !isPanelOpenRef.current) {
        setUnreadCount((c) => c + 1);
      }
    };

    signalingService.on('chat-message', handleMessage);
    return () => {
      signalingService.off('chat-message', handleMessage);
    };
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    signalingService.sendChatMessage(trimmed);
  }, []);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    isPanelOpenRef.current = true;
  }, []);

  const setPanelOpen = useCallback((open: boolean) => {
    isPanelOpenRef.current = open;
    if (open) {
      setUnreadCount(0);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
  }, []);

  return { messages, unreadCount, sendMessage, markAsRead, setPanelOpen, clearMessages };
}
