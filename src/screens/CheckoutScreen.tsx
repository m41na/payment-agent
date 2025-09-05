import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Card, Button, List, Divider, Chip, IconButton } from 'react-native-paper';
import { usePayment } from '../contexts/PaymentContext';

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  merchant: string;
  image?: string;
}

interface Order {
  id: string;
  date: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled';
  items: CartItem[];
}

const CheckoutScreen = () => {
  const { expressCheckout, loading } = usePayment();
  const [activeTab, setActiveTab] = useState<'cart' | 'orders'>('cart');
  
  // Cart data - will be loaded from context/state management
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Order history - will be loaded from database
  const [orders] = useState<Order[]>([]);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems(items => items.filter(item => item.id !== itemId));
    } else {
      setCartItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    try {
      const totalCents = Math.round(getCartTotal() * 100);
      const paymentIntentId = await expressCheckout(totalCents, 'Cart checkout');
      // TODO: Clear cart after successful payment
      console.log('Payment completed:', paymentIntentId);
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card style={styles.cartItem}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text variant="titleMedium">{item.title}</Text>
            <Text variant="bodySmall" style={styles.merchantText}>
              {item.merchant}
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.itemPrice}>
            ${(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.quantityControls}>
          <IconButton
            icon="minus"
            size={20}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          />
          <Text variant="bodyLarge" style={styles.quantity}>
            {item.quantity}
          </Text>
          <IconButton
            icon="plus"
            size={20}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          />
          <Text variant="bodyMedium" style={styles.unitPrice}>
            ${item.price.toFixed(2)} each
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderOrderItem = ({ item }: { item: Order }) => (
    <Card style={styles.orderItem}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <View>
            <Text variant="titleMedium">Order #{item.id}</Text>
            <Text variant="bodySmall" style={styles.orderDate}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.orderRight}>
            <Chip 
              mode="outlined" 
              compact
              style={[
                styles.statusChip,
                item.status === 'completed' && styles.completedChip
              ]}
            >
              {item.status}
            </Chip>
            <Text variant="titleMedium" style={styles.orderTotal}>
              ${item.total.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.orderItems}>
          {item.items.map((orderItem, index) => (
            <Text key={index} variant="bodySmall" style={styles.orderItemText}>
              {orderItem.quantity}x {orderItem.title}
            </Text>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const CartView = () => (
    <View style={styles.cartContainer}>
      {cartItems.length === 0 ? (
        <Card style={styles.emptyCart}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.emptyCartText}>
              Your cart is empty
            </Text>
            <Text variant="bodyMedium" style={styles.emptyCartSubtext}>
              Browse nearby merchants to add items to your cart
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            style={styles.cartList}
          />
          
          <Card style={styles.checkoutCard}>
            <Card.Content>
              <View style={styles.totalRow}>
                <Text variant="titleLarge">Total:</Text>
                <Text variant="titleLarge" style={styles.totalAmount}>
                  ${getCartTotal().toFixed(2)}
                </Text>
              </View>
              
              <Button
                mode="contained"
                onPress={handleCheckout}
                loading={loading}
                disabled={loading || cartItems.length === 0}
                style={styles.checkoutButton}
              >
                Checkout
              </Button>
            </Card.Content>
          </Card>
        </>
      )}
    </View>
  );

  const OrdersView = () => (
    <FlatList
      data={orders}
      renderItem={renderOrderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.ordersContainer}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          {activeTab === 'cart' ? 'Shopping Cart' : 'Order History'}
        </Text>
        
        <View style={styles.tabButtons}>
          <Button
            mode={activeTab === 'cart' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('cart')}
            style={styles.tabButton}
          >
            Cart ({cartItems.length})
          </Button>
          <Button
            mode={activeTab === 'orders' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('orders')}
            style={styles.tabButton}
          >
            Orders
          </Button>
        </View>
      </View>

      {activeTab === 'cart' ? <CartView /> : <OrdersView />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  cartContainer: {
    flex: 1,
  },
  cartList: {
    flex: 1,
    padding: 8,
  },
  cartItem: {
    margin: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  merchantText: {
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  unitPrice: {
    marginLeft: 'auto',
    color: '#666',
  },
  checkoutCard: {
    margin: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAmount: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  checkoutButton: {
    paddingVertical: 8,
  },
  emptyCart: {
    margin: 16,
    padding: 32,
  },
  emptyCartText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    textAlign: 'center',
    color: '#666',
  },
  ordersContainer: {
    padding: 8,
  },
  orderItem: {
    margin: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderDate: {
    color: '#666',
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 4,
  },
  completedChip: {
    backgroundColor: '#e8f5e8',
  },
  orderTotal: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  orderItems: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  orderItemText: {
    color: '#666',
    marginBottom: 2,
  },
});

export default CheckoutScreen;
