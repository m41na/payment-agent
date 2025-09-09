import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useShoppingCart, useCheckout, useOrderRealtime, useSellerTransactions } from '../features/shopping-cart';
import { useAuth } from '../features/user-auth/context/AuthContext';

/**
 * Shopping Cart Flow Demo
 * 
 * Comprehensive demonstration of the shopping cart and checkout system:
 * - Cart management (add, update, remove items)
 * - Checkout flows (express, saved payment, one-time payment)
 * - Real-time order updates and notifications
 * - Seller transaction tracking
 * - Ka-ching notifications for successful transactions
 */
export const ShoppingCartFlowDemo: React.FC = () => {
  const { user } = useAuth();
  const {
    cart,
    orders,
    isLoading: cartLoading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
    refreshOrders,
  } = useShoppingCart();

  const {
    checkout,
    checkoutWithSavedPayment,
    expressCheckout,
    isProcessing,
    error: checkoutError,
  } = useCheckout();

  const {
    isConnected: realtimeConnected,
    subscribeToOrderUpdates,
    unsubscribeFromOrderUpdates,
  } = useOrderRealtime();

  const {
    transactions,
    summary,
    isLoading: transactionsLoading,
    isConnected: transactionsConnected,
    refreshTransactions,
  } = useSellerTransactions();

  const [demoStep, setDemoStep] = useState<string>('ready');
  const [demoLog, setDemoLog] = useState<string[]>([]);

  // Demo products for testing
  const demoProducts = [
    {
      id: 'demo-product-1',
      name: 'Premium Coffee Beans',
      price: 24.99,
      seller_id: 'demo-seller-1',
      seller_name: 'Coffee Roasters Co.',
      image_url: null,
      description: 'Freshly roasted premium coffee beans',
    },
    {
      id: 'demo-product-2', 
      name: 'Artisan Chocolate',
      price: 12.50,
      seller_id: 'demo-seller-2',
      seller_name: 'Sweet Treats Shop',
      image_url: null,
      description: 'Handcrafted artisan chocolate',
    },
    {
      id: 'demo-product-3',
      name: 'Organic Honey',
      price: 18.75,
      seller_id: user?.id || 'current-user', // Make current user the seller
      seller_name: 'Your Store',
      image_url: null,
      description: 'Pure organic wildflower honey',
    },
  ];

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDemoLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addToLog('🚀 Shopping Cart Demo initialized');
    addToLog(`👤 User: ${user?.email || 'Not logged in'}`);
    addToLog(`🛒 Cart items: ${cart?.items?.length || 0}`);
    addToLog(`📦 Orders: ${orders?.length || 0}`);
    addToLog(`📡 Realtime connected: ${realtimeConnected ? '✅' : '❌'}`);
    addToLog(`💰 Seller transactions connected: ${transactionsConnected ? '✅' : '❌'}`);
  }, [user, cart, orders, realtimeConnected, transactionsConnected]);

  /**
   * Demo Step 1: Add items to cart
   */
  const runAddToCartDemo = async () => {
    try {
      setDemoStep('adding-to-cart');
      addToLog('🛒 Starting add to cart demo...');

      for (const product of demoProducts) {
        addToLog(`➕ Adding ${product.name} to cart...`);
        await addToCart({
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
          seller_id: product.seller_id,
          seller_name: product.seller_name,
          product_image: product.image_url,
          product_description: product.description,
        });
        
        // Small delay for demo effect
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      addToLog('✅ All demo products added to cart!');
      await refreshCart();
      setDemoStep('cart-ready');
    } catch (error) {
      addToLog(`❌ Error adding to cart: ${error}`);
      setDemoStep('error');
    }
  };

  /**
   * Demo Step 2: Update cart items
   */
  const runUpdateCartDemo = async () => {
    if (!cart?.items?.length) {
      addToLog('❌ No cart items to update');
      return;
    }

    try {
      setDemoStep('updating-cart');
      addToLog('📝 Starting cart update demo...');

      const firstItem = cart.items[0];
      const newQuantity = firstItem.quantity + 1;

      addToLog(`🔄 Updating ${firstItem.product_name} quantity to ${newQuantity}...`);
      await updateCartItem(firstItem.id, { quantity: newQuantity });

      addToLog('✅ Cart item updated successfully!');
      await refreshCart();
      setDemoStep('cart-ready');
    } catch (error) {
      addToLog(`❌ Error updating cart: ${error}`);
      setDemoStep('error');
    }
  };

  /**
   * Demo Step 3: Express checkout
   */
  const runExpressCheckoutDemo = async () => {
    if (!cart?.items?.length) {
      addToLog('❌ No cart items for checkout');
      return;
    }

    try {
      setDemoStep('express-checkout');
      addToLog('⚡ Starting express checkout demo...');
      addToLog('💳 Using default saved payment method...');

      const result = await expressCheckout();
      
      if (result.success) {
        addToLog('🎉 Express checkout successful!');
        addToLog(`📦 Order created: ${result.order?.order_number}`);
        addToLog('💰 Ka-ching! Payment processed successfully!');
        await refreshOrders();
        await refreshCart();
      } else {
        addToLog(`❌ Express checkout failed: ${result.error?.message}`);
      }

      setDemoStep('ready');
    } catch (error) {
      addToLog(`❌ Express checkout error: ${error}`);
      setDemoStep('error');
    }
  };

  /**
   * Demo Step 4: One-time payment checkout
   */
  const runOneTimeCheckoutDemo = async () => {
    if (!cart?.items?.length) {
      addToLog('❌ No cart items for checkout');
      return;
    }

    try {
      setDemoStep('onetime-checkout');
      addToLog('💳 Starting one-time payment checkout demo...');
      addToLog('🆕 Using new payment method (payment sheet)...');

      const result = await checkout();
      
      if (result.success) {
        addToLog('🎉 One-time checkout successful!');
        addToLog(`📦 Order created: ${result.order?.order_number}`);
        addToLog('💰 Ka-ching! Payment processed successfully!');
        await refreshOrders();
        await refreshCart();
      } else {
        addToLog(`❌ One-time checkout failed: ${result.error?.message}`);
      }

      setDemoStep('ready');
    } catch (error) {
      addToLog(`❌ One-time checkout error: ${error}`);
      setDemoStep('error');
    }
  };

  /**
   * Demo Step 5: Clear cart
   */
  const runClearCartDemo = async () => {
    try {
      setDemoStep('clearing-cart');
      addToLog('🗑️ Clearing cart...');

      await clearCart();
      addToLog('✅ Cart cleared successfully!');
      await refreshCart();
      setDemoStep('ready');
    } catch (error) {
      addToLog(`❌ Error clearing cart: ${error}`);
      setDemoStep('error');
    }
  };

  /**
   * Refresh all data
   */
  const refreshAllData = async () => {
    try {
      setDemoStep('refreshing');
      addToLog('🔄 Refreshing all data...');

      await Promise.all([
        refreshCart(),
        refreshOrders(),
        refreshTransactions(),
      ]);

      addToLog('✅ All data refreshed!');
      setDemoStep('ready');
    } catch (error) {
      addToLog(`❌ Error refreshing data: ${error}`);
      setDemoStep('error');
    }
  };

  const isLoading = cartLoading || transactionsLoading || isProcessing;
  const canInteract = demoStep === 'ready' || demoStep === 'cart-ready';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="🛒 Shopping Cart Flow Demo" subtitle="Test complete checkout system" />
        <Card.Content>
          
          {/* Connection Status */}
          <View style={styles.statusContainer}>
            <Chip 
              icon={realtimeConnected ? 'check-circle' : 'alert-circle'}
              style={[styles.statusChip, { backgroundColor: realtimeConnected ? '#e8f5e8' : '#ffeaea' }]}
            >
              Realtime: {realtimeConnected ? 'Connected' : 'Disconnected'}
            </Chip>
            <Chip 
              icon={transactionsConnected ? 'check-circle' : 'alert-circle'}
              style={[styles.statusChip, { backgroundColor: transactionsConnected ? '#e8f5e8' : '#ffeaea' }]}
            >
              Transactions: {transactionsConnected ? 'Connected' : 'Disconnected'}
            </Chip>
          </View>

          {/* Cart Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Cart Summary</Text>
            <Text>Items: {cart?.items?.length || 0}</Text>
            <Text>Total: ${cart?.summary?.total?.toFixed(2) || '0.00'}</Text>
            <Text>Merchants: {cart?.summary?.merchant_count || 0}</Text>
          </View>

          {/* Orders Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Orders Summary</Text>
            <Text>Total Orders: {orders?.length || 0}</Text>
            <Text>Recent Orders: {orders?.slice(0, 3).map(o => `#${o.order_number}`).join(', ') || 'None'}</Text>
          </View>

          {/* Seller Transactions Summary */}
          {summary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Seller Transactions</Text>
              <Text>Total Sales: ${summary.total_sales.toFixed(2)}</Text>
              <Text>Net Earnings: ${summary.net_earnings.toFixed(2)}</Text>
              <Text>Commission Paid: ${summary.commission_paid.toFixed(2)}</Text>
              <Text>Transactions: {transactions.length}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Demo Controls */}
          <View style={styles.controlsContainer}>
            <Text style={styles.controlsTitle}>Demo Controls</Text>
            
            <Button
              mode="contained"
              onPress={runAddToCartDemo}
              disabled={!canInteract || isLoading}
              style={styles.button}
              icon="cart-plus"
            >
              1. Add Demo Products to Cart
            </Button>

            <Button
              mode="contained"
              onPress={runUpdateCartDemo}
              disabled={!canInteract || isLoading || !cart?.items?.length}
              style={styles.button}
              icon="pencil"
            >
              2. Update Cart Items
            </Button>

            <Button
              mode="contained"
              onPress={runExpressCheckoutDemo}
              disabled={!canInteract || isLoading || !cart?.items?.length}
              style={styles.button}
              icon="lightning-bolt"
            >
              3. Express Checkout
            </Button>

            <Button
              mode="contained"
              onPress={runOneTimeCheckoutDemo}
              disabled={!canInteract || isLoading || !cart?.items?.length}
              style={styles.button}
              icon="credit-card"
            >
              4. One-Time Payment Checkout
            </Button>

            <Button
              mode="outlined"
              onPress={runClearCartDemo}
              disabled={!canInteract || isLoading || !cart?.items?.length}
              style={styles.button}
              icon="delete"
            >
              Clear Cart
            </Button>

            <Button
              mode="outlined"
              onPress={refreshAllData}
              disabled={isLoading}
              style={styles.button}
              icon="refresh"
            >
              Refresh All Data
            </Button>
          </View>

          <Divider style={styles.divider} />

          {/* Demo Log */}
          <View style={styles.logContainer}>
            <Text style={styles.logTitle}>Demo Log</Text>
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>Processing: {demoStep}</Text>
              </View>
            )}
            <ScrollView style={styles.logScroll} nestedScrollEnabled>
              {demoLog.map((log, index) => (
                <Text key={index} style={styles.logEntry}>{log}</Text>
              ))}
            </ScrollView>
          </View>

          {/* Error Display */}
          {checkoutError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Checkout Error:</Text>
              <Text style={styles.errorText}>{checkoutError.message}</Text>
            </View>
          )}

        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statusChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  controlsContainer: {
    marginBottom: 16,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  button: {
    marginBottom: 8,
  },
  logContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    maxHeight: 300,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  logScroll: {
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#555',
  },
  errorContainer: {
    backgroundColor: '#ffeaea',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
  },
});

export default ShoppingCartFlowDemo;
