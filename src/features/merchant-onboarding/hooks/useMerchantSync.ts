import { useState, useEffect, useCallback } from 'react';
import {
  StripeConnectAccount,
  MerchantSubscriptionEvent,
} from '../types';

// DISABLED: MerchantSyncService not needed for mobile-only app
// Real-time merchant sync is overkill for single-device usage
// Using local-first approach instead

export const useMerchantSync = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // No-op implementations for mobile-only app
  const subscribeToMerchantAccount = useCallback(
    async (callback: (event: MerchantSubscriptionEvent) => void): Promise<string> => {
      console.log('[MerchantSync] DISABLED: subscribeToMerchantAccount called but sync is disabled for mobile-only app');
      return 'disabled_subscription_id'; // Return fake ID to prevent errors
    },
    []
  );

  const subscribeToAllMerchantAccounts = useCallback(
    async (callback: (event: MerchantSubscriptionEvent) => void): Promise<string> => {
      console.log('[MerchantSync] DISABLED: subscribeToAllMerchantAccounts called but sync is disabled for mobile-only app');
      return 'disabled_subscription_id'; // Return fake ID to prevent errors
    },
    []
  );

  const unsubscribe = useCallback(
    async (subscriptionId: string): Promise<void> => {
      console.log('[MerchantSync] DISABLED: unsubscribe called but sync is disabled');
    },
    []
  );

  const unsubscribeAll = useCallback(
    async (): Promise<void> => {
      console.log('[MerchantSync] DISABLED: unsubscribeAll called but sync is disabled');
    },
    []
  );

  const isSubscribed = useCallback(
    (subscriptionId: string): boolean => {
      console.log('[MerchantSync] DISABLED: isSubscribed called but sync is disabled');
      return false; // Always return false since sync is disabled
    },
    []
  );

  const getActiveSubscriptions = useCallback(
    (): string[] => {
      console.log('[MerchantSync] DISABLED: getActiveSubscriptions called but sync is disabled');
      return []; // Always return empty array
    },
    []
  );

  const forceSyncMerchantAccount = useCallback(
    async (): Promise<StripeConnectAccount | null> => {
      console.log('[MerchantSync] DISABLED: forceSyncMerchantAccount called but sync is disabled');
      return null; // Return null since sync is disabled
    },
    []
  );

  const testConnection = useCallback(
    async (): Promise<boolean> => {
      console.log('[MerchantSync] DISABLED: testConnection called but sync is disabled');
      return false; // Always return false since sync is disabled
    },
    []
  );

  const cleanup = useCallback(
    async (): Promise<void> => {
      console.log('[MerchantSync] DISABLED: cleanup called but sync is disabled');
    },
    []
  );

  // Initialize with disconnected state since sync is disabled
  useEffect(() => {
    setIsConnected(false);
    setConnectionState('CLOSED');
    setSubscriptionCount(0);
    setLastSyncTime(new Date());
  }, []);

  return {
    // State
    isConnected,
    connectionState,
    subscriptionCount,
    lastSyncTime,
    
    // Actions (all no-ops)
    subscribeToMerchantAccount,
    subscribeToAllMerchantAccounts,
    unsubscribe,
    unsubscribeAll,
    isSubscribed,
    getActiveSubscriptions,
    forceSyncMerchantAccount,
    testConnection,
    cleanup,
    
    // Connection state management (always shows disconnected)
    onConnectionStateChange: (callback: (state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void) => {
      console.log('[MerchantSync] DISABLED: onConnectionStateChange called but sync is disabled');
    },
    offConnectionStateChange: (callback: (state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void) => {
      console.log('[MerchantSync] DISABLED: offConnectionStateChange called but sync is disabled');
    },
    
    // Connection health (always shows unhealthy)
    getConnectionHealth: () => ({
      activeSubscriptions: 0,
      subscriptionIds: [],
      isHealthy: false,
    }),
  };
};
