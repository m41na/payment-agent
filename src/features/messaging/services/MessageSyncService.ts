import { supabase } from '../../../services/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Message,
  MessageSyncEvent,
  MessageSyncEventType,
  MessageSyncState,
  TypingIndicator,
  MessageError,
  MESSAGING_CONSTANTS,
} from '../types';

export class MessageSyncService {
  private static instance: MessageSyncService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private syncState: MessageSyncState = MessageSyncState.DISCONNECTED;
  private eventCallbacks: Map<string, Set<(event: MessageSyncEvent) => void>> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();
  private offlineEvents: MessageSyncEvent[] = [];
  private isOnline: boolean = true;

  private static readonly STORAGE_KEYS = {
    OFFLINE_EVENTS: '@message_sync_offline_events',
    SYNC_STATE: '@message_sync_state',
  };

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): MessageSyncService {
    if (!MessageSyncService.instance) {
      MessageSyncService.instance = new MessageSyncService();
    }
    return MessageSyncService.instance;
  }

  /**
   * Initialize network connectivity listener
   */
  private initializeNetworkListener(): void {
    // In a real React Native app, you'd use @react-native-community/netinfo
    // For now, we'll assume online connectivity
    this.isOnline = true;
  }

  /**
   * Subscribe to message events for a conversation
   */
  async subscribeToConversation(
    conversationId: string,
    userId: string,
    callback: (event: MessageSyncEvent) => void
  ): Promise<boolean> {
    try {
      // Register callback
      if (!this.eventCallbacks.has(conversationId)) {
        this.eventCallbacks.set(conversationId, new Set());
      }
      this.eventCallbacks.get(conversationId)!.add(callback);

      // Check if already subscribed
      if (this.channels.has(conversationId)) {
        return true;
      }

      // Create channel for this conversation
      const channel = supabase.channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pg_messages',
            filter: `or(and(sender_id.eq.${userId.split('_')[0]},receiver_id.eq.${userId.split('_')[1]}),and(sender_id.eq.${userId.split('_')[1]},receiver_id.eq.${userId.split('_')[0]}))`,
          },
          (payload) => this.handleMessageInsert(payload, conversationId)
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pg_messages',
            filter: `or(and(sender_id.eq.${userId.split('_')[0]},receiver_id.eq.${userId.split('_')[1]}),and(sender_id.eq.${userId.split('_')[1]},receiver_id.eq.${userId.split('_')[0]}))`,
          },
          (payload) => this.handleMessageUpdate(payload, conversationId)
        )
        .subscribe((status) => {
          console.log(`Subscription status for ${conversationId}:`, status);
          this.updateSyncState(status === 'SUBSCRIBED' ? MessageSyncState.CONNECTED : MessageSyncState.CONNECTING);
        });

      this.channels.set(conversationId, channel);
      this.updateSyncState(MessageSyncState.CONNECTING);

      return true;
    } catch (error) {
      console.error('Error subscribing to conversation:', error);
      this.updateSyncState(MessageSyncState.ERROR);
      return false;
    }
  }

  /**
   * Unsubscribe from conversation events
   */
  async unsubscribeFromConversation(conversationId: string, callback?: (event: MessageSyncEvent) => void): Promise<void> {
    try {
      // Remove specific callback or all callbacks
      if (callback && this.eventCallbacks.has(conversationId)) {
        this.eventCallbacks.get(conversationId)!.delete(callback);
        
        // If no more callbacks, unsubscribe completely
        if (this.eventCallbacks.get(conversationId)!.size === 0) {
          this.eventCallbacks.delete(conversationId);
        } else {
          return; // Still have other callbacks, don't unsubscribe
        }
      } else {
        this.eventCallbacks.delete(conversationId);
      }

      // Unsubscribe from channel
      const channel = this.channels.get(conversationId);
      if (channel) {
        await supabase.removeChannel(channel);
        this.channels.delete(conversationId);
      }

      // Clear typing timer
      const typingTimer = this.typingTimers.get(conversationId);
      if (typingTimer) {
        clearTimeout(typingTimer);
        this.typingTimers.delete(conversationId);
      }

      console.log(`Unsubscribed from conversation: ${conversationId}`);
    } catch (error) {
      console.error('Error unsubscribing from conversation:', error);
    }
  }

  /**
   * Subscribe to global message events for a user
   */
  async subscribeToUserMessages(
    userId: string,
    callback: (event: MessageSyncEvent) => void
  ): Promise<boolean> {
    try {
      const channelKey = `user:${userId}`;
      
      // Register callback
      if (!this.eventCallbacks.has(channelKey)) {
        this.eventCallbacks.set(channelKey, new Set());
      }
      this.eventCallbacks.get(channelKey)!.add(callback);

      // Check if already subscribed
      if (this.channels.has(channelKey)) {
        return true;
      }

      // Create channel for user messages
      const channel = supabase.channel(`user_messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pg_messages',
            filter: `or(sender_id.eq.${userId},receiver_id.eq.${userId})`,
          },
          (payload) => this.handleUserMessageEvent(payload, userId)
        )
        .subscribe((status) => {
          console.log(`User messages subscription status:`, status);
          this.updateSyncState(status === 'SUBSCRIBED' ? MessageSyncState.CONNECTED : MessageSyncState.CONNECTING);
        });

      this.channels.set(channelKey, channel);
      return true;
    } catch (error) {
      console.error('Error subscribing to user messages:', error);
      this.updateSyncState(MessageSyncState.ERROR);
      return false;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, userId: string, userName: string): Promise<void> {
    try {
      if (!this.isOnline) {
        return;
      }

      const typingEvent: MessageSyncEvent = {
        id: `typing_${Date.now()}`,
        type: MessageSyncEventType.USER_TYPING,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        user_id: userId,
        metadata: {
          user_name: userName,
          expires_at: new Date(Date.now() + MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS).toISOString(),
        },
      };

      // Broadcast typing event
      this.broadcastEvent(conversationId, typingEvent);

      // Clear existing typing timer
      const existingTimer = this.typingTimers.get(conversationId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer to stop typing indicator
      const timer = setTimeout(() => {
        this.stopTypingIndicator(conversationId, userId);
      }, MESSAGING_CONSTANTS.TYPING_DEBOUNCE_MS);

      this.typingTimers.set(conversationId, timer);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  /**
   * Stop typing indicator
   */
  private stopTypingIndicator(conversationId: string, userId: string): void {
    const timer = this.typingTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(conversationId);
    }
  }

  /**
   * Get current sync state
   */
  getSyncState(): MessageSyncState {
    return this.syncState;
  }

  /**
   * Force reconnect all subscriptions
   */
  async reconnect(): Promise<void> {
    try {
      this.updateSyncState(MessageSyncState.CONNECTING);
      
      // Unsubscribe from all channels
      for (const [key, channel] of this.channels) {
        await supabase.removeChannel(channel);
      }
      this.channels.clear();

      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Resubscribe to all conversations
      const conversationCallbacks = Array.from(this.eventCallbacks.entries());
      this.eventCallbacks.clear();

      for (const [key, callbacks] of conversationCallbacks) {
        if (key.startsWith('user:')) {
          const userId = key.replace('user:', '');
          for (const callback of callbacks) {
            await this.subscribeToUserMessages(userId, callback);
          }
        } else {
          // Conversation subscription
          const userId = key; // This would need to be properly extracted
          for (const callback of callbacks) {
            await this.subscribeToConversation(key, userId, callback);
          }
        }
      }

      this.reconnectAttempts = 0;
      console.log('Successfully reconnected all subscriptions');
    } catch (error) {
      console.error('Error reconnecting:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MESSAGING_CONSTANTS.SYNC_RETRY_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.updateSyncState(MessageSyncState.ERROR);
      return;
    }

    const delay = MESSAGING_CONSTANTS.SYNC_RETRY_DELAY_BASE * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
  }

  /**
   * Handle message insert event
   */
  private handleMessageInsert(payload: any, conversationId: string): void {
    try {
      const message = payload.new;
      const syncEvent: MessageSyncEvent = {
        id: `insert_${message.id}`,
        type: MessageSyncEventType.MESSAGE_RECEIVED,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        message_id: message.id,
        user_id: message.sender_id,
        message: this.transformMessageData(message),
      };

      this.broadcastEvent(conversationId, syncEvent);
    } catch (error) {
      console.error('Error handling message insert:', error);
    }
  }

  /**
   * Handle message update event
   */
  private handleMessageUpdate(payload: any, conversationId: string): void {
    try {
      const message = payload.new;
      const oldMessage = payload.old;

      let eventType = MessageSyncEventType.MESSAGE_UPDATED;
      
      // Determine specific event type
      if (message.is_read && !oldMessage.is_read) {
        eventType = MessageSyncEventType.MESSAGE_READ;
      } else if (message.is_deleted && !oldMessage.is_deleted) {
        eventType = MessageSyncEventType.MESSAGE_DELETED;
      }

      const syncEvent: MessageSyncEvent = {
        id: `update_${message.id}`,
        type: eventType,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        message_id: message.id,
        user_id: message.sender_id,
        message: this.transformMessageData(message),
      };

      this.broadcastEvent(conversationId, syncEvent);
    } catch (error) {
      console.error('Error handling message update:', error);
    }
  }

  /**
   * Handle user message events
   */
  private handleUserMessageEvent(payload: any, userId: string): void {
    try {
      const message = payload.new || payload.old;
      const eventType = payload.eventType;

      let syncEventType: MessageSyncEventType;
      switch (eventType) {
        case 'INSERT':
          syncEventType = message.sender_id === userId 
            ? MessageSyncEventType.MESSAGE_SENT 
            : MessageSyncEventType.MESSAGE_RECEIVED;
          break;
        case 'UPDATE':
          syncEventType = MessageSyncEventType.MESSAGE_UPDATED;
          break;
        case 'DELETE':
          syncEventType = MessageSyncEventType.MESSAGE_DELETED;
          break;
        default:
          return;
      }

      const conversationId = [message.sender_id, message.receiver_id].sort().join('_');
      
      const syncEvent: MessageSyncEvent = {
        id: `user_${eventType}_${message.id}`,
        type: syncEventType,
        timestamp: new Date().toISOString(),
        conversation_id: conversationId,
        message_id: message.id,
        user_id: message.sender_id,
        message: this.transformMessageData(message),
      };

      this.broadcastEvent(`user:${userId}`, syncEvent);
    } catch (error) {
      console.error('Error handling user message event:', error);
    }
  }

  /**
   * Broadcast event to registered callbacks
   */
  private broadcastEvent(channelKey: string, event: MessageSyncEvent): void {
    const callbacks = this.eventCallbacks.get(channelKey);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in sync event callback:', error);
        }
      });
    }

    // If offline, queue the event
    if (!this.isOnline) {
      this.queueOfflineEvent(event);
    }
  }

  /**
   * Update sync state and notify listeners
   */
  private updateSyncState(newState: MessageSyncState): void {
    if (this.syncState !== newState) {
      this.syncState = newState;
      
      const stateEvent: MessageSyncEvent = {
        id: `state_${Date.now()}`,
        type: MessageSyncEventType.SYNC_STATE_CHANGED,
        timestamp: new Date().toISOString(),
        metadata: { state: newState },
      };

      // Broadcast to all channels
      for (const channelKey of this.eventCallbacks.keys()) {
        this.broadcastEvent(channelKey, stateEvent);
      }

      console.log(`Sync state changed to: ${newState}`);
    }
  }

  /**
   * Queue event for offline processing
   */
  private async queueOfflineEvent(event: MessageSyncEvent): Promise<void> {
    try {
      this.offlineEvents.push(event);
      
      // Limit queue size
      if (this.offlineEvents.length > MESSAGING_CONSTANTS.MAX_OFFLINE_MESSAGES) {
        this.offlineEvents.splice(0, this.offlineEvents.length - MESSAGING_CONSTANTS.MAX_OFFLINE_MESSAGES);
      }

      await AsyncStorage.setItem(
        MessageSyncService.STORAGE_KEYS.OFFLINE_EVENTS,
        JSON.stringify(this.offlineEvents)
      );
    } catch (error) {
      console.error('Error queuing offline event:', error);
    }
  }

  /**
   * Process offline events when coming back online
   */
  async processOfflineEvents(): Promise<void> {
    try {
      const offlineData = await AsyncStorage.getItem(MessageSyncService.STORAGE_KEYS.OFFLINE_EVENTS);
      if (!offlineData) return;

      const events: MessageSyncEvent[] = JSON.parse(offlineData);
      
      // Process events in chronological order
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      for (const event of events) {
        // Re-broadcast the event
        if (event.conversation_id) {
          this.broadcastEvent(event.conversation_id, event);
        }
      }

      // Clear offline events
      this.offlineEvents = [];
      await AsyncStorage.removeItem(MessageSyncService.STORAGE_KEYS.OFFLINE_EVENTS);

      console.log(`Processed ${events.length} offline events`);
    } catch (error) {
      console.error('Error processing offline events:', error);
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    try {
      // Clear all timers
      for (const timer of this.typingTimers.values()) {
        clearTimeout(timer);
      }
      this.typingTimers.clear();

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Unsubscribe from all channels
      for (const [key, channel] of this.channels) {
        await supabase.removeChannel(channel);
      }
      this.channels.clear();
      this.eventCallbacks.clear();

      this.updateSyncState(MessageSyncState.DISCONNECTED);
      console.log('Message sync service cleaned up');
    } catch (error) {
      console.error('Error cleaning up sync service:', error);
    }
  }

  /**
   * Transform raw message data
   */
  private transformMessageData(rawMessage: any): Message {
    return {
      id: rawMessage.id,
      conversation_id: rawMessage.conversation_id,
      sender_id: rawMessage.sender_id,
      receiver_id: rawMessage.receiver_id,
      content: rawMessage.content,
      message_type: rawMessage.message_type,
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
   * Get connection health status
   */
  getConnectionHealth(): {
    state: MessageSyncState;
    activeChannels: number;
    reconnectAttempts: number;
    isOnline: boolean;
  } {
    return {
      state: this.syncState,
      activeChannels: this.channels.size,
      reconnectAttempts: this.reconnectAttempts,
      isOnline: this.isOnline,
    };
  }
}
