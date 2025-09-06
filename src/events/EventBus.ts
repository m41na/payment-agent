/**
 * Cross-Feature Event System
 * 
 * Provides a centralized event bus for loose coupling between features.
 * Enables features to communicate without direct dependencies through
 * a publish-subscribe pattern with type safety and error handling.
 */

export type EventCallback<T = any> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  unsubscribe: () => void;
}

export interface EventBusInterface {
  emit<T>(eventType: string, data: T): Promise<void>;
  on<T>(eventType: string, callback: EventCallback<T>): EventSubscription;
  off(eventType: string, callback: EventCallback): void;
  once<T>(eventType: string, callback: EventCallback<T>): EventSubscription;
  clear(eventType?: string): void;
  getListenerCount(eventType: string): number;
}

class EventBusImpl implements EventBusInterface {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private onceListeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Emit an event to all registered listeners
   */
  async emit<T>(eventType: string, data: T): Promise<void> {
    const regularListeners = this.listeners.get(eventType);
    const onceListeners = this.onceListeners.get(eventType);

    // Execute regular listeners
    if (regularListeners) {
      const promises = Array.from(regularListeners).map(async (callback) => {
        try {
          await callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
      await Promise.all(promises);
    }

    // Execute and remove once listeners
    if (onceListeners) {
      const promises = Array.from(onceListeners).map(async (callback) => {
        try {
          await callback(data);
        } catch (error) {
          console.error(`Error in once event listener for ${eventType}:`, error);
        }
      });
      await Promise.all(promises);
      
      // Clear once listeners after execution
      this.onceListeners.delete(eventType);
    }
  }

  /**
   * Subscribe to an event
   */
  on<T>(eventType: string, callback: EventCallback<T>): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);

    return {
      unsubscribe: () => this.off(eventType, callback)
    };
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, callback: EventCallback): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }

    const onceListeners = this.onceListeners.get(eventType);
    if (onceListeners) {
      onceListeners.delete(callback);
      if (onceListeners.size === 0) {
        this.onceListeners.delete(eventType);
      }
    }
  }

  /**
   * Subscribe to an event that will only fire once
   */
  once<T>(eventType: string, callback: EventCallback<T>): EventSubscription {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set());
    }
    
    this.onceListeners.get(eventType)!.add(callback);

    return {
      unsubscribe: () => this.off(eventType, callback)
    };
  }

  /**
   * Clear all listeners for a specific event type, or all listeners if no type specified
   */
  clear(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
      this.onceListeners.delete(eventType);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event type
   */
  getListenerCount(eventType: string): number {
    const regularCount = this.listeners.get(eventType)?.size || 0;
    const onceCount = this.onceListeners.get(eventType)?.size || 0;
    return regularCount + onceCount;
  }
}

// Singleton instance
export const EventBus: EventBusInterface = new EventBusImpl();

// Export for testing purposes
export { EventBusImpl };
