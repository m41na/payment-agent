import { supabase } from '../../../shared/data/supabase';
import {
  CartUpdateEvent,
  CartSubscriptionEvent,
  CART_STORAGE_KEY,
} from '../types';

export interface CartSyncCallbacks {
  onCartUpdate?: (event: CartUpdateEvent) => void;
  onConnectionStateChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export class CartSyncService {
  private subscription: any = null;
  private callbacks: CartSyncCallbacks = {};
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  /**
   * Initialize real-time cart synchronization
   */
  async initialize(userId: string, callbacks: CartSyncCallbacks = {}): Promise<void> {
    try {
      this.callbacks = callbacks;
      await this.setupCartSubscription(userId);
    } catch (error) {
      console.error('Error initializing cart sync:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Setup Supabase subscription for cart updates
   */
  private async setupCartSubscription(userId: string): Promise<void> {
    try {
      // Clean up existing subscription
      if (this.subscription) {
        await this.cleanup();
      }

      this.subscription = supabase
        .channel(`cart_updates_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pg_cart_items',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            this.handleCartUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log('Cart subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.callbacks.onConnectionStateChange?.(true);
          } else if (status === 'CLOSED') {
            this.isConnected = false;
            this.callbacks.onConnectionStateChange?.(false);
            this.handleReconnection(userId);
          } else if (status === 'CHANNEL_ERROR') {
            this.isConnected = false;
            this.callbacks.onConnectionStateChange?.(false);
            this.callbacks.onError?.(new Error('Cart subscription channel error'));
            this.handleReconnection(userId);
          }
        });
    } catch (error) {
      console.error('Error setting up cart subscription:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Handle cart update events
   */
  private handleCartUpdate(payload: any): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      let event: CartUpdateEvent;
      const timestamp = new Date().toISOString();

      switch (eventType) {
        case 'INSERT':
          event = {
            type: 'item_added',
            user_id: newRecord.user_id,
            cart_id: `cart_${newRecord.user_id}`,
            item_id: newRecord.id,
            changes: newRecord,
            timestamp,
          };
          break;

        case 'UPDATE':
          event = {
            type: 'item_updated',
            user_id: newRecord.user_id,
            cart_id: `cart_${newRecord.user_id}`,
            item_id: newRecord.id,
            changes: this.getChanges(oldRecord, newRecord),
            timestamp,
          };
          break;

        case 'DELETE':
          event = {
            type: 'item_removed',
            user_id: oldRecord.user_id,
            cart_id: `cart_${oldRecord.user_id}`,
            item_id: oldRecord.id,
            changes: oldRecord,
            timestamp,
          };
          break;

        default:
          console.warn('Unknown cart update event type:', eventType);
          return;
      }

      // Cache the event for offline support
      this.cacheCartEvent(event);

      // Notify callbacks
      this.callbacks.onCartUpdate?.(event);
    } catch (error) {
      console.error('Error handling cart update:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(userId: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for cart sync');
      this.callbacks.onError?.(new Error('Failed to reconnect cart sync after maximum attempts'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect cart sync (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.setupCartSubscription(userId);
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.handleReconnection(userId);
      }
    }, delay);
  }

  /**
   * Get changes between old and new records
   */
  private getChanges(oldRecord: any, newRecord: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    for (const key in newRecord) {
      if (newRecord[key] !== oldRecord[key]) {
        changes[key] = {
          old: oldRecord[key],
          new: newRecord[key],
        };
      }
    }
    
    return changes;
  }

  /**
   * Cache cart event for offline support
   */
  private async cacheCartEvent(event: CartUpdateEvent): Promise<void> {
    try {
      const cachedEvents = await this.getCachedEvents();
      cachedEvents.push(event);
      
      // Keep only last 50 events
      if (cachedEvents.length > 50) {
        cachedEvents.splice(0, cachedEvents.length - 50);
      }
      
      await this.setCachedEvents(cachedEvents);
    } catch (error) {
      console.error('Error caching cart event:', error);
    }
  }

  /**
   * Get cached events from storage
   */
  private async getCachedEvents(): Promise<CartUpdateEvent[]> {
    try {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const cached = await AsyncStorage.getItem(`${CART_STORAGE_KEY}_events`);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached events:', error);
      return [];
    }
  }

  /**
   * Set cached events to storage
   */
  private async setCachedEvents(events: CartUpdateEvent[]): Promise<void> {
    try {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem(`${CART_STORAGE_KEY}_events`, JSON.stringify(events));
    } catch (error) {
      console.error('Error setting cached events:', error);
    }
  }

  /**
   * Get connection state
   */
  getConnectionState(): boolean {
    return this.isConnected;
  }

  /**
   * Get reconnection info
   */
  getReconnectionInfo(): { attempts: number; maxAttempts: number; isReconnecting: boolean } {
    return {
      attempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      isReconnecting: this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts,
    };
  }

  /**
   * Manually trigger reconnection
   */
  async reconnect(userId: string): Promise<void> {
    this.reconnectAttempts = 0;
    await this.setupCartSubscription(userId);
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<CartSyncCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Simulate cart clear event (for manual cart clearing)
   */
  simulateCartClear(userId: string): void {
    const event: CartUpdateEvent = {
      type: 'cart_cleared',
      user_id: userId,
      cart_id: `cart_${userId}`,
      timestamp: new Date().toISOString(),
    };

    this.cacheCartEvent(event);
    this.callbacks.onCartUpdate?.(event);
  }

  /**
   * Get cached events for offline sync
   */
  async getOfflineEvents(): Promise<CartUpdateEvent[]> {
    return await this.getCachedEvents();
  }

  /**
   * Clear cached events
   */
  async clearCachedEvents(): Promise<void> {
    try {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.removeItem(`${CART_STORAGE_KEY}_events`);
    } catch (error) {
      console.error('Error clearing cached events:', error);
    }
  }

  /**
   * Cleanup subscriptions and resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.subscription) {
        await supabase.removeChannel(this.subscription);
        this.subscription = null;
      }
      
      this.isConnected = false;
      this.reconnectAttempts = 0;
      this.callbacks = {};
    } catch (error) {
      console.error('Error cleaning up cart sync:', error);
    }
  }
}
