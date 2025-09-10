import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { usePayment } from '../../payment-processing';
import { supabase } from '../../../services/supabase';
import ShoppingCartScreen from '../components/ShoppingCartScreen';
import {
  CartItem,
  Order,
  ShoppingCartScreenProps
} from '../types';
import { useOrderRealtime } from '../hooks/useOrderRealtime';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useShoppingCartContext } from '../../../providers/ShoppingCartProvider';

const ShoppingCartContainer: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<'cart' | 'orders'>('cart');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hasNewOrders, setHasNewOrders] = useState(false);

  // Payment context
  const { expressCheckout } = usePayment();

  // Navigation
  const navigation = useNavigation();

  // Global cart hook (single source of truth)
  const {
    cart,
    cartSummary,
    merchantGroups,
    isEmpty: globalIsEmpty,
    itemCount: globalItemCount,
    isCartLoading,
    cartError,
    updateCartItem,
    removeFromCart,
    clearCart: clearGlobalCart,
    refreshCart,
  } = useShoppingCartContext();

  // Local derived values come from the global cart
  const cartItems = cart?.items || [];
  const cartTotal = cartSummary?.subtotal || 0;
  const cartItemCount = globalItemCount || 0;

  // Note: previous local mock loader removed — use global cart data instead

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
      
      if (error) {
        // If supabase returns a schema/relationship error (common when migrations differ),
        // treat as empty order history rather than a fatal error to avoid alarming users.
        const errCode = (error && (error.code || error.message)) || '';
        if (error.code === 'PGRST200' || (typeof errCode === 'string' && errCode.includes('relationship'))) {
          console.warn('Order relationship not found - treating as empty order history:', error);
          setOrders([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      const formattedOrders: Order[] = (data || []).map((order: any) => {
        const items = Array.isArray(order.order_items) ? order.order_items : [];
        return {
          id: order.id,
          date: order.created_at,
          total: order.total_amount,
          status: order.status,
          paymentIntentId: order.payment_intent_id,
          items: items.map((item: any) => ({
            id: item.id,
            title: (item.product && (item.product.title || item.product_name)) || 'Unknown product',
            price: item.price || 0,
            quantity: item.quantity || 0,
            merchant: (item.product && item.product.merchant && (item.product.merchant.business_name || item.product.merchant_name)) || item.merchant || 'Unknown merchant',
            merchantId: item.product ? (item.product.merchant_id || item.product.seller_id) : item.merchant_id,
            productId: item.product_id || item.product?.id,
          })),
        } as Order;
      });

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      // Only surface unexpected errors to the user. Missing data or schema issues are treated as empty state.
      if (!(error && error.code === 'PGRST200')) {
        Alert.alert('Error', 'Failed to load order history');
      }
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

  // Note: cartTotal/cartItemCount derived above from global cart

  // Business logic: Update item quantity using global cart API
  const updateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    try {
      if (newQuantity <= 0) {
        await removeFromCart(itemId);
      } else {
        await updateCartItem(itemId, { quantity: newQuantity });
      }
      // refresh local view
      await refreshCart();
    } catch (err) {
      console.error('Failed to update quantity:', err);
      Alert.alert('Error', 'Failed to update item quantity');
    }
  }, [removeFromCart, updateCartItem, refreshCart]);

  // Business logic: Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      await refreshCart();
    } catch (err) {
      console.error('Failed to remove item:', err);
      Alert.alert('Error', 'Failed to remove item from cart');
    }
  }, [removeFromCart, refreshCart]);

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
          onPress: async () => {
            try {
              await clearGlobalCart();
              await refreshCart();
            } catch (err) {
              console.error('Failed to clear cart:', err);
              Alert.alert('Error', 'Failed to clear cart');
            }
          }
        },
      ]
    );
  }, [clearGlobalCart, refreshCart]);

  // Business logic: Process checkout
  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Add items to your cart before checking out');
      return;
    }

    setCheckoutLoading(true);
    try {
      const totalCents = Math.round(cartTotal * 100);
      const paymentResult = await expressCheckout(totalCents, 'Cart checkout');

      if (!paymentResult || !paymentResult.success || !paymentResult.paymentIntentId) {
        throw new Error('Payment failed or did not complete');
      }

      // Create order in database
      const { data: orderData, error: orderError } = await supabase
        .from('pg_orders')
        .insert({
          total_amount: cartTotal,
          status: 'completed',
          payment_intent_id: paymentResult.paymentIntentId,
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

      // Clear cart after successful payment — ensure global cart cleared
      await clearGlobalCart();
      await refreshCart();

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
  }, [cartItems, cartTotal, expressCheckout, loadOrders, clearGlobalCart, refreshCart]);
  
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
      // fetch orders when user opens orders tab
      loadOrders().catch(() => {});
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
    // Ensure cart is loaded from global source
    refreshCart().catch(() => {});
    // Only load orders on mount if the orders tab is active
    if (activeTab === 'orders') {
      loadOrders().catch(() => {});
    }
  }, [loadOrders, activeTab, refreshCart]);

  // Ensure the default visible pill is the Cart when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      setActiveTab('cart');
      // Ensure latest cart data is loaded whenever the ShoppingCart screen gains focus
      (async () => {
        try {
          await refreshCart();
        } catch (err) {
          console.warn('Failed to refresh cart on focus', err);
        }
      })();
      return () => {};
    }, [refreshCart])
  );
  
  // Helper navigation actions
  const onNavigateToOrders = () => {
    try {
      navigation.navigate('DiscoveryTab');
    } catch (err) {
      console.warn('Failed to navigate to DiscoveryTab, falling back to root DiscoveryListing', err);
      try { navigation.navigate('DiscoveryListing'); } catch (_) {}
    }
  };

  const onNavigateToProduct = (productId: string) => {
    try {
      // Navigate to discovery listing and pass productId for selection
      navigation.navigate('DiscoveryTab', { screen: 'DiscoveryListing', params: { productId } });
    } catch (err) {
      console.warn('Failed to navigate to product via tab navigator, falling back to DiscoveryListing', err);
      try { navigation.navigate('DiscoveryListing', { productId }); } catch (_) {}
    }
  };

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
      // Prefer navigation when available
      try {
        navigation.navigate('Checkout');
      } catch (e) {
        // fallback to direct handler
        handleCheckout();
      }
    },
    onNavigateToOrders,
    onNavigateToProduct,
    onRefreshOrders: handleRefreshOrders,
    onViewOrderDetails: handleViewOrderDetails,
    // Notification flag for UI
    orderNotification: hasNewOrders,
  };
  
  return <ShoppingCartScreen {...shoppingCartProps} />;
};

export default ShoppingCartContainer;
