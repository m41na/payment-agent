import { useState, useEffect, useCallback, useRef } from 'react';
import { useMessaging, UseMessagingReturn } from './useMessaging';
import { useMessageSync, UseMessageSyncReturn } from './useMessageSync';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Message,
  ConversationSummary,
  SendMessageRequest,
  MessageOperationResult,
  MessageSyncEvent,
  MessageSyncEventType,
  MessageSyncState,
  TypingIndicator,
  MessageError,
  MessageType,
  MESSAGING_CONSTANTS,
} from '../types';

interface UseMessagingManagementState {
  // Combined state from both hooks
  isInitialized: boolean;
  isOnline: boolean;
  
  // Enhanced conversation state
  activeConversationId?: string;
  activeConversationParticipant?: string;
  conversationMessages: Record<string, Message[]>;
  conversationTyping: Record<string, TypingIndicator[]>;
  
  // Enhanced messaging state
  globalUnreadCount: number;
  recentMessages: Message[];
  
  // Connection and sync state
  connectionStatus: {
    isConnected: boolean;
    syncState: MessageSyncState;
    lastSyncTime?: string;
    reconnectAttempts: number;
  };
}

interface UseMessagingManagementActions {
  // Enhanced conversation management
  openConversation: (participantId: string) => Promise<void>;
  closeConversation: () => void;
  switchConversation: (conversationId: string, participantId: string) => Promise<void>;
  
  // Enhanced messaging operations
  sendMessageToActive: (content: string, type?: MessageType) => Promise<MessageOperationResult>;
  sendMessageWithAttachments: (
    content: string,
    attachments: File[],
    participantId?: string
  ) => Promise<MessageOperationResult>;
  
  // Real-time operations
  startTyping: () => Promise<void>;
  markActiveConversationAsRead: () => Promise<void>;
  
  // Bulk operations
  markAllAsRead: () => Promise<void>;
  archiveMultipleConversations: (conversationIds: string[]) => Promise<void>;
  deleteMultipleMessages: (messageIds: string[]) => Promise<void>;
  
  // Search and discovery
  searchAllMessages: (query: string) => Promise<Message[]>;
  getConversationHistory: (participantId: string, limit?: number) => Promise<Message[]>;
  
  // Connection management
  forceReconnect: () => Promise<void>;
  goOffline: () => void;
  goOnline: () => Promise<void>;
  
  // Utility
  refreshAll: () => Promise<void>;
  clearAllErrors: () => void;
}

export interface UseMessagingManagementReturn 
  extends UseMessagingManagementState, 
          UseMessagingManagementActions,
          Omit<UseMessagingReturn, keyof UseMessagingManagementState | keyof UseMessagingManagementActions>,
          Omit<UseMessageSyncReturn, keyof UseMessagingManagementState | keyof UseMessagingManagementActions> {}

export function useMessagingManagement(): UseMessagingManagementReturn {
  const { user } = useAuth();
  const messaging = useMessaging();
  const messageSync = useMessageSync();
  
  const [state, setState] = useState<UseMessagingManagementState>({
    isInitialized: false,
    isOnline: true,
    activeConversationId: undefined,
    activeConversationParticipant: undefined,
    conversationMessages: {},
    conversationTyping: {},
    globalUnreadCount: 0,
    recentMessages: [],
    connectionStatus: {
      isConnected: false,
      syncState: MessageSyncState.DISCONNECTED,
      reconnectAttempts: 0,
    },
  });

  // Track typing timers
  const typingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Handle real-time message events
   */
  const handleMessageEvent = useCallback((event: MessageSyncEvent) => {
    switch (event.type) {
      case MessageSyncEventType.MESSAGE_RECEIVED:
        if (event.message && event.conversation_id) {
          setState(prev => {
            const conversationMessages = prev.conversationMessages[event.conversation_id!] || [];
            const updatedMessages = [...conversationMessages, event.message!];
            
            return {
              ...prev,
              conversationMessages: {
                ...prev.conversationMessages,
                [event.conversation_id!]: updatedMessages,
              },
              recentMessages: [event.message!, ...prev.recentMessages.slice(0, 9)], // Keep 10 most recent
            };
          });

          // Update unread count
          setState(prev => ({
            ...prev,
            globalUnreadCount: prev.globalUnreadCount + 1,
          }));
        }
        break;

      case MessageSyncEventType.MESSAGE_READ:
        if (event.message_id && event.conversation_id) {
          setState(prev => {
            const conversationMessages = prev.conversationMessages[event.conversation_id!] || [];
            const updatedMessages = conversationMessages.map(msg =>
              msg.id === event.message_id ? { ...msg, is_read: true, read_at: event.timestamp } : msg
            );
            
            return {
              ...prev,
              conversationMessages: {
                ...prev.conversationMessages,
                [event.conversation_id!]: updatedMessages,
              },
            };
          });
        }
        break;

      case MessageSyncEventType.MESSAGE_DELETED:
        if (event.message_id && event.conversation_id) {
          setState(prev => {
            const conversationMessages = prev.conversationMessages[event.conversation_id!] || [];
            const updatedMessages = conversationMessages.map(msg =>
              msg.id === event.message_id 
                ? { ...msg, is_deleted: true, content: '[Message deleted]' } 
                : msg
            );
            
            return {
              ...prev,
              conversationMessages: {
                ...prev.conversationMessages,
                [event.conversation_id!]: updatedMessages,
              },
            };
          });
        }
        break;

      case MessageSyncEventType.USER_TYPING:
        if (event.conversation_id && event.user_id !== user?.id) {
          const typingIndicator: TypingIndicator = {
            conversation_id: event.conversation_id,
            user_id: event.user_id!,
            user_name: event.metadata?.user_name || 'Unknown User',
            started_at: event.timestamp,
            expires_at: event.metadata?.expires_at || new Date(Date.now() + MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS).toISOString(),
          };

          setState(prev => ({
            ...prev,
            conversationTyping: {
              ...prev.conversationTyping,
              [event.conversation_id!]: [typingIndicator],
            },
          }));

          // Clear typing indicator after timeout
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              conversationTyping: {
                ...prev.conversationTyping,
                [event.conversation_id!]: [],
              },
            }));
          }, MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS);
        }
        break;

      default:
        break;
    }
  }, [user?.id]);

  /**
   * Open a conversation
   */
  const openConversation = useCallback(async (participantId: string): Promise<void> => {
    if (!user?.id) return;

    try {
      // Create or get conversation
      const conversationResult = await messaging.createOrGetConversation(participantId);
      if (!conversationResult.success || !conversationResult.conversation) {
        throw new Error('Failed to create conversation');
      }

      const conversationId = conversationResult.conversation.id;
      
      // Set active conversation
      messaging.setCurrentConversation(conversationId, participantId);
      setState(prev => ({
        ...prev,
        activeConversationId: conversationId,
        activeConversationParticipant: participantId,
      }));

      // Load messages for this conversation
      await messaging.loadMessages([user.id, participantId]);
      
      // Subscribe to real-time events for this conversation
      await messageSync.subscribeToConversation(conversationId, handleMessageEvent);

      // Mark messages as read
      await messaging.markMessagesAsRead(participantId, user.id);

    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  }, [user?.id, messaging, messageSync, handleMessageEvent]);

  /**
   * Close current conversation
   */
  const closeConversation = useCallback((): void => {
    if (state.activeConversationId) {
      // Unsubscribe from real-time events
      messageSync.unsubscribeFromConversation(state.activeConversationId, handleMessageEvent);
      
      // Clear active conversation
      messaging.setCurrentConversation();
      setState(prev => ({
        ...prev,
        activeConversationId: undefined,
        activeConversationParticipant: undefined,
      }));
    }
  }, [state.activeConversationId, messageSync, messaging, handleMessageEvent]);

  /**
   * Switch to a different conversation
   */
  const switchConversation = useCallback(async (conversationId: string, participantId: string): Promise<void> => {
    // Close current conversation
    closeConversation();
    
    // Open new conversation
    await openConversation(participantId);
  }, [closeConversation, openConversation]);

  /**
   * Send message to active conversation
   */
  const sendMessageToActive = useCallback(async (
    content: string, 
    type: MessageType = MessageType.TEXT
  ): Promise<MessageOperationResult> => {
    if (!state.activeConversationParticipant) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No active conversation' },
      };
    }

    const request: SendMessageRequest = {
      receiver_id: state.activeConversationParticipant,
      content,
      message_type: type,
    };

    const result = await messaging.sendMessage(request);
    
    if (result.success && result.message) {
      // Add message to local conversation state
      setState(prev => {
        const conversationMessages = prev.conversationMessages[state.activeConversationId!] || [];
        return {
          ...prev,
          conversationMessages: {
            ...prev.conversationMessages,
            [state.activeConversationId!]: [...conversationMessages, result.message!],
          },
        };
      });
    }

    return result;
  }, [state.activeConversationParticipant, state.activeConversationId, messaging]);

  /**
   * Send message with attachments
   */
  const sendMessageWithAttachments = useCallback(async (
    content: string,
    attachments: File[],
    participantId?: string
  ): Promise<MessageOperationResult> => {
    const receiverId = participantId || state.activeConversationParticipant;
    if (!receiverId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No recipient specified' },
      };
    }

    // TODO: Implement file upload logic
    // For now, we'll send a text message indicating attachments
    const attachmentText = attachments.length > 0 
      ? `\n[${attachments.length} attachment(s)]` 
      : '';

    const request: SendMessageRequest = {
      receiver_id: receiverId,
      content: content + attachmentText,
      message_type: attachments.length > 0 ? MessageType.FILE : MessageType.TEXT,
    };

    return await messaging.sendMessage(request);
  }, [state.activeConversationParticipant, messaging]);

  /**
   * Start typing indicator for active conversation
   */
  const startTyping = useCallback(async (): Promise<void> => {
    if (!state.activeConversationId) return;

    // Clear existing typing timer
    const existingTimer = typingTimers.current.get(state.activeConversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Send typing indicator
    await messageSync.sendTypingIndicator(state.activeConversationId);

    // Set new timer to stop typing
    const timer = setTimeout(() => {
      typingTimers.current.delete(state.activeConversationId!);
    }, MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS);

    typingTimers.current.set(state.activeConversationId, timer);
  }, [state.activeConversationId, messageSync]);

  /**
   * Mark active conversation as read
   */
  const markActiveConversationAsRead = useCallback(async (): Promise<void> => {
    if (!state.activeConversationParticipant || !user?.id) return;

    await messaging.markMessagesAsRead(state.activeConversationParticipant, user.id);
  }, [state.activeConversationParticipant, user?.id, messaging]);

  /**
   * Mark all conversations as read
   */
  const markAllAsRead = useCallback(async (): Promise<void> => {
    // This would require iterating through all conversations
    // For now, refresh unread counts
    await messaging.refreshUnreadCounts();
    setState(prev => ({ ...prev, globalUnreadCount: 0 }));
  }, [messaging]);

  /**
   * Archive multiple conversations
   */
  const archiveMultipleConversations = useCallback(async (conversationIds: string[]): Promise<void> => {
    for (const conversationId of conversationIds) {
      await messaging.archiveConversation(conversationId, true);
    }
  }, [messaging]);

  /**
   * Delete multiple messages
   */
  const deleteMultipleMessages = useCallback(async (messageIds: string[]): Promise<void> => {
    for (const messageId of messageIds) {
      await messaging.deleteMessage(messageId);
    }
  }, [messaging]);

  /**
   * Search all messages
   */
  const searchAllMessages = useCallback(async (query: string): Promise<Message[]> => {
    const result = await messaging.searchMessages({ query });
    return result.messages;
  }, [messaging]);

  /**
   * Get conversation history
   */
  const getConversationHistory = useCallback(async (
    participantId: string, 
    limit: number = MESSAGING_CONSTANTS.MESSAGE_LOAD_LIMIT
  ): Promise<Message[]> => {
    if (!user?.id) return [];

    const result = await messaging.searchMessages({
      query: '',
      sender_id: participantId,
      limit,
    });

    return result.messages;
  }, [user?.id, messaging]);

  /**
   * Force reconnect
   */
  const forceReconnect = useCallback(async (): Promise<void> => {
    await messageSync.reconnect();
  }, [messageSync]);

  /**
   * Go offline
   */
  const goOffline = useCallback((): void => {
    setState(prev => ({ ...prev, isOnline: false }));
  }, []);

  /**
   * Go online
   */
  const goOnline = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isOnline: true }));
    await messageSync.processOfflineEvents();
    await messaging.refreshUnreadCounts();
  }, [messageSync, messaging]);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async (): Promise<void> => {
    await messaging.loadConversations();
    await messaging.refreshUnreadCounts();
    
    if (state.activeConversationParticipant && user?.id) {
      await messaging.loadMessages([user.id, state.activeConversationParticipant]);
    }
  }, [messaging, state.activeConversationParticipant, user?.id]);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback((): void => {
    messaging.clearError();
  }, [messaging]);

  // Update connection status
  useEffect(() => {
    setState(prev => ({
      ...prev,
      connectionStatus: {
        isConnected: messageSync.isConnected,
        syncState: messageSync.syncState,
        lastSyncTime: messageSync.isConnected ? new Date().toISOString() : prev.connectionStatus.lastSyncTime,
        reconnectAttempts: messageSync.reconnectAttempts,
      },
    }));
  }, [messageSync.isConnected, messageSync.syncState, messageSync.reconnectAttempts]);

  // Update global unread count
  useEffect(() => {
    setState(prev => ({
      ...prev,
      globalUnreadCount: messaging.totalUnreadCount,
    }));
  }, [messaging.totalUnreadCount]);

  // Initialize
  useEffect(() => {
    if (user?.id && !state.isInitialized) {
      setState(prev => ({ ...prev, isInitialized: true }));
    }
  }, [user?.id, state.isInitialized]);

  // Cleanup typing timers on unmount
  useEffect(() => {
    return () => {
      typingTimers.current.forEach(timer => clearTimeout(timer));
      typingTimers.current.clear();
    };
  }, []);

  return {
    // Combined state
    ...state,
    
    // Pass through messaging state and actions
    ...messaging,
    
    // Pass through sync state and actions  
    ...messageSync,
    
    // Enhanced actions
    openConversation,
    closeConversation,
    switchConversation,
    sendMessageToActive,
    sendMessageWithAttachments,
    startTyping,
    markActiveConversationAsRead,
    markAllAsRead,
    archiveMultipleConversations,
    deleteMultipleMessages,
    searchAllMessages,
    getConversationHistory,
    forceReconnect,
    goOffline,
    goOnline,
    refreshAll,
    clearAllErrors,
  };
}
