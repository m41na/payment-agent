import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { usePayment } from '../../../contexts/PaymentContext';
import { supabase } from '../../../services/supabase';
import ShoppingCartScreen from '../components/ShoppingCartScreen';
import {
  CartItem,
  Order,
  ShoppingCartScreenProps
} from '../types';
import { useOrderRealtime } from '../hooks/useOrderRealtime';

const ShoppingCartContainer: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'cart' | 'orders'>('cart');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hasNewOrders, setHasNewOrders] = useState(false);

  // Payment context
  const { expressCheckout } = usePayment();

  
  
  // Business logic: Load cart items from storage/database
  const loadCartItems = useCallback(async () => {
    try {
      // Load from local storage or database
      // For now, using mock data
      const mockCartItems: CartItem[] = [
        {
          id: '1',
          title: 'Vintage Coffee Table',
          price: 45.99,
          quantity: 1,
          merchant: 'Sarah\'s Antiques',
          merchantId: 'merchant_1',
          productId: 'product_1',
        },
        {
          id: '2',
          title: 'Garden Tools Set',
          price: 25.00,
          quantity: 2,
          merchant: 'Mike\'s Hardware',
          merchantId: 'merchant_2',
          productId: 'product_2',
        },
      ];
      setCartItems(mockCartItems);
    } catch (error) {
      console.error('Error loading cart items:', error);
    }
  }, []);

  // Business logic: Load order history
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pg_orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            product:pg_products (
              title,
              merchant:pg_profiles (business_name)
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedOrders: Order[] = (data || []).map(order => ({
        id: order.id,
        date: order.created_at,
        total: order.total_amount,
        status: order.status,
        paymentIntentId: order.payment_intent_id,
        items: order.order_items.map((item: any) => ({
          id: item.id,
          title: item.product.title,
          price: item.price,
          quantity: item.quantity,
          merchant: item.product.merchant.business_name,
          merchantId: item.product.merchant_id,
          productId: item.product_id,
        })),
      }));
      
      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time order updates (defined after loadOrders)
  const onOrderCreated = useCallback((order: Order) => {
    if (activeTab !== 'orders') setHasNewOrders(true);
    // refresh order list
    loadOrders().catch(() => {});
  }, [activeTab, loadOrders]);

  const onOrderUpdated = useCallback((order: Order) => {
    if (activeTab !== 'orders') setHasNewOrders(true);
    loadOrders().catch(() => {});
  }, [activeTab, loadOrders]);

  // Subscribe to realtime updates
  useOrderRealtime(onOrderCreated, onOrderUpdated);

  // Business logic: Calculate cart totals
  const cartTotal = React.useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cartItems]);
  
  const cartItemCount = React.useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);
  
  // Business logic: Update item quantity
  const updateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== itemId));
    } else {
      setCartItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
    
    // Persist to storage/database
    // TODO: Implement cart persistence
  }, []);
  
  // Business logic: Remove item from cart
  const removeItem = useCallback((itemId: string) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
    // TODO: Persist to storage/database
  }, []);
  
  // Business logic: Clear entire cart
  const clearCart = useCallback(() => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setCartItems([]);
            // TODO: Persist to storage/database
          }
        },
      ]
    );
  }, []);
  
  // Business logic: Process checkout
  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Add items to your cart before checking out');
      return;
    }
    
    setCheckoutLoading(true);
    try {
      const totalCents = Math.round(cartTotal * 100);
      const paymentIntentId = await expressCheckout(totalCents, 'Cart checkout');
      
      // Create order in database
      const { data: orderData, error: orderError } = await supabase
        .from('pg_orders')
        .insert({
          total_amount: cartTotal,
          status: 'completed',
          payment_intent_id: paymentIntentId,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));
      
      const { error: itemsError } = await supabase
        .from('pg_order_items')
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Clear cart after successful payment
      setCartItems([]);
      
      // Refresh orders
      await loadOrders();
      
      // Switch to orders tab to show completed order
      setActiveTab('orders');
      
      Alert.alert('Success', 'Your order has been completed!');
      
    } catch (error) {
      console.error('Checkout failed:', error);
      Alert.alert('Checkout Failed', 'Please try again or contact support');
    } finally {
      setCheckoutLoading(false);
    }
  }, [cartItems, cartTotal, expressCheckout, loadOrders]);
  
  // Business logic: Group cart items by merchant
  const groupedCartItems = React.useMemo(() => {
    const groups: { [merchantId: string]: { merchant: string; items: CartItem[] } } = {};
    
    cartItems.forEach(item => {
      if (!groups[item.merchantId]) {
        groups[item.merchantId] = {
          merchant: item.merchant,
          items: [],
        };
      }
      groups[item.merchantId].items.push(item);
    });
    
    return Object.values(groups);
  }, [cartItems]);
  
  // Event handlers
  const handleTabChange = (tab: 'cart' | 'orders') => {
    setActiveTab(tab);
    if (tab === 'orders') {
      // clear notification when user views orders
      setHasNewOrders(false);
    }
  };

  const handleRefreshOrders = () => {
    loadOrders();
  };
  
  const handleViewOrderDetails = (orderId: string) => {
    // Navigate to order details screen
    console.log('View order details:', orderId);
  };
  
  // Effects
  useEffect(() => {
    loadCartItems();
    loadOrders();
  }, [loadCartItems, loadOrders]);
  
  // Props for dumb component
  const shoppingCartProps: ShoppingCartScreenProps = {
    // View state
    activeTab,
    loading,
    checkoutLoading,

    // Cart data
    cartItems,
    cartTotal,
    cartItemCount,

    // Order data
    orders,

    // Actions
    onTabChange: handleTabChange,
    onUpdateQuantity: updateQuantity,
    onRemoveItem: removeItem,
    onClearCart: clearCart,
    // Preserve existing behavior for containers without navigation
    onCheckout: handleCheckout,
    // New prop expected by UI components to navigate to the Checkout screen
    onNavigateToCheckout: () => {
      console.log('Navigate to Checkout (container fallback)');
      handleCheckout();
    },
    onRefreshOrders: handleRefreshOrders,
    onViewOrderDetails: handleViewOrderDetails,
    // Notification flag for UI
    orderNotification: hasNewOrders,
  };
  
  return <ShoppingCartScreen {...shoppingCartProps} />;
};

export default ShoppingCartContainer;
