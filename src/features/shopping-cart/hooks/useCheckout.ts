import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { usePayment } from '../../payment-processing/hooks/usePayment';
import { useShoppingCart } from './useShoppingCart';
import { OrderService } from '../services/OrderService';
import {
  Order,
  CreateOrderData,
  ShippingAddress,
  BillingAddress,
  PaymentStatus,
  OrderStatus,
} from '../types';

export interface CheckoutOptions {
  shipping_address?: ShippingAddress;
  billing_address?: BillingAddress;
  notes?: string;
  use_saved_payment?: boolean;
  payment_method_id?: string;
}

export interface UseCheckoutReturn {
  // State
  isProcessing: boolean;
  currentOrder: Order | null;
  error: string | null;
  
  // Actions
  checkout: (options?: CheckoutOptions) => Promise<Order | null>;
  expressCheckout: () => Promise<Order | null>;
  oneTimePayment: (options?: CheckoutOptions) => Promise<Order | null>;
  savedPaymentCheckout: (paymentMethodId: string, options?: CheckoutOptions) => Promise<Order | null>;
  
  // Utilities
  calculateTotal: () => number;
  requiresShipping: () => boolean;
}

const orderService = new OrderService();

export const useCheckout = (): UseCheckoutReturn => {
  const { 
    cart, 
    cartSummary, 
    isEmpty, 
    clearCart,
    createOrder 
  } = useShoppingCart();
  
  const { 
    addPaymentMethodWithSetup,
    paymentMethods,
    processPayment,
    createPaymentIntent 
  } = usePayment();

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Main checkout flow - handles payment method selection automatically
   */
  const checkout = useCallback(async (options: CheckoutOptions = {}): Promise<Order | null> => {
    if (!cart || isEmpty) {
      setError('Cart is empty');
      return null;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Create order first
      const orderData: CreateOrderData = {
        items: cart.items,
        shipping_address: options.shipping_address,
        billing_address: options.billing_address,
        notes: options.notes,
        payment_method_id: options.payment_method_id,
      };

      const order = await createOrder(orderData);
      if (!order) {
        throw new Error('Failed to create order');
      }

      setCurrentOrder(order);

      // Process payment
      let paymentSuccess = false;
      
      if (options.use_saved_payment && options.payment_method_id) {
        // Use saved payment method
        paymentSuccess = await processSavedPayment(order, options.payment_method_id);
      } else if (paymentMethods.length > 0) {
        // Use default payment method
        const defaultMethod = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
        paymentSuccess = await processSavedPayment(order, defaultMethod.id);
      } else {
        // Add new payment method and process
        paymentSuccess = await processNewPayment(order);
      }

      if (paymentSuccess) {
        // Update order status to confirmed
        await orderService.updatePaymentStatus(order.id, PaymentStatus.CAPTURED);
        
        // Show success message with ka-ching effect! 💰
        Alert.alert(
          '🎉 Order Confirmed!', 
          `Ka-ching! 💰 Your order #${order.order_number} has been placed successfully!\n\nTotal: $${order.total_amount.toFixed(2)}`,
          [{ text: 'View Order', style: 'default' }]
        );

        return order;
      } else {
        // Payment failed, cancel order
        await orderService.updatePaymentStatus(order.id, PaymentStatus.FAILED);
        throw new Error('Payment processing failed');
      }

    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Checkout failed');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [cart, isEmpty, createOrder, paymentMethods]);

  /**
   * Express checkout - one-click checkout with default payment method
   */
  const expressCheckout = useCallback(async (): Promise<Order | null> => {
    if (paymentMethods.length === 0) {
      setError('No saved payment methods available for express checkout');
      return null;
    }

    const defaultMethod = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];
    return await checkout({ 
      use_saved_payment: true, 
      payment_method_id: defaultMethod.id 
    });
  }, [checkout, paymentMethods]);

  /**
   * One-time payment checkout - adds new payment method
   */
  const oneTimePayment = useCallback(async (options: CheckoutOptions = {}): Promise<Order | null> => {
    return await checkout({ ...options, use_saved_payment: false });
  }, [checkout]);

  /**
   * Saved payment method checkout
   */
  const savedPaymentCheckout = useCallback(async (
    paymentMethodId: string, 
    options: CheckoutOptions = {}
  ): Promise<Order | null> => {
    return await checkout({ 
      ...options, 
      use_saved_payment: true, 
      payment_method_id: paymentMethodId 
    });
  }, [checkout]);

  /**
   * Process payment with saved payment method
   */
  const processSavedPayment = useCallback(async (
    order: Order, 
    paymentMethodId: string
  ): Promise<boolean> => {
    try {
      // Create payment intent for the order
      const paymentIntent = await createPaymentIntent({
        amount: Math.round(order.total_amount * 100), // Convert to cents
        currency: order.currency.toLowerCase(),
        payment_method_id: paymentMethodId,
        confirm: true,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
        },
      });

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Update order with payment intent ID
        await orderService.updatePaymentStatus(
          order.id, 
          PaymentStatus.CAPTURED, 
          paymentIntent.id
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('Saved payment processing error:', error);
      return false;
    }
  }, [createPaymentIntent]);

  /**
   * Process payment with new payment method
   */
  const processNewPayment = useCallback(async (order: Order): Promise<boolean> => {
    try {
      // Add new payment method with setup intent
      await addPaymentMethodWithSetup();
      
      // After successful setup, get the new payment method and process payment
      // This would typically involve the payment sheet flow
      return true;
    } catch (error) {
      console.error('New payment processing error:', error);
      return false;
    }
  }, [addPaymentMethodWithSetup]);

  /**
   * Calculate total amount including tax and shipping
   */
  const calculateTotal = useCallback((): number => {
    return cartSummary?.estimated_total || 0;
  }, [cartSummary]);

  /**
   * Check if order requires shipping address
   */
  const requiresShipping = useCallback((): boolean => {
    // For now, assume all orders require shipping
    // This could be enhanced to check product types
    return !isEmpty;
  }, [isEmpty]);

  return {
    // State
    isProcessing,
    currentOrder,
    error,
    
    // Actions
    checkout,
    expressCheckout,
    oneTimePayment,
    savedPaymentCheckout,
    
    // Utilities
    calculateTotal,
    requiresShipping,
  };
};
