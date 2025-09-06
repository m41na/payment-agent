import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ProductSyncService, ProductSyncCallback } from '../services/ProductSyncService';
import {
  ProductSyncEvent,
  ProductSyncEventType,
  ProductSyncState,
  Product,
  ProductError,
} from '../types';

interface UseProductSyncState {
  // Connection state
  syncState: ProductSyncState;
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  
  // Sync events
  lastSyncEvent: ProductSyncEvent | null;
  lastSyncTimestamp: string | null;
  
  // Error state
  error: ProductError | null;
}

interface UseProductSyncActions {
  // Connection management
  initialize: () => Promise<void>;
  cleanup: () => Promise<void>;
  forceSyncRefresh: () => Promise<void>;
  
  // Event handling
  registerCallback: (key: string, callback: ProductSyncCallback) => void;
  unregisterCallback: (key: string, callback?: ProductSyncCallback) => void;
  
  // Utility
  clearError: () => void;
}

interface UseProductSyncReturn extends UseProductSyncState, UseProductSyncActions {}

export function useProductSync(): UseProductSyncReturn {
  const [state, setState] = useState<UseProductSyncState>({
    syncState: ProductSyncState.DISCONNECTED,
    isConnected: false,
    isConnecting: false,
    hasError: false,
    lastSyncEvent: null,
    lastSyncTimestamp: null,
    error: null,
  });

  const syncService = useMemo(() => ProductSyncService.getInstance(), []);
  const callbackRef = useRef<ProductSyncCallback | null>(null);
  const hookIdRef = useRef<string>(`hook_${Date.now()}_${Math.random()}`);

  // Handle sync events
  const handleSyncEvent = useCallback((event: ProductSyncEvent) => {
    setState(prev => ({
      ...prev,
      lastSyncEvent: event,
      lastSyncTimestamp: event.timestamp,
    }));

    // Handle state change events
    if (event.type === ProductSyncEventType.SYNC_STATE_CHANGED) {
      const newState = event.metadata?.new_state as ProductSyncState;
      if (newState) {
        setState(prev => ({
          ...prev,
          syncState: newState,
          isConnected: newState === ProductSyncState.CONNECTED,
          isConnecting: newState === ProductSyncState.CONNECTING,
          hasError: newState === ProductSyncState.ERROR,
          error: newState === ProductSyncState.ERROR ? 
            { code: 'SYNC_ERROR', message: 'Synchronization error occurred' } : null,
        }));
      }
    }
  }, []);

  // Initialize sync service
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await syncService.initialize();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? 
          { code: 'INITIALIZATION_ERROR', message: error.message } : 
          { code: 'INITIALIZATION_ERROR', message: 'Failed to initialize sync service' },
      }));
    }
  }, [syncService]);

  // Cleanup sync service
  const cleanup = useCallback(async () => {
    try {
      await syncService.cleanup();
      setState(prev => ({
        ...prev,
        syncState: ProductSyncState.DISCONNECTED,
        isConnected: false,
        isConnecting: false,
        hasError: false,
        error: null,
      }));
    } catch (error: any) {
      console.error('Error cleaning up sync service:', error);
    }
  }, [syncService]);

  // Force sync refresh
  const forceSyncRefresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await syncService.forceSyncRefresh();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? 
          { code: 'SYNC_REFRESH_ERROR', message: error.message } : 
          { code: 'SYNC_REFRESH_ERROR', message: 'Failed to refresh sync' },
      }));
    }
  }, [syncService]);

  // Register callback
  const registerCallback = useCallback((key: string, callback: ProductSyncCallback) => {
    syncService.registerCallback(key, callback);
  }, [syncService]);

  // Unregister callback
  const unregisterCallback = useCallback((key: string, callback?: ProductSyncCallback) => {
    syncService.unregisterCallback(key, callback);
  }, [syncService]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Register internal callback for state management
  useEffect(() => {
    callbackRef.current = handleSyncEvent;
    syncService.registerCallback(hookIdRef.current, handleSyncEvent);

    return () => {
      if (callbackRef.current) {
        syncService.unregisterCallback(hookIdRef.current, callbackRef.current);
      }
    };
  }, [syncService, handleSyncEvent]);

  // Initialize sync state from service
  useEffect(() => {
    const currentState = syncService.getSyncState();
    setState(prev => ({
      ...prev,
      syncState: currentState,
      isConnected: currentState === ProductSyncState.CONNECTED,
      isConnecting: currentState === ProductSyncState.CONNECTING,
      hasError: currentState === ProductSyncState.ERROR,
    }));

    // Load last sync timestamp
    syncService.getLastSyncTimestamp().then(timestamp => {
      if (timestamp) {
        setState(prev => ({ ...prev, lastSyncTimestamp: timestamp }));
      }
    });
  }, [syncService]);

  return {
    // State
    ...state,
    
    // Actions
    initialize,
    cleanup,
    forceSyncRefresh,
    registerCallback,
    unregisterCallback,
    clearError,
  };
}

// Hook for listening to specific product sync events
export function useProductSyncEvents(
  eventTypes?: ProductSyncEventType[],
  productId?: string
) {
  const [events, setEvents] = useState<ProductSyncEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<ProductSyncEvent | null>(null);
  
  const syncService = useMemo(() => ProductSyncService.getInstance(), []);
  const hookIdRef = useRef<string>(`events_hook_${Date.now()}_${Math.random()}`);

  const handleSyncEvent = useCallback((event: ProductSyncEvent) => {
    // Filter by event types if specified
    if (eventTypes && !eventTypes.includes(event.type)) {
      return;
    }

    // Filter by product ID if specified
    if (productId && event.product_id !== productId) {
      return;
    }

    setLastEvent(event);
    setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
  }, [eventTypes, productId]);

  // Clear events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Register callback
  useEffect(() => {
    syncService.registerCallback(hookIdRef.current, handleSyncEvent);

    return () => {
      syncService.unregisterCallback(hookIdRef.current, handleSyncEvent);
    };
  }, [syncService, handleSyncEvent]);

  return {
    events,
    lastEvent,
    clearEvents,
  };
}

// Hook for single product real-time synchronization
export function useProductSyncSingle(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [error, setError] = useState<ProductError | null>(null);

  const syncService = useMemo(() => ProductSyncService.getInstance(), []);
  const hookIdRef = useRef<string>(`single_product_${productId}_${Date.now()}`);

  const handleProductEvent = useCallback((event: ProductSyncEvent) => {
    // Only handle events for this specific product
    if (event.product_id !== productId) return;

    switch (event.type) {
      case ProductSyncEventType.PRODUCT_UPDATED:
        if (event.product) {
          setProduct(event.product);
          setLastUpdate(event.timestamp);
        }
        break;
      
      case ProductSyncEventType.PRODUCT_DELETED:
        setProduct(null);
        setLastUpdate(event.timestamp);
        break;

      case ProductSyncEventType.PRODUCT_FAVORITED:
      case ProductSyncEventType.PRODUCT_UNFAVORITED:
        // Update favorite count if we have the product
        if (product && event.product_id === product.id) {
          setProduct(prev => prev ? {
            ...prev,
            favorite_count: event.type === ProductSyncEventType.PRODUCT_FAVORITED 
              ? (prev.favorite_count || 0) + 1
              : Math.max(0, (prev.favorite_count || 0) - 1)
          } : null);
          setLastUpdate(event.timestamp);
        }
        break;

      case ProductSyncEventType.PRODUCT_VIEWED:
        // Update view count if we have the product
        if (product && event.product_id === product.id) {
          setProduct(prev => prev ? {
            ...prev,
            view_count: (prev.view_count || 0) + 1
          } : null);
          setLastUpdate(event.timestamp);
        }
        break;
    }
  }, [productId, product]);

  // Load initial product data
  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // This would typically come from the ProductDiscoveryService
      // For now, we'll just set loading to false
      setIsLoading(false);
    } catch (error: any) {
      setError(error instanceof Error ? 
        { code: 'LOAD_ERROR', message: error.message } : 
        { code: 'LOAD_ERROR', message: 'Failed to load product' }
      );
      setIsLoading(false);
    }
  }, [productId]);

  // Register for sync events
  useEffect(() => {
    if (productId) {
      syncService.registerCallback(hookIdRef.current, handleProductEvent);
      loadProduct();
    }

    return () => {
      syncService.unregisterCallback(hookIdRef.current, handleProductEvent);
    };
  }, [syncService, productId, handleProductEvent, loadProduct]);

  return {
    product,
    isLoading,
    lastUpdate,
    error,
    refresh: loadProduct,
  };
}
