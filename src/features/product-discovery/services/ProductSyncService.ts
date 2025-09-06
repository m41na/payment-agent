import { supabase } from '../../../shared/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ProductSyncEvent,
  ProductSyncEventType,
  ProductSyncState,
  ProductError,
  Product,
  DISCOVERY_CONSTANTS,
} from '../types';

export type ProductSyncCallback = (event: ProductSyncEvent) => void;

export class ProductSyncService {
  private static instance: ProductSyncService;
  private subscriptions: Map<string, any> = new Map();
  private callbacks: Map<string, ProductSyncCallback[]> = new Map();
  private syncState: ProductSyncState = ProductSyncState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private offlineQueue: ProductSyncEvent[] = [];

  private static readonly STORAGE_KEYS = {
    OFFLINE_SYNC_QUEUE: '@product_sync_offline_queue',
    LAST_SYNC_TIMESTAMP: '@product_sync_last_timestamp',
  };

  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAY_BASE = 1000; // 1 second

  private constructor() {
    this.initializeOfflineQueue();
  }

  static getInstance(): ProductSyncService {
    if (!ProductSyncService.instance) {
      ProductSyncService.instance = new ProductSyncService();
    }
    return ProductSyncService.instance;
  }

  /**
   * Initialize real-time synchronization
   */
  async initialize(): Promise<void> {
    try {
      this.setSyncState(ProductSyncState.CONNECTING);
      
      // Subscribe to product changes
      await this.subscribeToProducts();
      
      // Subscribe to product favorites changes
      await this.subscribeToFavorites();
      
      // Subscribe to product views
      await this.subscribeToViews();

      // Process offline queue
      await this.processOfflineQueue();

      this.setSyncState(ProductSyncState.CONNECTED);
      this.reconnectAttempts = 0;
      
      console.log('Product sync service initialized successfully');
    } catch (error) {
      console.error('Error initializing product sync service:', error);
      this.setSyncState(ProductSyncState.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    try {
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = undefined;
      }

      // Unsubscribe from all channels
      for (const [channelName, subscription] of this.subscriptions) {
        await supabase.removeChannel(subscription);
        console.log(`Unsubscribed from ${channelName}`);
      }

      this.subscriptions.clear();
      this.callbacks.clear();
      this.setSyncState(ProductSyncState.DISCONNECTED);
      
      console.log('Product sync service cleaned up');
    } catch (error) {
      console.error('Error cleaning up product sync service:', error);
    }
  }

  /**
   * Subscribe to product changes
   */
  private async subscribeToProducts(): Promise<void> {
    const channel = supabase
      .channel('products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_products',
        },
        (payload) => {
          this.handleProductChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to product changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to product changes');
          this.setSyncState(ProductSyncState.ERROR);
          this.scheduleReconnect();
        }
      });

    this.subscriptions.set('products', channel);
  }

  /**
   * Subscribe to product favorites changes
   */
  private async subscribeToFavorites(): Promise<void> {
    const channel = supabase
      .channel('product_favorites_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_product_favorites',
        },
        (payload) => {
          this.handleFavoriteChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to product favorites changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to product favorites changes');
        }
      });

    this.subscriptions.set('favorites', channel);
  }

  /**
   * Subscribe to product views
   */
  private async subscribeToViews(): Promise<void> {
    const channel = supabase
      .channel('product_views_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pg_product_views',
        },
        (payload) => {
          this.handleViewChange(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to product views changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to product views changes');
        }
      });

    this.subscriptions.set('views', channel);
  }

  /**
   * Handle product change events
   */
  private handleProductChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    let syncEventType: ProductSyncEventType;
    let product: Product | undefined;

    switch (eventType) {
      case 'INSERT':
        syncEventType = ProductSyncEventType.PRODUCT_CREATED;
        product = this.transformProductData(newRecord);
        break;
      case 'UPDATE':
        syncEventType = ProductSyncEventType.PRODUCT_UPDATED;
        product = this.transformProductData(newRecord);
        break;
      case 'DELETE':
        syncEventType = ProductSyncEventType.PRODUCT_DELETED;
        product = this.transformProductData(oldRecord);
        break;
      default:
        return;
    }

    const syncEvent: ProductSyncEvent = {
      id: `product_${Date.now()}_${Math.random()}`,
      type: syncEventType,
      timestamp: new Date().toISOString(),
      product_id: product?.id || oldRecord?.id,
      product,
      metadata: {
        table: 'pg_products',
        operation: eventType,
      },
    };

    this.emitSyncEvent(syncEvent);
  }

  /**
   * Handle favorite change events
   */
  private handleFavoriteChange(payload: any): void {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    let syncEventType: ProductSyncEventType;

    switch (eventType) {
      case 'INSERT':
        syncEventType = ProductSyncEventType.PRODUCT_FAVORITED;
        break;
      case 'DELETE':
        syncEventType = ProductSyncEventType.PRODUCT_UNFAVORITED;
        break;
      default:
        return;
    }

    const record = newRecord || oldRecord;
    const syncEvent: ProductSyncEvent = {
      id: `favorite_${Date.now()}_${Math.random()}`,
      type: syncEventType,
      timestamp: new Date().toISOString(),
      product_id: record.product_id,
      user_id: record.user_id,
      metadata: {
        table: 'pg_product_favorites',
        operation: eventType,
        favorite_id: record.id,
      },
    };

    this.emitSyncEvent(syncEvent);
  }

  /**
   * Handle view change events
   */
  private handleViewChange(payload: any): void {
    const { new: newRecord } = payload;
    
    const syncEvent: ProductSyncEvent = {
      id: `view_${Date.now()}_${Math.random()}`,
      type: ProductSyncEventType.PRODUCT_VIEWED,
      timestamp: new Date().toISOString(),
      product_id: newRecord.product_id,
      user_id: newRecord.user_id,
      metadata: {
        table: 'pg_product_views',
        operation: 'INSERT',
        view_id: newRecord.id,
      },
    };

    this.emitSyncEvent(syncEvent);
  }

  /**
   * Emit sync event to all registered callbacks
   */
  private emitSyncEvent(event: ProductSyncEvent): void {
    // Store in offline queue if disconnected
    if (this.syncState !== ProductSyncState.CONNECTED) {
      this.queueOfflineEvent(event);
      return;
    }

    // Emit to all callbacks
    for (const [, callbacks] of this.callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in sync event callback:', error);
        }
      });
    }

    // Update last sync timestamp
    this.updateLastSyncTimestamp();
  }

  /**
   * Register callback for sync events
   */
  registerCallback(key: string, callback: ProductSyncCallback): void {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }
    this.callbacks.get(key)!.push(callback);
  }

  /**
   * Unregister callback
   */
  unregisterCallback(key: string, callback?: ProductSyncCallback): void {
    if (!callback) {
      this.callbacks.delete(key);
      return;
    }

    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (callbacks.length === 0) {
        this.callbacks.delete(key);
      }
    }
  }

  /**
   * Get current sync state
   */
  getSyncState(): ProductSyncState {
    return this.syncState;
  }

  /**
   * Set sync state and notify callbacks
   */
  private setSyncState(state: ProductSyncState): void {
    if (this.syncState !== state) {
      this.syncState = state;
      
      const stateEvent: ProductSyncEvent = {
        id: `state_${Date.now()}_${Math.random()}`,
        type: ProductSyncEventType.SYNC_STATE_CHANGED,
        timestamp: new Date().toISOString(),
        metadata: {
          previous_state: this.syncState,
          new_state: state,
        },
      };

      this.emitSyncEvent(stateEvent);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= ProductSyncService.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.setSyncState(ProductSyncState.ERROR);
      return;
    }

    const delay = ProductSyncService.RECONNECT_DELAY_BASE * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Initialize offline queue from storage
   */
  private async initializeOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(ProductSyncService.STORAGE_KEYS.OFFLINE_SYNC_QUEUE);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error initializing offline queue:', error);
      this.offlineQueue = [];
    }
  }

  /**
   * Queue event for offline processing
   */
  private async queueOfflineEvent(event: ProductSyncEvent): Promise<void> {
    try {
      this.offlineQueue.push(event);
      
      // Limit queue size
      if (this.offlineQueue.length > DISCOVERY_CONSTANTS.MAX_OFFLINE_SYNC_EVENTS) {
        this.offlineQueue = this.offlineQueue.slice(-DISCOVERY_CONSTANTS.MAX_OFFLINE_SYNC_EVENTS);
      }

      await AsyncStorage.setItem(
        ProductSyncService.STORAGE_KEYS.OFFLINE_SYNC_QUEUE,
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Error queuing offline event:', error);
    }
  }

  /**
   * Process offline queue when reconnected
   */
  private async processOfflineQueue(): Promise<void> {
    try {
      if (this.offlineQueue.length === 0) return;

      console.log(`Processing ${this.offlineQueue.length} offline sync events`);

      // Process events in order
      for (const event of this.offlineQueue) {
        // Emit to all callbacks
        for (const [, callbacks] of this.callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(event);
            } catch (error) {
              console.error('Error processing offline sync event:', error);
            }
          });
        }
      }

      // Clear offline queue
      this.offlineQueue = [];
      await AsyncStorage.removeItem(ProductSyncService.STORAGE_KEYS.OFFLINE_SYNC_QUEUE);
      
      console.log('Offline sync queue processed successfully');
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTimestamp(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        ProductSyncService.STORAGE_KEYS.LAST_SYNC_TIMESTAMP,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error updating last sync timestamp:', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(ProductSyncService.STORAGE_KEYS.LAST_SYNC_TIMESTAMP);
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Transform raw product data from database
   */
  private transformProductData(rawProduct: any): Product {
    return {
      id: rawProduct.id,
      seller_id: rawProduct.seller_id,
      title: rawProduct.title,
      description: rawProduct.description,
      price: rawProduct.price,
      category: rawProduct.category,
      condition: rawProduct.condition,
      images: rawProduct.images || [],
      latitude: rawProduct.latitude,
      longitude: rawProduct.longitude,
      location_name: rawProduct.location_name,
      address: rawProduct.address,
      tags: rawProduct.tags || [],
      is_available: rawProduct.is_available,
      inventory_count: rawProduct.inventory_count,
      created_at: rawProduct.created_at,
      updated_at: rawProduct.updated_at,
      distance: rawProduct.distance,
      view_count: rawProduct.view_count || 0,
      favorite_count: rawProduct.favorite_count || 0,
    };
  }

  /**
   * Force sync refresh
   */
  async forceSyncRefresh(): Promise<void> {
    try {
      await this.cleanup();
      await this.initialize();
    } catch (error) {
      console.error('Error forcing sync refresh:', error);
      throw error;
    }
  }
}
