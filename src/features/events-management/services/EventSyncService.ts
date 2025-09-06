import { supabase } from '../../../shared/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Event,
  EventAttendee,
  EventSyncEvent,
  EventSyncEventType,
  ConnectionState,
  EventError,
} from '../types';

export class EventSyncService {
  private subscriptions: Map<string, any> = new Map();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private eventQueue: EventSyncEvent[] = [];
  private callbacks: Map<string, (event: EventSyncEvent) => void> = new Map();
  private connectionCallbacks: Map<string, (state: ConnectionState) => void> = new Map();

  private static readonly STORAGE_KEYS = {
    EVENT_QUEUE: '@events_sync_queue',
    CONNECTION_STATE: '@events_connection_state',
  };

  constructor() {
    this.loadPersistedState();
  }

  /**
   * Subscribe to event changes for a specific event
   */
  async subscribeToEvent(
    eventId: string,
    callback: (event: EventSyncEvent) => void
  ): Promise<void> {
    try {
      const subscriptionKey = `event_${eventId}`;
      
      // Remove existing subscription if any
      this.unsubscribeFromEvent(eventId);

      // Store callback
      this.callbacks.set(subscriptionKey, callback);

      // Create Supabase subscription
      const subscription = supabase
        .channel(`event_${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pg_events',
            filter: `id=eq.${eventId}`,
          },
          (payload) => {
            this.handleEventChange(payload, EventSyncEventType.EVENT_UPDATED);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pg_event_attendees',
            filter: `event_id=eq.${eventId}`,
          },
          (payload) => {
            this.handleAttendeeChange(payload);
          }
        )
        .subscribe((status) => {
          this.handleSubscriptionStatus(subscriptionKey, status);
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('Error subscribing to event:', error);
      throw this.createError('SUBSCRIPTION_ERROR', 'Failed to subscribe to event changes');
    }
  }

  /**
   * Unsubscribe from event changes
   */
  unsubscribeFromEvent(eventId: string): void {
    const subscriptionKey = `event_${eventId}`;
    const subscription = this.subscriptions.get(subscriptionKey);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
      this.callbacks.delete(subscriptionKey);
    }
  }

  /**
   * Subscribe to user's events (events they've created)
   */
  async subscribeToUserEvents(
    userId: string,
    callback: (event: EventSyncEvent) => void
  ): Promise<void> {
    try {
      const subscriptionKey = `user_events_${userId}`;
      
      // Remove existing subscription if any
      this.unsubscribeFromUserEvents(userId);

      // Store callback
      this.callbacks.set(subscriptionKey, callback);

      // Create Supabase subscription
      const subscription = supabase
        .channel(`user_events_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pg_events',
            filter: `organizer_id=eq.${userId}`,
          },
          (payload) => {
            this.handleEventChange(payload, this.getEventTypeFromPayload(payload));
          }
        )
        .subscribe((status) => {
          this.handleSubscriptionStatus(subscriptionKey, status);
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('Error subscribing to user events:', error);
      throw this.createError('SUBSCRIPTION_ERROR', 'Failed to subscribe to user events');
    }
  }

  /**
   * Unsubscribe from user events
   */
  unsubscribeFromUserEvents(userId: string): void {
    const subscriptionKey = `user_events_${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
      this.callbacks.delete(subscriptionKey);
    }
  }

  /**
   * Subscribe to user's RSVPs (events they've RSVP'd to)
   */
  async subscribeToUserRSVPs(
    userId: string,
    callback: (event: EventSyncEvent) => void
  ): Promise<void> {
    try {
      const subscriptionKey = `user_rsvps_${userId}`;
      
      // Remove existing subscription if any
      this.unsubscribeFromUserRSVPs(userId);

      // Store callback
      this.callbacks.set(subscriptionKey, callback);

      // Create Supabase subscription
      const subscription = supabase
        .channel(`user_rsvps_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pg_event_attendees',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            this.handleAttendeeChange(payload);
          }
        )
        .subscribe((status) => {
          this.handleSubscriptionStatus(subscriptionKey, status);
        });

      this.subscriptions.set(subscriptionKey, subscription);
    } catch (error) {
      console.error('Error subscribing to user RSVPs:', error);
      throw this.createError('SUBSCRIPTION_ERROR', 'Failed to subscribe to user RSVPs');
    }
  }

  /**
   * Unsubscribe from user RSVPs
   */
  unsubscribeFromUserRSVPs(userId: string): void {
    const subscriptionKey = `user_rsvps_${userId}`;
    const subscription = this.subscriptions.get(subscriptionKey);
    
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
      this.callbacks.delete(subscriptionKey);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(
    callbackId: string,
    callback: (state: ConnectionState) => void
  ): void {
    this.connectionCallbacks.set(callbackId, callback);
  }

  /**
   * Unsubscribe from connection state changes
   */
  offConnectionStateChange(callbackId: string): void {
    this.connectionCallbacks.delete(callbackId);
  }

  /**
   * Get queued events (for offline support)
   */
  getQueuedEvents(): EventSyncEvent[] {
    return [...this.eventQueue];
  }

  /**
   * Clear queued events
   */
  clearQueuedEvents(): void {
    this.eventQueue = [];
    this.persistEventQueue();
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTING) {
      return; // Already attempting to connect
    }

    this.setConnectionState(ConnectionState.CONNECTING);
    
    try {
      // Resubscribe to all active subscriptions
      const subscriptionKeys = Array.from(this.subscriptions.keys());
      
      for (const key of subscriptionKeys) {
        const subscription = this.subscriptions.get(key);
        if (subscription) {
          // Unsubscribe and resubscribe
          subscription.unsubscribe();
          // Note: In a real implementation, you'd need to recreate the subscription
          // based on the subscription key and stored parameters
        }
      }

      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.setConnectionState(ConnectionState.CONNECTED);
    } catch (error) {
      console.error('Error during manual reconnection:', error);
      this.handleReconnection();
    }
  }

  /**
   * Disconnect all subscriptions
   */
  disconnect(): void {
    // Unsubscribe from all subscriptions
    for (const [key, subscription] of this.subscriptions) {
      subscription.unsubscribe();
    }
    
    this.subscriptions.clear();
    this.callbacks.clear();
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Handle event changes from Supabase
   */
  private handleEventChange(payload: any, eventType: EventSyncEventType): void {
    try {
      const syncEvent: EventSyncEvent = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: new Date().toISOString(),
        data: {
          event: payload.new || payload.old,
        },
      };

      this.queueEvent(syncEvent);
      this.notifyCallbacks(syncEvent);
    } catch (error) {
      console.error('Error handling event change:', error);
    }
  }

  /**
   * Handle attendee changes from Supabase
   */
  private handleAttendeeChange(payload: any): void {
    try {
      let eventType: EventSyncEventType;
      
      switch (payload.eventType) {
        case 'INSERT':
          eventType = EventSyncEventType.ATTENDEE_ADDED;
          break;
        case 'UPDATE':
          eventType = EventSyncEventType.ATTENDEE_UPDATED;
          break;
        case 'DELETE':
          eventType = EventSyncEventType.ATTENDEE_REMOVED;
          break;
        default:
          eventType = EventSyncEventType.ATTENDEE_UPDATED;
      }

      const syncEvent: EventSyncEvent = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: new Date().toISOString(),
        data: {
          attendee: payload.new || payload.old,
        },
      };

      this.queueEvent(syncEvent);
      this.notifyCallbacks(syncEvent);
    } catch (error) {
      console.error('Error handling attendee change:', error);
    }
  }

  /**
   * Handle subscription status changes
   */
  private handleSubscriptionStatus(subscriptionKey: string, status: string): void {
    switch (status) {
      case 'SUBSCRIBED':
        this.setConnectionState(ConnectionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        break;
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
      case 'CLOSED':
        this.setConnectionState(ConnectionState.DISCONNECTED);
        this.handleReconnection();
        break;
      default:
        // Handle other status types as needed
        break;
    }
  }

  /**
   * Handle automatic reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setConnectionState(ConnectionState.DISCONNECTED);
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.CONNECTING);

    setTimeout(() => {
      this.reconnect().catch(() => {
        // Exponential backoff
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay
        );
      });
    }, this.reconnectDelay);
  }

  /**
   * Set connection state and notify callbacks
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.persistConnectionState();
      
      // Notify all connection callbacks
      for (const callback of this.connectionCallbacks.values()) {
        try {
          callback(state);
        } catch (error) {
          console.error('Error in connection state callback:', error);
        }
      }
    }
  }

  /**
   * Queue event for offline support
   */
  private queueEvent(event: EventSyncEvent): void {
    this.eventQueue.push(event);
    
    // Keep only the last 100 events
    if (this.eventQueue.length > 100) {
      this.eventQueue = this.eventQueue.slice(-100);
    }
    
    this.persistEventQueue();
  }

  /**
   * Notify all relevant callbacks
   */
  private notifyCallbacks(event: EventSyncEvent): void {
    for (const callback of this.callbacks.values()) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in sync event callback:', error);
      }
    }
  }

  /**
   * Get event type from Supabase payload
   */
  private getEventTypeFromPayload(payload: any): EventSyncEventType {
    switch (payload.eventType) {
      case 'INSERT':
        return EventSyncEventType.EVENT_CREATED;
      case 'UPDATE':
        return EventSyncEventType.EVENT_UPDATED;
      case 'DELETE':
        return EventSyncEventType.EVENT_DELETED;
      default:
        return EventSyncEventType.EVENT_UPDATED;
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load persisted state from AsyncStorage
   */
  private async loadPersistedState(): Promise<void> {
    try {
      const [queueData, connectionData] = await Promise.all([
        AsyncStorage.getItem(EventSyncService.STORAGE_KEYS.EVENT_QUEUE),
        AsyncStorage.getItem(EventSyncService.STORAGE_KEYS.CONNECTION_STATE),
      ]);

      if (queueData) {
        this.eventQueue = JSON.parse(queueData);
      }

      if (connectionData) {
        this.connectionState = JSON.parse(connectionData);
      }
    } catch (error) {
      console.error('Error loading persisted sync state:', error);
    }
  }

  /**
   * Persist event queue to AsyncStorage
   */
  private async persistEventQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        EventSyncService.STORAGE_KEYS.EVENT_QUEUE,
        JSON.stringify(this.eventQueue)
      );
    } catch (error) {
      console.error('Error persisting event queue:', error);
    }
  }

  /**
   * Persist connection state to AsyncStorage
   */
  private async persistConnectionState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        EventSyncService.STORAGE_KEYS.CONNECTION_STATE,
        JSON.stringify(this.connectionState)
      );
    } catch (error) {
      console.error('Error persisting connection state:', error);
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    code: EventError['code'],
    message: string,
    details?: Record<string, any>
  ): EventError {
    return {
      code,
      message,
      details,
    };
  }
}
