import { useState, useEffect, useCallback, useRef } from 'react';
import { MerchantSyncService, MerchantSubscriptionCallback } from '../services/MerchantSyncService';
import { MerchantSubscriptionEvent, StripeConnectAccount } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

const merchantSyncService = new MerchantSyncService();

export const useMerchantSync = () => {
  const [connectionState, setConnectionState] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<MerchantSubscriptionEvent | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  const handleMerchantEvent = useCallback((event: MerchantSubscriptionEvent) => {
    setLastSyncTime(new Date());
    setLastEvent(event);
    setSyncError(null);
    
    console.log('Merchant event received:', event);
  }, []);

  const subscribeToMerchantAccount = useCallback(async (callback?: MerchantSubscriptionCallback) => {
    if (!user) return;

    try {
      setSyncError(null);
      
      // Unsubscribe from existing subscription if any
      if (subscriptionIdRef.current) {
        await merchantSyncService.unsubscribe(subscriptionIdRef.current);
      }

      // Create new subscription
      const subscriptionId = await merchantSyncService.subscribeToMerchantAccount(
        user.id,
        callback || handleMerchantEvent
      );
      
      subscriptionIdRef.current = subscriptionId;
      setConnectionState('SUBSCRIBED');
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error subscribing to merchant account:', error);
      setSyncError(error.message);
      setConnectionState('TIMED_OUT');
    }
  }, [user, handleMerchantEvent]);

  const unsubscribe = useCallback(async () => {
    if (subscriptionIdRef.current) {
      try {
        await merchantSyncService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
        setConnectionState('CLOSED');
      } catch (error: any) {
        console.error('Error unsubscribing:', error);
        setSyncError(error.message);
      }
    }
  }, []);

  const forceSync = useCallback(async () => {
    if (!user) return null;

    try {
      setSyncError(null);
      const account = await merchantSyncService.forceSyncMerchantAccount(user.id);
      setLastSyncTime(new Date());
      return account;
    } catch (error: any) {
      console.error('Error force syncing:', error);
      setSyncError(error.message);
      return null;
    }
  }, [user]);

  const testConnection = useCallback(async () => {
    try {
      setSyncError(null);
      const isHealthy = await merchantSyncService.testConnection();
      return isHealthy;
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setSyncError(error.message);
      return false;
    }
  }, []);

  // Set up connection state monitoring
  useEffect(() => {
    merchantSyncService.onConnectionStateChange(setConnectionState);
    
    return () => {
      merchantSyncService.offConnectionStateChange(setConnectionState);
    };
  }, []);

  // Auto-subscribe when user changes
  useEffect(() => {
    if (user) {
      subscribeToMerchantAccount();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [user, subscribeToMerchantAccount, unsubscribe]);

  // Computed values
  const isConnected = connectionState === 'SUBSCRIBED';
  const hasError = syncError !== null;
  const connectionHealth = merchantSyncService.getConnectionHealth();

  return {
    // State
    connectionState,
    lastSyncTime,
    syncError,
    lastEvent,
    isConnected,
    hasError,
    connectionHealth,
    
    // Actions
    subscribeToMerchantAccount,
    unsubscribe,
    forceSync,
    testConnection,
    
    // Utilities
    isSubscribed: (subscriptionId: string) => merchantSyncService.isSubscribed(subscriptionId),
    getActiveSubscriptions: () => merchantSyncService.getActiveSubscriptions(),
    getSubscriptionCount: () => merchantSyncService.getSubscriptionCount(),
  };
};

// Specialized hook for monitoring all merchant accounts (admin use)
export const useAllMerchantSync = () => {
  const [connectionState, setConnectionState] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');
  const [lastEvent, setLastEvent] = useState<MerchantSubscriptionEvent | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);

  const handleMerchantEvent = useCallback((event: MerchantSubscriptionEvent) => {
    setLastEvent(event);
    setSyncError(null);
  }, []);

  const subscribe = useCallback(async (callback?: MerchantSubscriptionCallback) => {
    try {
      setSyncError(null);
      
      // Unsubscribe from existing subscription if any
      if (subscriptionIdRef.current) {
        await merchantSyncService.unsubscribe(subscriptionIdRef.current);
      }

      // Create new subscription
      const subscriptionId = await merchantSyncService.subscribeToAllMerchantAccounts(
        callback || handleMerchantEvent
      );
      
      subscriptionIdRef.current = subscriptionId;
      setConnectionState('SUBSCRIBED');
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error subscribing to all merchant accounts:', error);
      setSyncError(error.message);
      setConnectionState('TIMED_OUT');
    }
  }, [handleMerchantEvent]);

  const unsubscribe = useCallback(async () => {
    if (subscriptionIdRef.current) {
      try {
        await merchantSyncService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
        setConnectionState('CLOSED');
      } catch (error: any) {
        console.error('Error unsubscribing:', error);
        setSyncError(error.message);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    // State
    connectionState,
    lastEvent,
    syncError,
    isConnected: connectionState === 'SUBSCRIBED',
    hasError: syncError !== null,
    
    // Actions
    subscribe,
    unsubscribe,
  };
};
