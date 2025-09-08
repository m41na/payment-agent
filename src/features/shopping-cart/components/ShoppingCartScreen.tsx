import React from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Chip, 
  IconButton, 
  Divider,
  ActivityIndicator,
  SegmentedButtons 
} from 'react-native-paper';
import { ShoppingCartScreenProps, CartItem, Order } from '../types';

const ShoppingCartScreen: React.FC<ShoppingCartScreenProps> = ({
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
  onTabChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onRefreshOrders,
  onViewOrderDetails,
}) => {

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
          <View style={styles.itemActions}>
            <IconButton
              icon="delete"
              size={20}
              iconColor="#e91e63"
              onPress={() => onRemoveItem(item.id)}
            />
            <Text variant="titleMedium" style={styles.itemPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        </View>
        
        <View style={styles.quantityControls}>
          <IconButton
            icon="minus"
            size={20}
            onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          />
          <Text variant="bodyLarge" style={styles.quantity}>
            {item.quantity}
          </Text>
          <IconButton
            icon="plus"
            size={20}
            onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
          />
          <Text variant="bodyMedium" style={styles.unitPrice}>
            ${item.price.toFixed(2)} each
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderOrderItem = ({ item }: { item: Order }) => (
    <Card style={styles.orderItem} onPress={() => onViewOrderDetails(item.id)}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <View>
            <Text variant="titleMedium">Order #{item.id.slice(-8)}</Text>
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
                item.status === 'completed' && styles.completedChip,
                item.status === 'pending' && styles.pendingChip,
                item.status === 'cancelled' && styles.cancelledChip,
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
          {item.items.slice(0, 3).map((orderItem, index) => (
            <Text key={index} variant="bodySmall" style={styles.orderItemText}>
              {orderItem.quantity}x {orderItem.title}
            </Text>
          ))}
          {item.items.length > 3 && (
            <Text variant="bodySmall" style={styles.orderItemText}>
              +{item.items.length - 3} more items
            </Text>
          )}
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
              🛒 Your cart is empty
            </Text>
            <Text variant="bodyMedium" style={styles.emptyCartSubtext}>
              Browse nearby merchants to add items to your cart
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <>
          <View style={styles.cartHeader}>
            <Text variant="titleLarge" style={styles.cartTitle}>
              Shopping Cart ({cartItemCount} items)
            </Text>
            <Button 
              mode="text" 
              onPress={onClearCart}
              textColor="#e91e63"
            >
              Clear All
            </Button>
          </View>

          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
          />

          <Card style={styles.checkoutCard}>
            <Card.Content>
              <View style={styles.totalRow}>
                <Text variant="titleLarge">Total</Text>
                <Text variant="titleLarge" style={styles.totalAmount}>
                  ${cartTotal.toFixed(2)}
                </Text>
              </View>
              
              <Button
                mode="contained"
                onPress={onCheckout}
                loading={checkoutLoading}
                disabled={checkoutLoading || cartItems.length === 0}
                style={styles.checkoutButton}
                contentStyle={styles.checkoutButtonContent}
              >
                {checkoutLoading ? 'Processing...' : 'Checkout'}
              </Button>
            </Card.Content>
          </Card>
        </>
      )}
    </View>
  );

  const OrdersView = () => (
    <View style={styles.ordersContainer}>
      <View style={styles.ordersHeader}>
        <Text variant="titleLarge" style={styles.ordersTitle}>
          Order History
        </Text>
        <IconButton
          icon="refresh"
          onPress={onRefreshOrders}
          disabled={loading}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator animating={true} size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading orders...
          </Text>
        </View>
      ) : orders.length === 0 ? (
        <Card style={styles.emptyOrders}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.emptyOrdersText}>
              📦 No orders yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyOrdersSubtext}>
              Your completed orders will appear here
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefreshOrders}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={onTabChange}
        buttons={[
          { 
            value: 'cart', 
            label: `Cart${cartItemCount > 0 ? ` (${cartItemCount})` : ''}`,
            icon: 'cart'
          },
          { 
            value: 'orders', 
            label: 'Orders',
            icon: 'package-variant'
          },
        ]}
        style={styles.tabNavigation}
      />

      {/* Content */}
      {activeTab === 'cart' ? <CartView /> : <OrdersView />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabNavigation: {
    margin: 16,
    marginBottom: 8,
  },
  cartContainer: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cartTitle: {
    fontWeight: '600',
  },
  cartList: {
    paddingHorizontal: 16,
  },
  cartItem: {
    marginBottom: 12,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantText: {
    color: '#666',
    marginTop: 2,
  },
  itemPrice: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: 'center',
  },
  unitPrice: {
    marginLeft: 16,
    color: '#666',
  },
  checkoutCard: {
    margin: 16,
    elevation: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAmount: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  checkoutButton: {
    backgroundColor: '#6200ee',
  },
  checkoutButtonContent: {
    paddingVertical: 8,
  },
  emptyCart: {
    margin: 16,
    marginTop: 60,
  },
  emptyCartText: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  emptyCartSubtext: {
    textAlign: 'center',
    color: '#999',
  },
  ordersContainer: {
    flex: 1,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ordersTitle: {
    fontWeight: '600',
  },
  ordersList: {
    paddingHorizontal: 16,
  },
  orderItem: {
    marginBottom: 12,
    elevation: 2,
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
  pendingChip: {
    backgroundColor: '#fff3e0',
  },
  cancelledChip: {
    backgroundColor: '#ffebee',
  },
  orderTotal: {
    fontWeight: 'bold',
  },
  orderItems: {
    marginTop: 8,
  },
  orderItemText: {
    color: '#666',
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyOrders: {
    margin: 16,
    marginTop: 60,
  },
  emptyOrdersText: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  emptyOrdersSubtext: {
    textAlign: 'center',
    color: '#999',
  },
});

export default ShoppingCartScreen;
