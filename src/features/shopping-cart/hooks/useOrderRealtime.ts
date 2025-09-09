import { useEffect, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../user-auth/context/AuthContext';
import {
  Order,
  OrderUpdateEvent,
  OrderStatus,
  PaymentStatus,
} from '../types';

export interface UseOrderRealtimeReturn {
  // State
  isConnected: boolean;
  lastUpdate: OrderUpdateEvent | null;
  
  // Actions
  subscribeToOrderUpdates: () => void;
  unsubscribeFromOrderUpdates: () => void;
  
  // Event handlers
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onStatusChanged?: (orderId: string, status: OrderStatus) => void;
  onPaymentUpdated?: (orderId: string, paymentStatus: PaymentStatus) => void;
}

export const useOrderRealtime = (
  onOrderCreated?: (order: Order) => void,
  onOrderUpdated?: (order: Order) => void,
  onStatusChanged?: (orderId: string, status: OrderStatus) => void,
  onPaymentUpdated?: (orderId: string, paymentStatus: PaymentStatus) => void
): UseOrderRealtimeReturn => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<OrderUpdateEvent | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  /**
   * Subscribe to order updates for the current user
   */
  const subscribeToOrderUpdates = useCallback(() => {
    if (!user?.id || subscription) return;

    console.log('🔔 Subscribing to order updates for user:', user.id);

    const orderSubscription = supabase
      .channel(`order_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_orders',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📦 Order update received:', payload);
          handleOrderUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_order_items',
        },
        (payload) => {
          console.log('📋 Order item update received:', payload);
          // Handle order item updates if needed
        }
      )
      .subscribe((status) => {
        console.log('📡 Order subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          // Show ka-ching notification for successful connection
          console.log('💰 Connected to order updates - ready for ka-ching moments!');
        }
      });

    setSubscription(orderSubscription);
  }, [user?.id, subscription]);

  /**
   * Unsubscribe from order updates
   */
  const unsubscribeFromOrderUpdates = useCallback(() => {
    if (subscription) {
      console.log('🔕 Unsubscribing from order updates');
      supabase.removeChannel(subscription);
      setSubscription(null);
      setIsConnected(false);
    }
  }, [subscription]);

  /**
   * Handle incoming order updates
   */
  const handleOrderUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    try {
      const updateEvent: OrderUpdateEvent = {
        type: getUpdateType(eventType, newRecord, oldRecord),
        order_id: newRecord?.id || oldRecord?.id,
        user_id: newRecord?.user_id || oldRecord?.user_id,
        changes: newRecord,
        timestamp: new Date().toISOString(),
      };

      setLastUpdate(updateEvent);

      // Handle different types of updates
      switch (updateEvent.type) {
        case 'order_created':
          handleOrderCreated(newRecord);
          break;
        
        case 'order_updated':
          handleOrderUpdated(newRecord, oldRecord);
          break;
        
        case 'status_changed':
          handleStatusChanged(newRecord, oldRecord);
          break;
        
        case 'payment_updated':
          handlePaymentUpdated(newRecord, oldRecord);
          break;
      }
    } catch (error) {
      console.error('Error handling order update:', error);
    }
  }, [onOrderCreated, onOrderUpdated, onStatusChanged, onPaymentUpdated]);

  /**
   * Handle order creation
   */
  const handleOrderCreated = useCallback((order: Order) => {
    console.log('🎉 New order created:', order.order_number);
    
    // Show ka-ching notification! 💰
    Alert.alert(
      '🎉 Order Created!',
      `Ka-ching! 💰 Your order #${order.order_number} has been created!\n\nTotal: $${order.total_amount.toFixed(2)}`,
      [{ text: 'Great!', style: 'default' }]
    );

    onOrderCreated?.(order);
  }, [onOrderCreated]);

  /**
   * Handle order updates
   */
  const handleOrderUpdated = useCallback((newOrder: Order, oldOrder: Order) => {
    console.log('📝 Order updated:', newOrder.order_number);
    onOrderUpdated?.(newOrder);
  }, [onOrderUpdated]);

  /**
   * Handle status changes
   */
  const handleStatusChanged = useCallback((newOrder: Order, oldOrder: Order) => {
    if (newOrder.status !== oldOrder?.status) {
      console.log('📊 Order status changed:', oldOrder?.status, '→', newOrder.status);
      
      // Show different notifications based on status
      const statusMessages = {
        [OrderStatus.CONFIRMED]: {
          title: '✅ Order Confirmed!',
          message: `Your order #${newOrder.order_number} has been confirmed and is being processed.`
        },
        [OrderStatus.PROCESSING]: {
          title: '⚡ Order Processing!',
          message: `Your order #${newOrder.order_number} is now being prepared.`
        },
        [OrderStatus.SHIPPED]: {
          title: '🚚 Order Shipped!',
          message: `Your order #${newOrder.order_number} is on its way!${newOrder.tracking_number ? `\n\nTracking: ${newOrder.tracking_number}` : ''}`
        },
        [OrderStatus.DELIVERED]: {
          title: '📦 Order Delivered!',
          message: `Your order #${newOrder.order_number} has been delivered! Enjoy your purchase!`
        },
        [OrderStatus.CANCELLED]: {
          title: '❌ Order Cancelled',
          message: `Your order #${newOrder.order_number} has been cancelled.`
        },
      };

      const statusMessage = statusMessages[newOrder.status as OrderStatus];
      if (statusMessage) {
        Alert.alert(statusMessage.title, statusMessage.message);
      }

      onStatusChanged?.(newOrder.id, newOrder.status);
    }
  }, [onStatusChanged]);

  /**
   * Handle payment updates
   */
  const handlePaymentUpdated = useCallback((newOrder: Order, oldOrder: Order) => {
    if (newOrder.payment_status !== oldOrder?.payment_status) {
      console.log('💳 Payment status changed:', oldOrder?.payment_status, '→', newOrder.payment_status);
      
      // Show payment-specific notifications
      if (newOrder.payment_status === PaymentStatus.CAPTURED) {
        // Extra ka-ching for successful payment! 💰💰💰
        Alert.alert(
          '💰 Payment Successful!',
          `Ka-ching! Ka-ching! Ka-ching! 💰💰💰\n\nPayment of $${newOrder.total_amount.toFixed(2)} has been processed successfully for order #${newOrder.order_number}!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else if (newOrder.payment_status === PaymentStatus.FAILED) {
        Alert.alert(
          '❌ Payment Failed',
          `Payment for order #${newOrder.order_number} could not be processed. Please try again or use a different payment method.`,
          [{ text: 'OK', style: 'default' }]
        );
      }

      onPaymentUpdated?.(newOrder.id, newOrder.payment_status);
    }
  }, [onPaymentUpdated]);

  /**
   * Determine update type based on event and data changes
   */
  const getUpdateType = (eventType: string, newRecord: any, oldRecord: any): OrderUpdateEvent['type'] => {
    if (eventType === 'INSERT') {
      return 'order_created';
    }
    
    if (eventType === 'UPDATE') {
      if (newRecord?.status !== oldRecord?.status) {
        return 'status_changed';
      }
      if (newRecord?.payment_status !== oldRecord?.payment_status) {
        return 'payment_updated';
      }
      return 'order_updated';
    }
    
    return 'order_updated';
  };

  // Auto-subscribe when user is available
  useEffect(() => {
    if (user?.id) {
      subscribeToOrderUpdates();
    }

    // Cleanup on unmount or user change
    return () => {
      unsubscribeFromOrderUpdates();
    };
  }, [user?.id, subscribeToOrderUpdates, unsubscribeFromOrderUpdates]);

  return {
    // State
    isConnected,
    lastUpdate,
    
    // Actions
    subscribeToOrderUpdates,
    unsubscribeFromOrderUpdates,
  };
};
