import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSyncService } from '../services/MessageSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import {
  MessageSyncEvent,
  MessageSyncEventType,
  MessageSyncState,
  TypingIndicator,
  Message,
  MESSAGING_CONSTANTS,
} from '../types';

interface UseMessageSyncState {
  syncState: MessageSyncState;
  isConnected: boolean;
  activeChannels: number;
  reconnectAttempts: number;
  typingUsers: Record<string, TypingIndicator[]>; // conversationId -> typing users
  connectionHealth: {
    state: MessageSyncState;
    activeChannels: number;
    reconnectAttempts: number;
    isOnline: boolean;
  };
}

interface UseMessageSyncActions {
  // Subscription management
  subscribeToConversation: (
    conversationId: string,
    callback: (event: MessageSyncEvent) => void
  ) => Promise<boolean>;
  unsubscribeFromConversation: (
    conversationId: string,
    callback?: (event: MessageSyncEvent) => void
  ) => Promise<void>;
  subscribeToUserMessages: (callback: (event: MessageSyncEvent) => void) => Promise<boolean>;
  
  // Typing indicators
  sendTypingIndicator: (conversationId: string) => Promise<void>;
  
  // Connection management
  reconnect: () => Promise<void>;
  getConnectionHealth: () => UseMessageSyncState['connectionHealth'];
  
  // Event processing
  processOfflineEvents: () => Promise<void>;
}

export interface UseMessageSyncReturn extends UseMessageSyncState, UseMessageSyncActions {}

export function useMessageSync(): UseMessageSyncReturn {
  const { user } = useAuth();
  const syncService = useRef(MessageSyncService.getInstance()).current;
  
  const [state, setState] = useState<UseMessageSyncState>({
    syncState: MessageSyncState.DISCONNECTED,
    isConnected: false,
    activeChannels: 0,
    reconnectAttempts: 0,
    typingUsers: {},
    connectionHealth: {
      state: MessageSyncState.DISCONNECTED,
      activeChannels: 0,
      reconnectAttempts: 0,
      isOnline: true,
    },
  });

  // Track active subscriptions
  const activeSubscriptions = useRef<Set<string>>(new Set());
  const eventCallbacks = useRef<Map<string, Set<(event: MessageSyncEvent) => void>>>(new Map());

  /**
   * Handle sync events
   */
  const handleSyncEvent = useCallback((event: MessageSyncEvent) => {
    switch (event.type) {
      case MessageSyncEventType.SYNC_STATE_CHANGED:
        const newState = event.metadata?.state as MessageSyncState;
        if (newState) {
          setState(prev => ({
            ...prev,
            syncState: newState,
            isConnected: newState === MessageSyncState.CONNECTED,
          }));
        }
        break;

      case MessageSyncEventType.USER_TYPING:
        if (event.conversation_id && event.user_id && event.metadata) {
          const typingIndicator: TypingIndicator = {
            conversation_id: event.conversation_id,
            user_id: event.user_id,
            user_name: event.metadata.user_name || 'Unknown User',
            started_at: event.timestamp,
            expires_at: event.metadata.expires_at || new Date(Date.now() + MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS).toISOString(),
          };

          setState(prev => {
            const conversationTyping = prev.typingUsers[event.conversation_id!] || [];
            const existingIndex = conversationTyping.findIndex(t => t.user_id === event.user_id);
            
            let updatedTyping: TypingIndicator[];
            if (existingIndex >= 0) {
              updatedTyping = [...conversationTyping];
              updatedTyping[existingIndex] = typingIndicator;
            } else {
              updatedTyping = [...conversationTyping, typingIndicator];
            }

            return {
              ...prev,
              typingUsers: {
                ...prev.typingUsers,
                [event.conversation_id!]: updatedTyping,
              },
            };
          });

          // Set timer to remove typing indicator
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              typingUsers: {
                ...prev.typingUsers,
                [event.conversation_id!]: (prev.typingUsers[event.conversation_id!] || [])
                  .filter(t => t.user_id !== event.user_id),
              },
            }));
          }, MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS);
        }
        break;

      default:
        // Handle other event types as needed
        break;
    }

    // Update connection health
    const health = syncService.getConnectionHealth();
    setState(prev => ({
      ...prev,
      connectionHealth: health,
      activeChannels: health.activeChannels,
      reconnectAttempts: health.reconnectAttempts,
    }));
  }, [syncService]);

  /**
   * Subscribe to conversation events
   */
  const subscribeToConversation = useCallback(async (
    conversationId: string,
    callback: (event: MessageSyncEvent) => void
  ): Promise<boolean> => {
    if (!user?.id) return false;

    // Register callback
    if (!eventCallbacks.current.has(conversationId)) {
      eventCallbacks.current.set(conversationId, new Set());
    }
    eventCallbacks.current.get(conversationId)!.add(callback);

    // Create wrapper callback that includes our sync event handler
    const wrappedCallback = (event: MessageSyncEvent) => {
      handleSyncEvent(event);
      callback(event);
    };

    const success = await syncService.subscribeToConversation(conversationId, user.id, wrappedCallback);
    
    if (success) {
      activeSubscriptions.current.add(conversationId);
    }

    return success;
  }, [user?.id, syncService, handleSyncEvent]);

  /**
   * Unsubscribe from conversation events
   */
  const unsubscribeFromConversation = useCallback(async (
    conversationId: string,
    callback?: (event: MessageSyncEvent) => void
  ): Promise<void> => {
    if (callback && eventCallbacks.current.has(conversationId)) {
      eventCallbacks.current.get(conversationId)!.delete(callback);
      
      // If no more callbacks, remove the conversation completely
      if (eventCallbacks.current.get(conversationId)!.size === 0) {
        eventCallbacks.current.delete(conversationId);
        activeSubscriptions.current.delete(conversationId);
        await syncService.unsubscribeFromConversation(conversationId);
      }
    } else {
      // Unsubscribe completely
      eventCallbacks.current.delete(conversationId);
      activeSubscriptions.current.delete(conversationId);
      await syncService.unsubscribeFromConversation(conversationId);
    }

    // Clear typing indicators for this conversation
    setState(prev => {
      const updatedTypingUsers = { ...prev.typingUsers };
      delete updatedTypingUsers[conversationId];
      return {
        ...prev,
        typingUsers: updatedTypingUsers,
      };
    });
  }, [syncService]);

  /**
   * Subscribe to user messages globally
   */
  const subscribeToUserMessages = useCallback(async (
    callback: (event: MessageSyncEvent) => void
  ): Promise<boolean> => {
    if (!user?.id) return false;

    const channelKey = `user:${user.id}`;
    
    // Register callback
    if (!eventCallbacks.current.has(channelKey)) {
      eventCallbacks.current.set(channelKey, new Set());
    }
    eventCallbacks.current.get(channelKey)!.add(callback);

    // Create wrapper callback
    const wrappedCallback = (event: MessageSyncEvent) => {
      handleSyncEvent(event);
      callback(event);
    };

    const success = await syncService.subscribeToUserMessages(user.id, wrappedCallback);
    
    if (success) {
      activeSubscriptions.current.add(channelKey);
    }

    return success;
  }, [user?.id, syncService, handleSyncEvent]);

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(async (conversationId: string): Promise<void> => {
    if (!user?.id || !user.full_name) return;

    await syncService.sendTypingIndicator(conversationId, user.id, user.full_name);
  }, [user?.id, user?.full_name, syncService]);

  /**
   * Reconnect all subscriptions
   */
  const reconnect = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, syncState: MessageSyncState.CONNECTING }));
    await syncService.reconnect();
  }, [syncService]);

  /**
   * Get connection health
   */
  const getConnectionHealth = useCallback(() => {
    return syncService.getConnectionHealth();
  }, [syncService]);

  /**
   * Process offline events
   */
  const processOfflineEvents = useCallback(async (): Promise<void> => {
    await syncService.processOfflineEvents();
  }, [syncService]);

  /**
   * Clean up expired typing indicators
   */
  const cleanupExpiredTypingIndicators = useCallback(() => {
    const now = new Date();
    
    setState(prev => {
      const updatedTypingUsers: Record<string, TypingIndicator[]> = {};
      
      Object.entries(prev.typingUsers).forEach(([conversationId, indicators]) => {
        const activeIndicators = indicators.filter(indicator => 
          new Date(indicator.expires_at) > now
        );
        
        if (activeIndicators.length > 0) {
          updatedTypingUsers[conversationId] = activeIndicators;
        }
      });

      return {
        ...prev,
        typingUsers: updatedTypingUsers,
      };
    });
  }, []);

  // Initialize sync service and subscribe to user messages
  useEffect(() => {
    if (user?.id) {
      // Subscribe to global user messages
      subscribeToUserMessages((event) => {
        console.log('Global message event:', event);
      });

      // Process any offline events
      processOfflineEvents();
    }
  }, [user?.id]);

  // Cleanup expired typing indicators periodically
  useEffect(() => {
    const interval = setInterval(cleanupExpiredTypingIndicators, 1000);
    return () => clearInterval(interval);
  }, [cleanupExpiredTypingIndicators]);

  // Update connection health periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const health = syncService.getConnectionHealth();
      setState(prev => ({
        ...prev,
        connectionHealth: health,
        activeChannels: health.activeChannels,
        reconnectAttempts: health.reconnectAttempts,
        syncState: health.state,
        isConnected: health.state === MessageSyncState.CONNECTED,
      }));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [syncService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup all subscriptions
      syncService.cleanup();
      activeSubscriptions.current.clear();
      eventCallbacks.current.clear();
    };
  }, [syncService]);

  return {
    // State
    ...state,
    
    // Actions
    subscribeToConversation,
    unsubscribeFromConversation,
    subscribeToUserMessages,
    sendTypingIndicator,
    reconnect,
    getConnectionHealth,
    processOfflineEvents,
  };
}
