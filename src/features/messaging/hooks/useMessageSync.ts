import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Message,
  MessageSyncEvent,
  MessageSyncEventType,
  MessageSyncState,
  TypingIndicator,
} from '../types';

// DISABLED: MessageSyncService not needed for mobile-only app
// Real-time message sync is overkill for single-device usage
// Using local-first approach instead

export const useMessageSync = (userId?: string) => {
  const [syncState, setSyncState] = useState<MessageSyncState>(MessageSyncState.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // No-op implementations for mobile-only app
  const subscribeToConversation = useCallback(
    async (conversationId: string, callback: (event: MessageSyncEvent) => void): Promise<boolean> => {
      console.log('[MessageSync] DISABLED: subscribeToConversation called but sync is disabled for mobile-only app');
      return true; // Return success to prevent errors
    },
    []
  );

  const unsubscribeFromConversation = useCallback(
    async (conversationId: string, callback?: (event: MessageSyncEvent) => void): Promise<void> => {
      console.log('[MessageSync] DISABLED: unsubscribeFromConversation called but sync is disabled');
    },
    []
  );

  const subscribeToUserMessages = useCallback(
    async (callback: (event: MessageSyncEvent) => void): Promise<boolean> => {
      console.log('[MessageSync] DISABLED: subscribeToUserMessages called but sync is disabled for mobile-only app');
      return true; // Return success to prevent errors
    },
    []
  );

  const sendTypingIndicator = useCallback(
    async (conversationId: string, userName: string): Promise<void> => {
      console.log('[MessageSync] DISABLED: sendTypingIndicator called but sync is disabled');
    },
    []
  );

  const reconnect = useCallback(async (): Promise<void> => {
    console.log('[MessageSync] DISABLED: reconnect called but sync is disabled');
  }, []);

  const cleanup = useCallback(async (): Promise<void> => {
    console.log('[MessageSync] DISABLED: cleanup called but sync is disabled');
  }, []);

  // Initialize with disconnected state since sync is disabled
  useEffect(() => {
    setSyncState(MessageSyncState.DISCONNECTED);
    setIsConnected(false);
    setLastSyncTime(new Date());
  }, []);

  return {
    // State
    syncState,
    isConnected,
    typingUsers,
    lastSyncTime,
    
    // Actions (all no-ops)
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToUserMessages,
    sendTypingIndicator,
    reconnect,
    cleanup,
    
    // Connection health (always shows disconnected)
    getConnectionHealth: () => ({
      state: MessageSyncState.DISCONNECTED,
      activeChannels: 0,
      reconnectAttempts: 0,
      isOnline: true,
    }),
  };
};
