import { supabase } from '../../../shared/data/supabase';
import { Product, ProductSubscriptionEvent, InventoryError } from '../types';

export type SubscriptionCallback = (event: ProductSubscriptionEvent) => void;

export class SyncService {
  private readonly tableName = 'pg_products';
  private subscriptions: Map<string, any> = new Map();

  async subscribeToUserProducts(userId: string, callback: SubscriptionCallback): Promise<string> {
    try {
      const subscriptionId = `products_${userId}_${Date.now()}`;
      
      const channel = supabase
        .channel(`products_changes_${subscriptionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: this.tableName,
          filter: `seller_id=eq.${userId}`,
        }, (payload) => {
          const event: ProductSubscriptionEvent = {
            event_type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            product: payload.new as Product || payload.old as Product,
            timestamp: new Date().toISOString(),
          };
          
          callback(event);
        })
        .subscribe();

      this.subscriptions.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error setting up product subscription:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to set up real-time subscription');
    }
  }

  async subscribeToAllProducts(callback: SubscriptionCallback): Promise<string> {
    try {
      const subscriptionId = `all_products_${Date.now()}`;
      
      const channel = supabase
        .channel(`all_products_changes_${subscriptionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: this.tableName,
        }, (payload) => {
          const event: ProductSubscriptionEvent = {
            event_type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            product: payload.new as Product || payload.old as Product,
            timestamp: new Date().toISOString(),
          };
          
          callback(event);
        })
        .subscribe();

      this.subscriptions.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error setting up all products subscription:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to set up real-time subscription');
    }
  }

  async subscribeToProductById(productId: string, callback: SubscriptionCallback): Promise<string> {
    try {
      const subscriptionId = `product_${productId}_${Date.now()}`;
      
      const channel = supabase
        .channel(`product_changes_${subscriptionId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: this.tableName,
          filter: `id=eq.${productId}`,
        }, (payload) => {
          const event: ProductSubscriptionEvent = {
            event_type: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            product: payload.new as Product || payload.old as Product,
            timestamp: new Date().toISOString(),
          };
          
          callback(event);
        })
        .subscribe();

      this.subscriptions.set(subscriptionId, channel);
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error setting up single product subscription:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to set up real-time subscription');
    }
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    try {
      const channel = this.subscriptions.get(subscriptionId);
      
      if (channel) {
        await supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
      }
    } catch (error: any) {
      console.error('Error unsubscribing from channel:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to unsubscribe from real-time updates');
    }
  }

  async unsubscribeAll(): Promise<void> {
    try {
      const promises = Array.from(this.subscriptions.keys()).map(id => this.unsubscribe(id));
      await Promise.all(promises);
    } catch (error: any) {
      console.error('Error unsubscribing from all channels:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to unsubscribe from all real-time updates');
    }
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  isSubscribed(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
  }

  // Utility method to handle connection status
  onConnectionStateChange(callback: (state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void): void {
    supabase.realtime.onOpen(() => callback('SUBSCRIBED'));
    supabase.realtime.onClose(() => callback('CLOSED'));
    supabase.realtime.onError(() => callback('TIMED_OUT'));
  }

  // Method to manually trigger a sync (useful for error recovery)
  async forceSyncUserProducts(userId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error force syncing products:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  private createError(code: InventoryError['code'], message: string): InventoryError {
    return {
      code,
      message,
    };
  }
}
