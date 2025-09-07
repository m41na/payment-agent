import { useState, useEffect, useCallback, useRef } from 'react';
import { SyncService, SubscriptionCallback } from '../services/SyncService';
import { Product, ProductSubscriptionEvent } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

const syncService = new SyncService();

export const useInventorySync = () => {
  const [connectionState, setConnectionState] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  const handleProductEvent = useCallback((event: ProductSubscriptionEvent) => {
    setLastSyncTime(new Date());
    setSyncError(null);
    
    // This hook doesn't manage product state directly - that's handled by useProducts
    // Instead, it provides event information that can be consumed by parent components
    console.log('Product event received:', event);
  }, []);

  const subscribeToUserProducts = useCallback(async (callback?: SubscriptionCallback) => {
    if (!user) return;

    try {
      setSyncError(null);
      
      // Unsubscribe from existing subscription if any
      if (subscriptionIdRef.current) {
        await syncService.unsubscribe(subscriptionIdRef.current);
      }

      // Create new subscription
      const subscriptionId = await syncService.subscribeToUserProducts(
        user.id,
        callback || handleProductEvent
      );
      
      subscriptionIdRef.current = subscriptionId;
      setConnectionState('SUBSCRIBED');
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error subscribing to user products:', error);
      setSyncError(error.message);
      setConnectionState('TIMED_OUT');
    }
  }, [user, handleProductEvent]);

  const unsubscribe = useCallback(async () => {
    if (subscriptionIdRef.current) {
      try {
        await syncService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
        setConnectionState('CLOSED');
      } catch (error: any) {
        console.error('Error unsubscribing:', error);
        setSyncError(error.message);
      }
    }
  }, []);

  const forceSync = useCallback(async () => {
    if (!user) return [];

    try {
      setSyncError(null);
      const products = await syncService.forceSyncUserProducts(user.id);
      setLastSyncTime(new Date());
      return products;
    } catch (error: any) {
      console.error('Error force syncing:', error);
      setSyncError(error.message);
      return [];
    }
  }, [user]);

  // Set up connection state monitoring
  useEffect(() => {
    syncService.onConnectionStateChange(setConnectionState);
  }, []);

  // Auto-subscribe when user changes
  useEffect(() => {
    if (user) {
      subscribeToUserProducts();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [user, subscribeToUserProducts, unsubscribe]);

  // Computed values
  const isConnected = connectionState === 'SUBSCRIBED';
  const hasError = syncError !== null;
  const activeSubscriptions = syncService.getActiveSubscriptions();

  return {
    // State
    connectionState,
    lastSyncTime,
    syncError,
    isConnected,
    hasError,
    activeSubscriptions,
    
    // Actions
    subscribeToUserProducts,
    unsubscribe,
    forceSync,
    
    // Utilities
    isSubscribed: (subscriptionId: string) => syncService.isSubscribed(subscriptionId),
  };
};

// Specialized hook for single product sync
export const useProductSync = (productId: string) => {
  const [connectionState, setConnectionState] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');
  const [lastEvent, setLastEvent] = useState<ProductSubscriptionEvent | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const subscriptionIdRef = useRef<string | null>(null);

  const handleProductEvent = useCallback((event: ProductSubscriptionEvent) => {
    setLastEvent(event);
    setSyncError(null);
  }, []);

  const subscribe = useCallback(async (callback?: SubscriptionCallback) => {
    if (!productId) return;

    try {
      setSyncError(null);
      
      // Unsubscribe from existing subscription if any
      if (subscriptionIdRef.current) {
        await syncService.unsubscribe(subscriptionIdRef.current);
      }

      // Create new subscription
      const subscriptionId = await syncService.subscribeToProductById(
        productId,
        callback || handleProductEvent
      );
      
      subscriptionIdRef.current = subscriptionId;
      setConnectionState('SUBSCRIBED');
      
      return subscriptionId;
    } catch (error: any) {
      console.error('Error subscribing to product:', error);
      setSyncError(error.message);
      setConnectionState('TIMED_OUT');
    }
  }, [productId, handleProductEvent]);

  const unsubscribe = useCallback(async () => {
    if (subscriptionIdRef.current) {
      try {
        await syncService.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
        setConnectionState('CLOSED');
      } catch (error: any) {
        console.error('Error unsubscribing:', error);
        setSyncError(error.message);
      }
    }
  }, []);

  // Auto-subscribe when productId changes
  useEffect(() => {
    if (productId) {
      subscribe();
    } else {
      unsubscribe();
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [productId, subscribe, unsubscribe]);

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
