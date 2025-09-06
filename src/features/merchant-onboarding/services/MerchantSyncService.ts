import { supabase } from '../../../shared/data/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  StripeConnectAccount,
  MerchantSubscriptionEvent,
  AccountUpdateEvent,
  OnboardingEvent,
} from '../types';

export type MerchantSubscriptionCallback = (event: MerchantSubscriptionEvent) => void;

export class MerchantSyncService {
  private subscriptions = new Map<string, RealtimeChannel>();
  private connectionStateCallbacks = new Set<(state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void>();

  /**
   * Subscribe to merchant account updates for a specific user
   */
  async subscribeToMerchantAccount(
    userId: string,
    callback: MerchantSubscriptionCallback
  ): Promise<string> {
    const subscriptionId = `merchant_account_${userId}_${Date.now()}`;

    try {
      console.log('Setting up merchant account subscription for user:', userId);
      
      const channel = supabase.channel(`merchant_account_${userId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'pg_stripe_connect_accounts',
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          console.log('Merchant account update received:', payload);
          
          const event: AccountUpdateEvent = {
            type: 'account_updated',
            account_id: payload.new.stripe_account_id,
            changes: payload.new,
            timestamp: new Date().toISOString(),
          };
          
          callback(event);
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'pg_stripe_connect_accounts',
          filter: `user_id=eq.${userId}`,
        }, (payload) => {
          console.log('New merchant account created:', payload);
          
          const event: OnboardingEvent = {
            type: 'onboarding_completed',
            account_id: payload.new.stripe_account_id,
            data: payload.new,
            timestamp: new Date().toISOString(),
          };
          
          callback(event);
        })
        .subscribe((status) => {
          console.log('Merchant subscription status:', status);
          this.notifyConnectionStateChange(status);
        });

      this.subscriptions.set(subscriptionId, channel);
      return subscriptionId;
    } catch (error) {
      console.error('Error subscribing to merchant account:', error);
      throw new Error(`Failed to subscribe to merchant account: ${error}`);
    }
  }

  /**
   * Subscribe to all merchant account changes (admin/monitoring use)
   */
  async subscribeToAllMerchantAccounts(
    callback: MerchantSubscriptionCallback
  ): Promise<string> {
    const subscriptionId = `all_merchant_accounts_${Date.now()}`;

    try {
      console.log('Setting up subscription for all merchant accounts');
      
      const channel = supabase.channel('all_merchant_accounts')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pg_stripe_connect_accounts',
        }, (payload) => {
          console.log('Merchant account change received:', payload);
          
          let event: MerchantSubscriptionEvent;
          
          if (payload.eventType === 'UPDATE') {
            event = {
              type: 'account_updated',
              account_id: payload.new.stripe_account_id,
              changes: payload.new,
              timestamp: new Date().toISOString(),
            };
          } else if (payload.eventType === 'INSERT') {
            event = {
              type: 'onboarding_completed',
              account_id: payload.new.stripe_account_id,
              data: payload.new,
              timestamp: new Date().toISOString(),
            };
          } else {
            return; // Skip DELETE events for now
          }
          
          callback(event);
        })
        .subscribe((status) => {
          console.log('All merchant accounts subscription status:', status);
          this.notifyConnectionStateChange(status);
        });

      this.subscriptions.set(subscriptionId, channel);
      return subscriptionId;
    } catch (error) {
      console.error('Error subscribing to all merchant accounts:', error);
      throw new Error(`Failed to subscribe to all merchant accounts: ${error}`);
    }
  }

  /**
   * Unsubscribe from a specific subscription
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      try {
        await supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        console.log('Unsubscribed from merchant sync:', subscriptionId);
      } catch (error) {
        console.error('Error unsubscribing from merchant sync:', error);
        throw new Error(`Failed to unsubscribe: ${error}`);
      }
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  async unsubscribeAll(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.keys()).map(id => 
      this.unsubscribe(id)
    );
    
    await Promise.all(unsubscribePromises);
    console.log('Unsubscribed from all merchant subscriptions');
  }

  /**
   * Check if a subscription is active
   */
  isSubscribed(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
  }

  /**
   * Get all active subscription IDs
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Force sync merchant account data from database
   */
  async forceSyncMerchantAccount(userId: string): Promise<StripeConnectAccount | null> {
    try {
      console.log('Force syncing merchant account for user:', userId);
      
      const { data, error } = await supabase
        .from('pg_stripe_connect_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error force syncing merchant account:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error force syncing merchant account:', error);
      return null;
    }
  }

  /**
   * Register callback for connection state changes
   */
  onConnectionStateChange(callback: (state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void): void {
    this.connectionStateCallbacks.add(callback);
  }

  /**
   * Remove connection state change callback
   */
  offConnectionStateChange(callback: (state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void): void {
    this.connectionStateCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks of connection state change
   */
  private notifyConnectionStateChange(status: string): void {
    let state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED';
    
    switch (status) {
      case 'SUBSCRIBED':
        state = 'SUBSCRIBED';
        break;
      case 'TIMED_OUT':
        state = 'TIMED_OUT';
        break;
      case 'CLOSED':
      default:
        state = 'CLOSED';
        break;
    }

    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(): {
    activeSubscriptions: number;
    subscriptionIds: string[];
    isHealthy: boolean;
  } {
    const activeSubscriptions = this.subscriptions.size;
    const subscriptionIds = Array.from(this.subscriptions.keys());
    
    return {
      activeSubscriptions,
      subscriptionIds,
      isHealthy: activeSubscriptions > 0,
    };
  }

  /**
   * Test connection by creating and immediately removing a test subscription
   */
  async testConnection(): Promise<boolean> {
    try {
      const testChannel = supabase.channel('connection_test')
        .subscribe((status) => {
          console.log('Connection test status:', status);
        });

      // Wait a moment for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await supabase.removeChannel(testChannel);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    await this.unsubscribeAll();
    this.connectionStateCallbacks.clear();
    console.log('Merchant sync service cleaned up');
  }
}
