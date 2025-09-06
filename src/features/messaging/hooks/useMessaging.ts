import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageService } from '../services/MessageService';
import { ConversationService } from '../services/ConversationService';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Message,
  ConversationSummary,
  SendMessageRequest,
  MessageOperationResult,
  ConversationOperationResult,
  MessagesResult,
  ConversationsResult,
  MessageSearchQuery,
  ConversationFilters,
  MessageError,
  MessageType,
  MESSAGING_CONSTANTS,
} from '../types';

interface UseMessagingState {
  // Messages
  messages: Message[];
  messagesLoading: boolean;
  messagesError: MessageError | null;
  hasMoreMessages: boolean;
  nextMessageCursor?: string;
  
  // Conversations
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  conversationsError: MessageError | null;
  hasMoreConversations: boolean;
  
  // Current conversation
  currentConversationId?: string;
  currentParticipant?: string;
  
  // Sending state
  sendingMessage: boolean;
  sendError: MessageError | null;
  
  // Unread counts
  totalUnreadCount: number;
  conversationUnreadCounts: Record<string, number>;
  
  // Draft messages
  draftMessages: Record<string, string>;
}

interface UseMessagingActions {
  // Message operations
  sendMessage: (request: SendMessageRequest) => Promise<MessageOperationResult>;
  loadMessages: (conversationParticipants: string[], loadMore?: boolean) => Promise<void>;
  markMessagesAsRead: (senderId: string, receiverId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<MessageOperationResult>;
  searchMessages: (query: MessageSearchQuery) => Promise<MessagesResult>;
  
  // Conversation operations
  loadConversations: (filters?: ConversationFilters, loadMore?: boolean) => Promise<void>;
  createOrGetConversation: (otherUserId: string) => Promise<ConversationOperationResult>;
  archiveConversation: (conversationId: string, archive?: boolean) => Promise<void>;
  searchConversations: (query: string) => Promise<ConversationSummary[]>;
  
  // Navigation
  setCurrentConversation: (conversationId?: string, participantId?: string) => void;
  
  // Draft management
  saveDraft: (conversationKey: string, content: string) => Promise<void>;
  getDraft: (conversationKey: string) => Promise<string>;
  
  // Utility
  refreshUnreadCounts: () => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

export interface UseMessagingReturn extends UseMessagingState, UseMessagingActions {}

export function useMessaging(): UseMessagingReturn {
  const { user } = useAuth();
  const messageService = useRef(new MessageService()).current;
  const conversationService = useRef(new ConversationService()).current;
  
  // State
  const [state, setState] = useState<UseMessagingState>({
    messages: [],
    messagesLoading: false,
    messagesError: null,
    hasMoreMessages: false,
    nextMessageCursor: undefined,
    
    conversations: [],
    conversationsLoading: false,
    conversationsError: null,
    hasMoreConversations: false,
    
    currentConversationId: undefined,
    currentParticipant: undefined,
    
    sendingMessage: false,
    sendError: null,
    
    totalUnreadCount: 0,
    conversationUnreadCounts: {},
    
    draftMessages: {},
  });

  // Last operation for retry
  const lastOperation = useRef<(() => Promise<void>) | null>(null);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (request: SendMessageRequest): Promise<MessageOperationResult> => {
    if (!user?.id) {
      const error: MessageError = { code: 'PERMISSION_DENIED', message: 'User not authenticated' };
      return { success: false, error };
    }

    setState(prev => ({ ...prev, sendingMessage: true, sendError: null }));

    try {
      const result = await messageService.sendMessage(request, user.id);
      
      if (result.success && result.message) {
        // Add message to current messages if it's for the current conversation
        const messageConversationId = [result.message.sender_id, result.message.receiver_id].sort().join('_');
        
        setState(prev => {
          if (prev.currentConversationId === messageConversationId) {
            return {
              ...prev,
              messages: [...prev.messages, result.message!],
              sendingMessage: false,
            };
          }
          return { ...prev, sendingMessage: false };
        });

        // Clear draft for this conversation
        if (request.receiver_id) {
          const conversationKey = [user.id, request.receiver_id].sort().join('_');
          await saveDraft(conversationKey, '');
        }
      } else {
        setState(prev => ({ 
          ...prev, 
          sendingMessage: false, 
          sendError: result.error || null 
        }));
      }

      return result;
    } catch (error: any) {
      const messageError: MessageError = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Failed to send message',
      };
      
      setState(prev => ({ 
        ...prev, 
        sendingMessage: false, 
        sendError: messageError 
      }));

      return { success: false, error: messageError };
    }
  }, [user?.id, messageService]);

  /**
   * Load messages for a conversation
   */
  const loadMessages = useCallback(async (
    conversationParticipants: string[], 
    loadMore: boolean = false
  ): Promise<void> => {
    if (!user?.id) return;

    setState(prev => ({ 
      ...prev, 
      messagesLoading: true, 
      messagesError: null 
    }));

    lastOperation.current = () => loadMessages(conversationParticipants, loadMore);

    try {
      const offset = loadMore ? state.messages.length : 0;
      const cursor = loadMore ? state.nextMessageCursor : undefined;
      
      const result = await messageService.getMessages(
        conversationParticipants,
        user.id,
        MESSAGING_CONSTANTS.MESSAGE_LOAD_LIMIT,
        offset,
        cursor
      );

      setState(prev => ({
        ...prev,
        messages: loadMore ? [...prev.messages, ...result.messages] : result.messages,
        hasMoreMessages: result.has_more,
        nextMessageCursor: result.next_cursor,
        messagesLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        messagesLoading: false,
        messagesError: error,
      }));
    }
  }, [user?.id, messageService, state.messages.length, state.nextMessageCursor]);

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(async (senderId: string, receiverId: string): Promise<void> => {
    if (!user?.id) return;

    try {
      await messageService.markMessagesAsRead(senderId, receiverId);
      
      // Update local state
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(message => 
          message.sender_id === senderId && message.receiver_id === receiverId
            ? { ...message, is_read: true, read_at: new Date().toISOString() }
            : message
        ),
        conversationUnreadCounts: {
          ...prev.conversationUnreadCounts,
          [senderId]: 0,
        },
      }));

      // Refresh total unread count
      await refreshUnreadCounts();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user?.id, messageService]);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string): Promise<MessageOperationResult> => {
    if (!user?.id) {
      const error: MessageError = { code: 'PERMISSION_DENIED', message: 'User not authenticated' };
      return { success: false, error };
    }

    try {
      const result = await messageService.deleteMessage(messageId, user.id);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(message => 
            message.id === messageId 
              ? { ...message, is_deleted: true, content: '[Message deleted]' }
              : message
          ),
        }));
      }

      return result;
    } catch (error: any) {
      const messageError: MessageError = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Failed to delete message',
      };
      return { success: false, error: messageError };
    }
  }, [user?.id, messageService]);

  /**
   * Search messages
   */
  const searchMessages = useCallback(async (query: MessageSearchQuery): Promise<MessagesResult> => {
    if (!user?.id) {
      return { messages: [], total_count: 0, has_more: false };
    }

    try {
      return await messageService.searchMessages(query, user.id);
    } catch (error: any) {
      console.error('Error searching messages:', error);
      return { messages: [], total_count: 0, has_more: false };
    }
  }, [user?.id, messageService]);

  /**
   * Load conversations
   */
  const loadConversations = useCallback(async (
    filters?: ConversationFilters,
    loadMore: boolean = false
  ): Promise<void> => {
    if (!user?.id) return;

    setState(prev => ({ 
      ...prev, 
      conversationsLoading: true, 
      conversationsError: null 
    }));

    lastOperation.current = () => loadConversations(filters, loadMore);

    try {
      const offset = loadMore ? state.conversations.length : 0;
      
      const result = await conversationService.getConversations(
        user.id,
        filters,
        MESSAGING_CONSTANTS.CONVERSATION_LOAD_LIMIT,
        offset
      );

      setState(prev => ({
        ...prev,
        conversations: loadMore ? [...prev.conversations, ...result.conversations] : result.conversations,
        hasMoreConversations: result.has_more,
        conversationsLoading: false,
      }));

      // Update unread counts
      const unreadCounts: Record<string, number> = {};
      result.conversations.forEach(conv => {
        unreadCounts[conv.participant_id] = conv.unread_count;
      });

      setState(prev => ({
        ...prev,
        conversationUnreadCounts: { ...prev.conversationUnreadCounts, ...unreadCounts },
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        conversationsLoading: false,
        conversationsError: error,
      }));
    }
  }, [user?.id, conversationService, state.conversations.length]);

  /**
   * Create or get conversation
   */
  const createOrGetConversation = useCallback(async (otherUserId: string): Promise<ConversationOperationResult> => {
    if (!user?.id) {
      const error: MessageError = { code: 'PERMISSION_DENIED', message: 'User not authenticated' };
      return { success: false, error };
    }

    try {
      return await conversationService.createOrGetDirectConversation(user.id, otherUserId);
    } catch (error: any) {
      const messageError: MessageError = {
        code: 'NETWORK_ERROR',
        message: error.message || 'Failed to create conversation',
      };
      return { success: false, error: messageError };
    }
  }, [user?.id, conversationService]);

  /**
   * Archive/unarchive conversation
   */
  const archiveConversation = useCallback(async (conversationId: string, archive: boolean = true): Promise<void> => {
    if (!user?.id) return;

    try {
      await conversationService.archiveConversation(conversationId, user.id, archive);
      
      // Update local state
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.id === conversationId ? { ...conv, is_archived: archive } : conv
        ),
      }));
    } catch (error) {
      console.error('Error archiving conversation:', error);
    }
  }, [user?.id, conversationService]);

  /**
   * Search conversations
   */
  const searchConversations = useCallback(async (query: string): Promise<ConversationSummary[]> => {
    if (!user?.id) return [];

    try {
      return await conversationService.searchConversations(user.id, query);
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }, [user?.id, conversationService]);

  /**
   * Set current conversation
   */
  const setCurrentConversation = useCallback((conversationId?: string, participantId?: string): void => {
    setState(prev => ({
      ...prev,
      currentConversationId: conversationId,
      currentParticipant: participantId,
      messages: [], // Clear messages when switching conversations
      hasMoreMessages: false,
      nextMessageCursor: undefined,
    }));
  }, []);

  /**
   * Save draft message
   */
  const saveDraft = useCallback(async (conversationKey: string, content: string): Promise<void> => {
    try {
      await messageService.saveDraft(conversationKey, content);
      
      setState(prev => ({
        ...prev,
        draftMessages: {
          ...prev.draftMessages,
          [conversationKey]: content,
        },
      }));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [messageService]);

  /**
   * Get draft message
   */
  const getDraft = useCallback(async (conversationKey: string): Promise<string> => {
    try {
      const draft = await messageService.getDraft(conversationKey);
      
      setState(prev => ({
        ...prev,
        draftMessages: {
          ...prev.draftMessages,
          [conversationKey]: draft,
        },
      }));

      return draft;
    } catch (error) {
      console.error('Error getting draft:', error);
      return '';
    }
  }, [messageService]);

  /**
   * Refresh unread counts
   */
  const refreshUnreadCounts = useCallback(async (): Promise<void> => {
    if (!user?.id) return;

    try {
      const totalCount = await conversationService.getTotalUnreadCount(user.id);
      setState(prev => ({ ...prev, totalUnreadCount: totalCount }));
    } catch (error) {
      console.error('Error refreshing unread counts:', error);
    }
  }, [user?.id, conversationService]);

  /**
   * Clear errors
   */
  const clearError = useCallback((): void => {
    setState(prev => ({
      ...prev,
      messagesError: null,
      conversationsError: null,
      sendError: null,
    }));
  }, []);

  /**
   * Retry last operation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (lastOperation.current) {
      await lastOperation.current();
    }
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations();
      refreshUnreadCounts();
    }
  }, [user?.id]);

  // Process offline messages when coming online
  useEffect(() => {
    if (user?.id) {
      messageService.processOfflineMessages(user.id);
    }
  }, [user?.id, messageService]);

  return {
    // State
    ...state,
    
    // Actions
    sendMessage,
    loadMessages,
    markMessagesAsRead,
    deleteMessage,
    searchMessages,
    loadConversations,
    createOrGetConversation,
    archiveConversation,
    searchConversations,
    setCurrentConversation,
    saveDraft,
    getDraft,
    refreshUnreadCounts,
    clearError,
    retry,
  };
}
