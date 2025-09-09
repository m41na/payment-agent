import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../user-auth/context/AuthContext';
import { usePayment } from '../../payment-processing';
import { useShoppingCart } from '../../shopping-cart';
import { OrderService } from '../services/OrderService';
import { Order, PaymentOption, CheckoutSummary } from '../types';

export const useCheckout = () => {
  const { user } = useAuth();
  const { 
    paymentMethods, 
    hasPaymentMethods, 
    defaultPaymentMethod,
    expressCheckout,
    oneTimeCheckout,
    selectiveCheckout 
  } = usePayment();
  const { cartItems, clearCart } = useShoppingCart();
  
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize service to prevent recreation on every render
  const orderService = useMemo(() => {
    return user ? new OrderService(user.id) : null;
  }, [user?.id]);

  // Create order from current cart
  const createOrder = useCallback(async () => {
    console.log('createOrder called');
    console.log('cartItems:', cartItems);
    
    if (!user) {
      console.log('No user found');
      setError('User not authenticated');
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      console.log('No cart items found');
      setError('No items in cart');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const order = await orderService.createOrder(user.id, cartItems);
      console.log('Order created:', order);
      setCurrentOrder(order);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
      console.log('Order creation error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, cartItems, orderService]);

  // Generate payment options based on available payment methods
  const generatePaymentOptions = useCallback((): PaymentOption[] => {
    const options: PaymentOption[] = [];

    // Express checkout (default payment method)
    if (hasPaymentMethods && defaultPaymentMethod) {
      options.push({
        id: 'express',
        type: 'express',
        label: 'Express Checkout',
        description: `Pay with ${defaultPaymentMethod.brand} •••• ${defaultPaymentMethod.last4}`,
        paymentMethodId: defaultPaymentMethod.stripe_payment_method_id,
        isDefault: true
      });
    }

    // One-time payment (new card)
    options.push({
      id: 'one_time',
      type: 'one_time',
      label: 'Pay with New Card',
      description: 'Enter a new card for this purchase'
    });

    // Saved payment methods
    paymentMethods
      .filter(pm => !pm.is_default) // Exclude default (already in express)
      .forEach(pm => {
        options.push({
          id: `saved_${pm.id}`,
          type: 'saved',
          label: `${pm.brand} •••• ${pm.last4}`,
          description: `Expires ${pm.exp_month}/${pm.exp_year}`,
          paymentMethodId: pm.stripe_payment_method_id
        });
      });

    return options;
  }, [paymentMethods, hasPaymentMethods, defaultPaymentMethod]);

  // Process payment based on selected option
  const processPayment = useCallback(async (): Promise<boolean> => {
    if (!currentOrder || !selectedPaymentOption) {
      throw new Error('Order and payment option required');
    }

    try {
      setLoading(true);
      setError(null);

      let paymentResult;
      const amount = Math.round(currentOrder.total_amount * 100); // Convert to cents

      switch (selectedPaymentOption.type) {
        case 'express':
          paymentResult = await expressCheckout(amount, `Order #${currentOrder.id}`);
          break;
        case 'one_time':
          paymentResult = await oneTimeCheckout(amount, `Order #${currentOrder.id}`);
          break;
        case 'saved':
          if (!selectedPaymentOption.paymentMethodId) {
            throw new Error('Payment method ID required for saved card');
          }
          paymentResult = await selectiveCheckout(
            amount, 
            selectedPaymentOption.paymentMethodId, 
            `Order #${currentOrder.id}`
          );
          break;
        default:
          throw new Error('Invalid payment option');
      }

      if (paymentResult.success && paymentResult.paymentIntentId) {
        // Update order status
        await orderService?.updateOrderStatus(
          currentOrder.id, 
          'completed', 
          paymentResult.paymentIntentId
        );
        
        // Clear cart after successful payment
        await clearCart();
        
        return true;
      } else {
        setError(paymentResult.error || 'Payment failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentOrder, selectedPaymentOption, orderService, expressCheckout, oneTimeCheckout, selectiveCheckout, clearCart]);

  // Calculate checkout summary
  const checkoutSummary = useMemo((): CheckoutSummary | null => {
    if (!currentOrder) return null;

    return {
      subtotal: currentOrder.subtotal,
      tax: currentOrder.tax_amount,
      shipping: currentOrder.shipping_amount,
      total: currentOrder.total_amount,
      itemCount: currentOrder.item_count,
      merchantCount: currentOrder.merchant_count
    };
  }, [currentOrder]);

  // Reset checkout state
  const resetCheckout = useCallback(() => {
    setCurrentOrder(null);
    setSelectedPaymentOption(null);
    setError(null);
  }, []);

  return {
    // Data
    currentOrder,
    selectedPaymentOption,
    checkoutSummary,
    paymentOptions: generatePaymentOptions(),
    
    // State
    loading,
    error,
    
    // Actions
    createOrder,
    processPayment,
    setSelectedPaymentOption,
    resetCheckout,
    
    // Utils
    clearError: () => setError(null),
  };
};
