import { supabase } from '../../../shared/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Message,
  MessageAttachment,
  SendMessageRequest,
  MessageOperationResult,
  MessagesResult,
  MessageSearchQuery,
  MessageError,
  MessageType,
  MessageStatus,
  MESSAGE_CONSTANTS,
  MESSAGING_CONSTANTS,
} from '../types';

export class MessageService {
  private static readonly STORAGE_KEYS = {
    DRAFT_MESSAGES: '@message_drafts',
    OFFLINE_MESSAGES: '@offline_messages',
    MESSAGE_CACHE: '@message_cache',
  };

  /**
   * Send a new message
   */
  async sendMessage(request: SendMessageRequest, userId: string): Promise<MessageOperationResult> {
    try {
      // Validate message content
      if (!request.content.trim()) {
        throw this.createError('VALIDATION_ERROR', 'Message content cannot be empty');
      }

      if (request.content.length > MESSAGE_CONSTANTS.MAX_MESSAGE_LENGTH) {
        throw this.createError('MESSAGE_TOO_LONG', `Message exceeds ${MESSAGE_CONSTANTS.MAX_MESSAGE_LENGTH} characters`);
      }

      // Validate attachments
      if (request.attachments && request.attachments.length > MESSAGE_CONSTANTS.MAX_ATTACHMENTS_PER_MESSAGE) {
        throw this.createError('VALIDATION_ERROR', `Too many attachments. Maximum ${MESSAGE_CONSTANTS.MAX_ATTACHMENTS_PER_MESSAGE} allowed`);
      }

      // Determine receiver
      let receiverId = request.receiver_id;
      if (!receiverId && request.conversation_id) {
        // Get receiver from conversation
        const conversation = await this.getConversationParticipants(request.conversation_id, userId);
        receiverId = conversation.find(p => p !== userId) || '';
      }

      if (!receiverId) {
        throw this.createError('VALIDATION_ERROR', 'Receiver ID is required');
      }

      // Insert message
      const messageData = {
        sender_id: userId,
        receiver_id: receiverId,
        content: request.content.trim(),
        message_type: request.message_type || MessageType.TEXT,
        is_read: false,
        is_deleted: false,
        reply_to_id: request.reply_to_id || null,
        metadata: request.metadata || null,
      };

      const { data: message, error } = await supabase
        .from('pg_messages')
        .insert([messageData])
        .select(`
          *,
          sender:pg_profiles!sender_id(id, full_name, avatar_url),
          receiver:pg_profiles!receiver_id(id, full_name, avatar_url)
        `)
        .single();

      if (error) {
        throw this.createError('SEND_FAILED', error.message, { error });
      }

      const transformedMessage = this.transformMessageData(message);

      // Handle attachments if any
      if (request.attachments && request.attachments.length > 0) {
        await this.addMessageAttachments(transformedMessage.id, request.attachments);
      }

      // Cache message locally
      await this.cacheMessage(transformedMessage);

      return {
        success: true,
        message: transformedMessage,
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Queue message for offline sending
      await this.queueOfflineMessage(request, userId);

      return {
        success: false,
        error: error instanceof Error ? this.createError('SEND_FAILED', error.message) : error,
      };
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationParticipants: string[],
    userId: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_PAGE_SIZE,
    offset: number = 0,
    cursor?: string
  ): Promise<MessagesResult> {
    try {
      if (conversationParticipants.length !== 2) {
        throw this.createError('VALIDATION_ERROR', 'Currently only direct conversations are supported');
      }

      const [participant1, participant2] = conversationParticipants;
      
      let query = supabase
        .from('pg_messages')
        .select(`
          *,
          sender:pg_profiles!sender_id(id, full_name, avatar_url),
          receiver:pg_profiles!receiver_id(id, full_name, avatar_url),
          attachments:pg_message_attachments(*)
        `)
        .or(`and(sender_id.eq.${participant1},receiver_id.eq.${participant2}),and(sender_id.eq.${participant2},receiver_id.eq.${participant1})`)
        .eq('is_deleted', false);

      // Apply cursor-based pagination if provided
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(limit);

      const { data: messages, error } = await query;

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      const transformedMessages = (messages || [])
        .map(message => this.transformMessageData(message))
        .reverse(); // Reverse to show oldest first

      const hasMore = messages?.length === limit;
      const nextCursor = hasMore && messages.length > 0 ? messages[messages.length - 1].created_at : undefined;

      return {
        messages: transformedMessages,
        total_count: transformedMessages.length,
        has_more: hasMore,
        next_cursor: nextCursor,
      };
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      throw error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(senderId: string, receiverId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pg_messages')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('sender_id', senderId)
        .eq('receiver_id', receiverId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<MessageOperationResult> {
    try {
      // Verify user owns the message
      const { data: message, error: fetchError } = await supabase
        .from('pg_messages')
        .select('sender_id')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        throw this.createError('NOT_FOUND', 'Message not found');
      }

      if (message.sender_id !== userId) {
        throw this.createError('PERMISSION_DENIED', 'You can only delete your own messages');
      }

      // Soft delete the message
      const { data: deletedMessage, error } = await supabase
        .from('pg_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: '[Message deleted]',
        })
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      return {
        success: true,
        message: this.transformMessageData(deletedMessage),
      };
    } catch (error: any) {
      console.error('Error deleting message:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Search messages
   */
  async searchMessages(searchQuery: MessageSearchQuery, userId: string): Promise<MessagesResult> {
    try {
      let query = supabase
        .from('pg_messages')
        .select(`
          *,
          sender:pg_profiles!sender_id(id, full_name, avatar_url),
          receiver:pg_profiles!receiver_id(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('is_deleted', false);

      // Apply filters
      if (searchQuery.query) {
        query = query.ilike('content', `%${searchQuery.query}%`);
      }

      if (searchQuery.sender_id) {
        query = query.eq('sender_id', searchQuery.sender_id);
      }

      if (searchQuery.message_type) {
        query = query.eq('message_type', searchQuery.message_type);
      }

      if (searchQuery.date_from) {
        query = query.gte('created_at', searchQuery.date_from);
      }

      if (searchQuery.date_to) {
        query = query.lte('created_at', searchQuery.date_to);
      }

      if (searchQuery.is_unread !== undefined) {
        query = query.eq('is_read', !searchQuery.is_unread);
      }

      // Apply pagination
      const limit = Math.min(searchQuery.limit || MESSAGE_CONSTANTS.DEFAULT_PAGE_SIZE, MESSAGE_CONSTANTS.MAX_PAGE_SIZE);
      const offset = searchQuery.offset || 0;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: messages, error, count } = await query;

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      const transformedMessages = (messages || []).map(message => this.transformMessageData(message));

      return {
        messages: transformedMessages,
        total_count: count || 0,
        has_more: transformedMessages.length === limit,
      };
    } catch (error: any) {
      console.error('Error searching messages:', error);
      throw error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error;
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pg_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Add attachments to a message
   */
  private async addMessageAttachments(
    messageId: string,
    attachments: Omit<MessageAttachment, 'id' | 'message_id' | 'created_at'>[]
  ): Promise<void> {
    try {
      const attachmentData = attachments.map(attachment => ({
        message_id: messageId,
        ...attachment,
      }));

      const { error } = await supabase
        .from('pg_message_attachments')
        .insert(attachmentData);

      if (error) {
        console.error('Error adding message attachments:', error);
      }
    } catch (error) {
      console.error('Error adding message attachments:', error);
    }
  }

  /**
   * Get conversation participants
   */
  private async getConversationParticipants(conversationId: string, userId: string): Promise<string[]> {
    // For now, this is a placeholder since we're using direct messaging
    // In the future, this would query a conversations table
    return [];
  }

  /**
   * Queue message for offline sending
   */
  private async queueOfflineMessage(request: SendMessageRequest, userId: string): Promise<void> {
    try {
      const offlineMessage = {
        ...request,
        sender_id: userId,
        queued_at: new Date().toISOString(),
        retry_count: 0,
      };

      const existingQueue = await AsyncStorage.getItem(MessageService.STORAGE_KEYS.OFFLINE_MESSAGES);
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      
      queue.push(offlineMessage);
      
      // Limit queue size
      if (queue.length > MESSAGING_CONSTANTS.MAX_OFFLINE_MESSAGES) {
        queue.splice(0, queue.length - MESSAGING_CONSTANTS.MAX_OFFLINE_MESSAGES);
      }

      await AsyncStorage.setItem(MessageService.STORAGE_KEYS.OFFLINE_MESSAGES, JSON.stringify(queue));
    } catch (error) {
      console.error('Error queuing offline message:', error);
    }
  }

  /**
   * Process offline message queue
   */
  async processOfflineMessages(userId: string): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(MessageService.STORAGE_KEYS.OFFLINE_MESSAGES);
      if (!queueData) return;

      const queue = JSON.parse(queueData);
      const successfulMessages: any[] = [];
      const failedMessages: any[] = [];

      for (const queuedMessage of queue) {
        try {
          const result = await this.sendMessage(queuedMessage, userId);
          if (result.success) {
            successfulMessages.push(queuedMessage);
          } else {
            queuedMessage.retry_count = (queuedMessage.retry_count || 0) + 1;
            if (queuedMessage.retry_count < MESSAGE_CONSTANTS.MESSAGE_RETRY_ATTEMPTS) {
              failedMessages.push(queuedMessage);
            }
          }
        } catch (error) {
          queuedMessage.retry_count = (queuedMessage.retry_count || 0) + 1;
          if (queuedMessage.retry_count < MESSAGE_CONSTANTS.MESSAGE_RETRY_ATTEMPTS) {
            failedMessages.push(queuedMessage);
          }
        }
      }

      // Update queue with failed messages
      await AsyncStorage.setItem(
        MessageService.STORAGE_KEYS.OFFLINE_MESSAGES,
        JSON.stringify(failedMessages)
      );

      console.log(`Processed offline messages: ${successfulMessages.length} sent, ${failedMessages.length} failed`);
    } catch (error) {
      console.error('Error processing offline messages:', error);
    }
  }

  /**
   * Cache message locally
   */
  private async cacheMessage(message: Message): Promise<void> {
    try {
      const cacheKey = `${MessageService.STORAGE_KEYS.MESSAGE_CACHE}_${message.sender_id}_${message.receiver_id}`;
      const existingCache = await AsyncStorage.getItem(cacheKey);
      const cache = existingCache ? JSON.parse(existingCache) : [];
      
      // Add message to cache
      cache.unshift(message);
      
      // Limit cache size
      if (cache.length > MESSAGE_CONSTANTS.DEFAULT_PAGE_SIZE) {
        cache.splice(MESSAGE_CONSTANTS.DEFAULT_PAGE_SIZE);
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error('Error caching message:', error);
    }
  }

  /**
   * Get cached messages
   */
  async getCachedMessages(senderId: string, receiverId: string): Promise<Message[]> {
    try {
      const cacheKey = `${MessageService.STORAGE_KEYS.MESSAGE_CACHE}_${senderId}_${receiverId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (error) {
      console.error('Error getting cached messages:', error);
      return [];
    }
  }

  /**
   * Save draft message
   */
  async saveDraft(conversationKey: string, content: string): Promise<void> {
    try {
      const existingDrafts = await AsyncStorage.getItem(MessageService.STORAGE_KEYS.DRAFT_MESSAGES);
      const drafts = existingDrafts ? JSON.parse(existingDrafts) : {};
      
      if (content.trim()) {
        drafts[conversationKey] = {
          content: content.trim(),
          saved_at: new Date().toISOString(),
        };
      } else {
        delete drafts[conversationKey];
      }

      await AsyncStorage.setItem(MessageService.STORAGE_KEYS.DRAFT_MESSAGES, JSON.stringify(drafts));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }

  /**
   * Get draft message
   */
  async getDraft(conversationKey: string): Promise<string> {
    try {
      const draftsData = await AsyncStorage.getItem(MessageService.STORAGE_KEYS.DRAFT_MESSAGES);
      if (!draftsData) return '';

      const drafts = JSON.parse(draftsData);
      return drafts[conversationKey]?.content || '';
    } catch (error) {
      console.error('Error getting draft:', error);
      return '';
    }
  }

  /**
   * Transform raw message data from database
   */
  private transformMessageData(rawMessage: any): Message {
    return {
      id: rawMessage.id,
      conversation_id: rawMessage.conversation_id,
      sender_id: rawMessage.sender_id,
      receiver_id: rawMessage.receiver_id,
      content: rawMessage.content,
      message_type: rawMessage.message_type || MessageType.TEXT,
      created_at: rawMessage.created_at,
      updated_at: rawMessage.updated_at,
      is_read: rawMessage.is_read,
      read_at: rawMessage.read_at,
      is_deleted: rawMessage.is_deleted,
      deleted_at: rawMessage.deleted_at,
      reply_to_id: rawMessage.reply_to_id,
      attachments: rawMessage.attachments || [],
      metadata: rawMessage.metadata,
    };
  }

  /**
   * Create standardized error
   */
  private createError(
    code: MessageError['code'],
    message: string,
    details?: Record<string, any>
  ): MessageError {
    return {
      code,
      message,
      details,
    };
  }
}
