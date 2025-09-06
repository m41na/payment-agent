import { supabase } from '../../../shared/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Conversation,
  ConversationSummary,
  ConversationParticipant,
  ConversationOperationResult,
  ConversationsResult,
  ConversationFilters,
  MessageParticipant,
  ConversationType,
  ParticipantRole,
  UserStatus,
  MessageError,
  MESSAGING_CONSTANTS,
} from '../types';

export class ConversationService {
  private static readonly STORAGE_KEYS = {
    CONVERSATION_CACHE: '@conversation_cache',
    PARTICIPANT_CACHE: '@participant_cache',
  };

  /**
   * Get conversations for a user
   */
  async getConversations(
    userId: string,
    filters?: ConversationFilters,
    limit: number = MESSAGING_CONSTANTS.CONVERSATION_LOAD_LIMIT,
    offset: number = 0
  ): Promise<ConversationsResult> {
    try {
      // For direct messaging, we'll get conversations from messages table
      // This is a simplified approach - in production you'd have a dedicated conversations table
      const { data: conversations, error } = await supabase
        .from('pg_messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          created_at,
          is_read,
          sender:pg_profiles!sender_id(id, full_name, avatar_url),
          receiver:pg_profiles!receiver_id(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      // Group messages by conversation participants
      const conversationMap = new Map<string, any>();
      
      conversations?.forEach(message => {
        const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        const conversationKey = [userId, otherUserId].sort().join('_');
        
        if (!conversationMap.has(conversationKey)) {
          const otherUser = message.sender_id === userId ? message.receiver : message.sender;
          conversationMap.set(conversationKey, {
            id: conversationKey,
            participant_id: otherUserId,
            participant_name: otherUser.full_name,
            participant_avatar: otherUser.avatar_url,
            last_message: message.content,
            last_message_time: message.created_at,
            last_message_type: message.message_type,
            unread_count: 0,
            is_online: false, // Would be determined by presence system
            conversation_type: ConversationType.DIRECT,
            is_archived: false,
          });
        }
      });

      // Calculate unread counts
      for (const [conversationKey, conversation] of conversationMap) {
        const unreadCount = await this.getUnreadCount(userId, conversation.participant_id);
        conversation.unread_count = unreadCount;
      }

      // Apply filters
      let filteredConversations = Array.from(conversationMap.values());
      
      if (filters?.has_unread) {
        filteredConversations = filteredConversations.filter(c => c.unread_count > 0);
      }
      
      if (filters?.is_archived !== undefined) {
        filteredConversations = filteredConversations.filter(c => c.is_archived === filters.is_archived);
      }

      // Apply pagination
      const paginatedConversations = filteredConversations.slice(offset, offset + limit);

      return {
        conversations: paginatedConversations,
        total_count: filteredConversations.length,
        has_more: filteredConversations.length > offset + limit,
      };
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      throw error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error;
    }
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId: string, userId: string): Promise<MessageParticipant[]> {
    try {
      // For direct messaging, extract participant IDs from conversation ID
      const participantIds = conversationId.split('_');
      const otherUserId = participantIds.find(id => id !== userId);
      
      if (!otherUserId) {
        return [];
      }

      const { data: participant, error } = await supabase
        .from('pg_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (error || !participant) {
        console.error('Error fetching participant:', error);
        return [];
      }

      return [{
        id: participant.id,
        user_id: participant.id,
        full_name: participant.full_name,
        avatar_url: participant.avatar_url,
        is_online: false, // Would be determined by presence system
        status: UserStatus.OFFLINE,
        role: ParticipantRole.MEMBER,
      }];
    } catch (error) {
      console.error('Error fetching conversation participants:', error);
      return [];
    }
  }

  /**
   * Create or get direct conversation
   */
  async createOrGetDirectConversation(userId: string, otherUserId: string): Promise<ConversationOperationResult> {
    try {
      if (userId === otherUserId) {
        throw this.createError('VALIDATION_ERROR', 'Cannot create conversation with yourself');
      }

      // For direct messaging, conversation ID is deterministic
      const conversationId = [userId, otherUserId].sort().join('_');
      
      // Check if conversation already exists (has messages)
      const { data: existingMessages, error: messagesError } = await supabase
        .from('pg_messages')
        .select('id')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .limit(1);

      if (messagesError) {
        throw this.createError('NETWORK_ERROR', messagesError.message, { error: messagesError });
      }

      // Get other user info
      const { data: otherUser, error: userError } = await supabase
        .from('pg_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (userError || !otherUser) {
        throw this.createError('NOT_FOUND', 'User not found');
      }

      // Create conversation object
      const conversation: Conversation = {
        id: conversationId,
        participant_ids: [userId, otherUserId],
        conversation_type: ConversationType.DIRECT,
        title: otherUser.full_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        is_archived: false,
      };

      return {
        success: true,
        conversation,
      };
    } catch (error: any) {
      console.error('Error creating/getting conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Archive/unarchive conversation
   */
  async archiveConversation(conversationId: string, userId: string, archive: boolean = true): Promise<ConversationOperationResult> {
    try {
      // For now, we'll store archive status in AsyncStorage since we don't have a conversations table
      const archiveKey = `${ConversationService.STORAGE_KEYS.CONVERSATION_CACHE}_archived_${userId}`;
      const existingArchived = await AsyncStorage.getItem(archiveKey);
      const archivedConversations = existingArchived ? JSON.parse(existingArchived) : [];
      
      if (archive) {
        if (!archivedConversations.includes(conversationId)) {
          archivedConversations.push(conversationId);
        }
      } else {
        const index = archivedConversations.indexOf(conversationId);
        if (index > -1) {
          archivedConversations.splice(index, 1);
        }
      }

      await AsyncStorage.setItem(archiveKey, JSON.stringify(archivedConversations));

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Error archiving conversation:', error);
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get unread message count for a conversation
   */
  async getUnreadCount(userId: string, otherUserId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pg_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', otherUserId)
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
   * Get total unread count across all conversations
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pg_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error('Error fetching total unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching total unread count:', error);
      return 0;
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(userId: string, query: string): Promise<ConversationSummary[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      // Search by participant name or recent message content
      const { data: messages, error } = await supabase
        .from('pg_messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          created_at,
          is_read,
          sender:pg_profiles!sender_id(id, full_name, avatar_url),
          receiver:pg_profiles!receiver_id(id, full_name, avatar_url)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('is_deleted', false)
        .or(`content.ilike.%${query}%,sender.full_name.ilike.%${query}%,receiver.full_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      // Group by conversation and return unique conversations
      const conversationMap = new Map<string, ConversationSummary>();
      
      messages?.forEach(message => {
        const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
        const conversationKey = [userId, otherUserId].sort().join('_');
        
        if (!conversationMap.has(conversationKey)) {
          const otherUser = message.sender_id === userId ? message.receiver : message.sender;
          conversationMap.set(conversationKey, {
            id: conversationKey,
            participant_id: otherUserId,
            participant_name: otherUser.full_name,
            participant_avatar: otherUser.avatar_url,
            last_message: message.content,
            last_message_time: message.created_at,
            last_message_type: message.message_type,
            unread_count: 0,
            is_online: false,
            conversation_type: ConversationType.DIRECT,
            is_archived: false,
          });
        }
      });

      return Array.from(conversationMap.values());
    } catch (error: any) {
      console.error('Error searching conversations:', error);
      throw error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error;
    }
  }

  /**
   * Update conversation last activity
   */
  async updateLastActivity(conversationId: string): Promise<void> {
    try {
      // For direct messaging, we don't need to update a separate conversations table
      // The last activity is determined by the latest message timestamp
      console.log(`Updated last activity for conversation: ${conversationId}`);
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string, userId: string): Promise<Conversation | null> {
    try {
      // For direct messaging, parse participant IDs from conversation ID
      const participantIds = conversationId.split('_');
      
      if (participantIds.length !== 2 || !participantIds.includes(userId)) {
        return null;
      }

      const otherUserId = participantIds.find(id => id !== userId);
      if (!otherUserId) {
        return null;
      }

      // Get other user info
      const { data: otherUser, error } = await supabase
        .from('pg_profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (error || !otherUser) {
        return null;
      }

      // Get latest message for last activity
      const { data: latestMessage } = await supabase
        .from('pg_messages')
        .select('created_at')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        id: conversationId,
        participant_ids: participantIds,
        conversation_type: ConversationType.DIRECT,
        title: otherUser.full_name,
        created_at: latestMessage?.created_at || new Date().toISOString(),
        updated_at: latestMessage?.created_at || new Date().toISOString(),
        last_activity_at: latestMessage?.created_at || new Date().toISOString(),
        is_archived: false,
      };
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  /**
   * Check if conversation is archived
   */
  async isConversationArchived(conversationId: string, userId: string): Promise<boolean> {
    try {
      const archiveKey = `${ConversationService.STORAGE_KEYS.CONVERSATION_CACHE}_archived_${userId}`;
      const existingArchived = await AsyncStorage.getItem(archiveKey);
      const archivedConversations = existingArchived ? JSON.parse(existingArchived) : [];
      
      return archivedConversations.includes(conversationId);
    } catch (error) {
      console.error('Error checking if conversation is archived:', error);
      return false;
    }
  }

  /**
   * Cache conversation data
   */
  async cacheConversation(conversation: Conversation): Promise<void> {
    try {
      const cacheKey = `${ConversationService.STORAGE_KEYS.CONVERSATION_CACHE}_${conversation.id}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(conversation));
    } catch (error) {
      console.error('Error caching conversation:', error);
    }
  }

  /**
   * Get cached conversation
   */
  async getCachedConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const cacheKey = `${ConversationService.STORAGE_KEYS.CONVERSATION_CACHE}_${conversationId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error getting cached conversation:', error);
      return null;
    }
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
