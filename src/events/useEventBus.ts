import { useEffect, useRef, useCallback } from 'react';
import { EventBus, EventCallback, EventSubscription } from './EventBus';
import { EVENT_TYPES, EventType } from './EventTypes';

/**
 * React Hook for Event Bus Integration
 * 
 * Provides a React-friendly interface to the event bus with automatic
 * cleanup and type safety for cross-feature communication.
 */

export interface UseEventBusReturn {
  emit: <T>(eventType: EventType, data: T) => Promise<void>;
  subscribe: <T>(eventType: EventType, callback: EventCallback<T>) => EventSubscription;
  subscribeOnce: <T>(eventType: EventType, callback: EventCallback<T>) => EventSubscription;
}

/**
 * Hook to interact with the event bus
 */
export const useEventBus = (): UseEventBusReturn => {
  const subscriptionsRef = useRef<EventSubscription[]>([]);

  // Emit an event
  const emit = useCallback(async <T>(eventType: EventType, data: T): Promise<void> => {
    await EventBus.emit(eventType, data);
  }, []);

  // Subscribe to an event with automatic cleanup
  const subscribe = useCallback(<T>(
    eventType: EventType, 
    callback: EventCallback<T>
  ): EventSubscription => {
    const subscription = EventBus.on(eventType, callback);
    subscriptionsRef.current.push(subscription);
    return subscription;
  }, []);

  // Subscribe to an event once with automatic cleanup
  const subscribeOnce = useCallback(<T>(
    eventType: EventType, 
    callback: EventCallback<T>
  ): EventSubscription => {
    const subscription = EventBus.once(eventType, callback);
    subscriptionsRef.current.push(subscription);
    return subscription;
  }, []);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(subscription => {
        subscription.unsubscribe();
      });
      subscriptionsRef.current = [];
    };
  }, []);

  return {
    emit,
    subscribe,
    subscribeOnce,
  };
};

/**
 * Hook to listen to a specific event type
 */
export const useEventListener = <T>(
  eventType: EventType,
  callback: EventCallback<T>,
  deps: React.DependencyList = []
): void => {
  const { subscribe } = useEventBus();

  useEffect(() => {
    const subscription = subscribe(eventType, callback);
    return () => subscription.unsubscribe();
  }, [eventType, subscribe, ...deps]);
};

/**
 * Hook to emit events with memoized emitter
 */
export const useEventEmitter = () => {
  const { emit } = useEventBus();
  
  return useCallback(async <T>(eventType: EventType, data: T): Promise<void> => {
    await emit(eventType, data);
  }, [emit]);
};

/**
 * Hook for feature-specific event patterns
 */
export const useFeatureEvents = (featureName: string) => {
  const { emit, subscribe, subscribeOnce } = useEventBus();

  // Emit events with feature context
  const emitFeatureEvent = useCallback(async <T>(
    eventType: EventType, 
    data: T & { feature?: string }
  ): Promise<void> => {
    await emit(eventType, { ...data, feature: featureName });
  }, [emit, featureName]);

  // Subscribe to events with feature filtering
  const subscribeToFeatureEvent = useCallback(<T>(
    eventType: EventType,
    callback: EventCallback<T>,
    filterByFeature: boolean = false
  ): EventSubscription => {
    if (filterByFeature) {
      return subscribe(eventType, (data: T & { feature?: string }) => {
        if (data.feature === featureName) {
          callback(data);
        }
      });
    }
    return subscribe(eventType, callback);
  }, [subscribe, featureName]);

  return {
    emit: emitFeatureEvent,
    subscribe: subscribeToFeatureEvent,
    subscribeOnce,
  };
};

// Export event types for convenience
export { EVENT_TYPES } from './EventTypes';
export type { EventType } from './EventTypes';
