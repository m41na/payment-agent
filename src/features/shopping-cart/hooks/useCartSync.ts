import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CartSyncService, CartSyncCallbacks } from '../services/CartSyncService';
import { CartUpdateEvent } from '../types';

export interface UseCartSyncReturn {
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Events
  lastEvent: CartUpdateEvent | null;
  eventHistory: CartUpdateEvent[];
  
  // Actions
  reconnect: () => Promise<void>;
  clearEventHistory: () => void;
  
  // Callbacks
  onCartUpdate: (callback: (event: CartUpdateEvent) => void) => void;
  onConnectionChange: (callback: (connected: boolean) => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

export const useCartSync = (): UseCartSyncReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CartUpdateEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<CartUpdateEvent[]>([]);
  const [reconnectionInfo, setReconnectionInfo] = useState({
    attempts: 0,
    maxAttempts: 5,
    isReconnecting: false,
  });

  const syncServiceRef = useRef<CartSyncService | null>(null);
  const callbacksRef = useRef<{
    onCartUpdate?: (event: CartUpdateEvent) => void;
    onConnectionChange?: (connected: boolean) => void;
    onError?: (error: Error) => void;
  }>({});

  /**
   * Initialize cart sync service
   */
  const initializeSync = useCallback(async () => {
    if (!user?.id || syncServiceRef.current) return;

    try {
      const syncService = new CartSyncService();
      syncServiceRef.current = syncService;

      const callbacks: CartSyncCallbacks = {
        onCartUpdate: (event: CartUpdateEvent) => {
          setLastEvent(event);
          setEventHistory(prev => {
            const newHistory = [event, ...prev];
            // Keep only last 50 events
            return newHistory.slice(0, 50);
          });
          callbacksRef.current.onCartUpdate?.(event);
        },
        onConnectionStateChange: (connected: boolean) => {
          setIsConnected(connected);
          callbacksRef.current.onConnectionChange?.(connected);
          
          // Update reconnection info
          const info = syncService.getReconnectionInfo();
          setReconnectionInfo(info);
        },
        onError: (error: Error) => {
          console.error('Cart sync error:', error);
          callbacksRef.current.onError?.(error);
          
          // Update reconnection info on error
          const info = syncService.getReconnectionInfo();
          setReconnectionInfo(info);
        },
      };

      await syncService.initialize(user.id, callbacks);
    } catch (error) {
      console.error('Error initializing cart sync:', error);
      callbacksRef.current.onError?.(error as Error);
    }
  }, [user?.id]);

  /**
   * Cleanup sync service
   */
  const cleanupSync = useCallback(async () => {
    if (syncServiceRef.current) {
      await syncServiceRef.current.cleanup();
      syncServiceRef.current = null;
    }
    setIsConnected(false);
    setLastEvent(null);
    setReconnectionInfo({
      attempts: 0,
      maxAttempts: 5,
      isReconnecting: false,
    });
  }, []);

  /**
   * Manually trigger reconnection
   */
  const reconnect = useCallback(async (): Promise<void> => {
    if (!user?.id || !syncServiceRef.current) return;

    try {
      await syncServiceRef.current.reconnect(user.id);
      const info = syncServiceRef.current.getReconnectionInfo();
      setReconnectionInfo(info);
    } catch (error) {
      console.error('Error reconnecting cart sync:', error);
      callbacksRef.current.onError?.(error as Error);
    }
  }, [user?.id]);

  /**
   * Clear event history
   */
  const clearEventHistory = useCallback((): void => {
    setEventHistory([]);
    setLastEvent(null);
  }, []);

  /**
   * Set cart update callback
   */
  const onCartUpdate = useCallback((callback: (event: CartUpdateEvent) => void): void => {
    callbacksRef.current.onCartUpdate = callback;
  }, []);

  /**
   * Set connection change callback
   */
  const onConnectionChange = useCallback((callback: (connected: boolean) => void): void => {
    callbacksRef.current.onConnectionChange = callback;
  }, []);

  /**
   * Set error callback
   */
  const onError = useCallback((callback: (error: Error) => void): void => {
    callbacksRef.current.onError = callback;
  }, []);

  // Initialize sync when user changes
  useEffect(() => {
    if (user?.id) {
      initializeSync();
    } else {
      cleanupSync();
    }

    return () => {
      cleanupSync();
    };
  }, [user?.id, initializeSync, cleanupSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSync();
    };
  }, [cleanupSync]);

  return {
    // Connection state
    isConnected,
    isReconnecting: reconnectionInfo.isReconnecting,
    reconnectAttempts: reconnectionInfo.attempts,
    maxReconnectAttempts: reconnectionInfo.maxAttempts,
    
    // Events
    lastEvent,
    eventHistory,
    
    // Actions
    reconnect,
    clearEventHistory,
    
    // Callbacks
    onCartUpdate,
    onConnectionChange,
    onError,
  };
};
