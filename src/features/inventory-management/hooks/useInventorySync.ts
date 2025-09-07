import { useState, useEffect, useCallback } from 'react';
import { Product, ProductSubscriptionEvent } from '../types';

// DISABLED: InventorySyncService not needed for mobile-only app
// Real-time inventory sync is overkill for single-device usage
// Using local-first approach instead

export const useInventorySync = (userId?: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED'>('CLOSED');
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // No-op implementations for mobile-only app
  const subscribeToUserProducts = useCallback(
    async (callback: (event: ProductSubscriptionEvent) => void): Promise<string> => {
      console.log('[InventorySync] DISABLED: subscribeToUserProducts called but sync is disabled for mobile-only app');
      return 'disabled_subscription_id'; // Return fake ID to prevent errors
    },
    []
  );

  const subscribeToAllProducts = useCallback(
    async (callback: (event: ProductSubscriptionEvent) => void): Promise<string> => {
      console.log('[InventorySync] DISABLED: subscribeToAllProducts called but sync is disabled for mobile-only app');
      return 'disabled_subscription_id'; // Return fake ID to prevent errors
    },
    []
  );

  const subscribeToProductById = useCallback(
    async (productId: string, callback: (event: ProductSubscriptionEvent) => void): Promise<string> => {
      console.log('[InventorySync] DISABLED: subscribeToProductById called but sync is disabled for mobile-only app');
      return 'disabled_subscription_id'; // Return fake ID to prevent errors
    },
    []
  );

  const unsubscribe = useCallback(
    async (subscriptionId: string): Promise<void> => {
      console.log('[InventorySync] DISABLED: unsubscribe called but sync is disabled');
    },
    []
  );

  const unsubscribeAll = useCallback(
    async (): Promise<void> => {
      console.log('[InventorySync] DISABLED: unsubscribeAll called but sync is disabled');
    },
    []
  );

  const isSubscribed = useCallback(
    (subscriptionId: string): boolean => {
      console.log('[InventorySync] DISABLED: isSubscribed called but sync is disabled');
      return false; // Always return false since sync is disabled
    },
    []
  );

  const getActiveSubscriptions = useCallback(
    (): string[] => {
      console.log('[InventorySync] DISABLED: getActiveSubscriptions called but sync is disabled');
      return []; // Always return empty array
    },
    []
  );

  const forceSyncUserProducts = useCallback(
    async (): Promise<Product[]> => {
      console.log('[InventorySync] DISABLED: forceSyncUserProducts called but sync is disabled');
      return []; // Return empty array since sync is disabled
    },
    []
  );

  // Initialize with disconnected state since sync is disabled
  useEffect(() => {
    setIsConnected(false);
    setConnectionState('CLOSED');
    setActiveSubscriptions([]);
    setLastSyncTime(new Date());
  }, []);

  return {
    // State
    isConnected,
    connectionState,
    activeSubscriptions,
    lastSyncTime,
    
    // Actions (all no-ops)
    subscribeToUserProducts,
    subscribeToAllProducts,
    subscribeToProductById,
    unsubscribe,
    unsubscribeAll,
    isSubscribed,
    getActiveSubscriptions,
    forceSyncUserProducts,
    
    // Connection state management (always shows disconnected)
    onConnectionStateChange: (callback: (state: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED') => void) => {
      console.log('[InventorySync] DISABLED: onConnectionStateChange called but sync is disabled');
    },
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

  const subscribe = useCallback(
    async (callback?: (event: ProductSubscriptionEvent) => void): Promise<string> => {
      console.log('[InventorySync] DISABLED: subscribe called but sync is disabled for mobile-only app');
      return 'disabled_subscription_id'; // Return fake ID to prevent errors
    },
    []
  );

  const unsubscribe = useCallback(
    async (): Promise<void> => {
      console.log('[InventorySync] DISABLED: unsubscribe called but sync is disabled');
    },
    []
  );

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
