import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { EventBus, EventBusInterface } from './EventBus';
import { useEventBus, useEventEmitter } from './useEventBus';
import { EVENT_TYPES } from './EventTypes';

/**
 * Event System Provider
 * 
 * Provides the event bus context to the entire application and sets up
 * system-level event listeners for cross-feature integration patterns.
 */

interface EventContextType {
  eventBus: EventBusInterface;
  emitEvent: ReturnType<typeof useEventEmitter>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const emitEvent = useEventEmitter();

  // Set up system-level event listeners for cross-feature integration
  useEffect(() => {
    // Example: Location updates trigger product discovery refresh
    const locationSubscription = EventBus.on(EVENT_TYPES.LOCATION_UPDATE, async (data) => {
      console.log('Location updated, triggering product discovery refresh:', data);
      // This would trigger product discovery to refresh nearby products
    });

    // Example: Payment success triggers referral reward processing
    const paymentSubscription = EventBus.on(EVENT_TYPES.PAYMENT_SUCCESS, async (data) => {
      console.log('Payment successful, processing referral rewards:', data);
      // This would trigger referral system to process rewards
    });

    // Example: Cart item added triggers inventory check
    const cartSubscription = EventBus.on(EVENT_TYPES.CART_ITEM_ADDED, async (data) => {
      console.log('Item added to cart, checking inventory:', data);
      // This would trigger inventory management to check stock levels
    });

    // Example: User profile update triggers storefront refresh
    const profileSubscription = EventBus.on(EVENT_TYPES.USER_PROFILE_UPDATE, async (data) => {
      console.log('User profile updated, refreshing personalized content:', data);
      // This would trigger various features to refresh personalized content
    });

    // Example: Merchant onboarded triggers welcome message
    const merchantSubscription = EventBus.on(EVENT_TYPES.MERCHANT_ONBOARDED, async (data) => {
      console.log('Merchant onboarded, sending welcome message:', data);
      // This would trigger messaging system to send welcome message
    });

    // System error handling
    const errorSubscription = EventBus.on(EVENT_TYPES.ERROR, async (data) => {
      console.error('System error occurred:', data);
      // This would trigger error reporting and user notification
    });

    // Performance monitoring
    const performanceSubscription = EventBus.on(EVENT_TYPES.PERFORMANCE, async (data) => {
      console.log('Performance metric recorded:', data);
      // This would trigger performance analytics and optimization
    });

    // Cleanup subscriptions
    return () => {
      locationSubscription.unsubscribe();
      paymentSubscription.unsubscribe();
      cartSubscription.unsubscribe();
      profileSubscription.unsubscribe();
      merchantSubscription.unsubscribe();
      errorSubscription.unsubscribe();
      performanceSubscription.unsubscribe();
    };
  }, []);

  const contextValue: EventContextType = {
    eventBus: EventBus,
    emitEvent,
  };

  return (
    <EventContext.Provider value={contextValue}>
      {children}
    </EventContext.Provider>
  );
};

/**
 * Hook to access the event context
 */
export const useEventContext = (): EventContextType => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEventContext must be used within an EventProvider');
  }
  return context;
};

export default EventProvider;
