import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShoppingCart } from '../hooks/useShoppingCart';
import { CartItem } from '../types';
import { AppIcons, IconSizes, IconColors } from '../../../types/icons';

const { width } = Dimensions.get('window');

interface ShoppingCartScreenProps {
  onNavigateToOrders?: () => void;
  onNavigateToProduct?: (productId: string) => void;
  onNavigateToCheckout?: () => void;
}

const ShoppingCartScreen: React.FC<ShoppingCartScreenProps> = ({
  onNavigateToOrders,
  onNavigateToProduct,
  onNavigateToCheckout,
}) => {
  const {
    cart,
    cartSummary,
    merchantGroups,
    isEmpty,
    itemCount,
    isCartLoading,
    cartError,
    updateCartItem,
    removeFromCart,
    clearCart,
  } = useShoppingCart();

  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'cart' | 'summary'>('cart');

  const handleUpdateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity === 0) {
      // Alert.alert(
      //   'Remove Item',
      //   'Are you sure you want to remove this item from your cart?',
      //   [
      //     { text: 'Cancel', style: 'cancel' },
      //     { 
      //       text: 'Remove', 
      //       style: 'destructive',
      //       onPress: () => removeFromCart(itemId)
      //     },
      //   ]
      // );
    } else {
      await updateCartItem(itemId, { quantity });
    }
  }, [updateCartItem, removeFromCart]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    // Alert.alert(
    //   'Remove Item',
    //   'Are you sure you want to remove this item from your cart?',
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     { 
    //       text: 'Remove', 
    //       style: 'destructive',
    //       onPress: () => removeFromCart(itemId)
    //     },
    //   ]
    // );
  }, [removeFromCart]);

  const handleClearCart = useCallback(() => {
    // Alert.alert(
    //   'Clear Cart',
    //   'Are you sure you want to remove all items from your cart?',
    //   [
    //     { text: 'Cancel', style: 'cancel' },
    //     { 
    //       text: 'Clear All', 
    //       style: 'destructive',
    //       onPress: clearCart
    //     },
    //   ]
    // );
  }, [clearCart]);

  const handleOneTimePayment = useCallback(async () => {
    if (!onNavigateToCheckout) {
      return;
    }
    
    if (isEmpty) {
      return;
    }
    
    onNavigateToCheckout();
  }, [onNavigateToCheckout, isEmpty]);

  const handleExpressCheckout = useCallback(async () => {
    if (!onNavigateToCheckout) {
      // Alert.alert('Error', 'Checkout navigation not available');
      return;
    }
    
    if (isEmpty) {
      // Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }
    
    // Navigate to checkout screen for express checkout
    onNavigateToCheckout();
  }, [onNavigateToCheckout, isEmpty]);

  const renderCartItem = (item: CartItem) => {
    const itemTotal = Math.round((item.unit_price * item.quantity) * 100) / 100;
    console.log('Rendering cart item - unit_price:', item.unit_price);
    console.log('Rendering cart item - calculated total:', itemTotal);
    
    return (
    <View key={item.id} style={styles.cartItem}>
      <TouchableOpacity 
        style={styles.itemImageContainer}
        onPress={() => onNavigateToProduct?.(item.product_id)}
      >
        {item.product_snapshot.image_url ? (
          <Image source={{ uri: item.product_snapshot.image_url }} style={styles.itemImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image" size={32} color="#94a3b8" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.itemDetails}>
        <TouchableOpacity onPress={() => onNavigateToProduct?.(item.product_id)}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.product_snapshot.title}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.merchantName}>{item.product_snapshot.merchant_name}</Text>
        <Text style={styles.itemCondition}>
          Condition: {item.product_snapshot.product_condition.replace('_', ' ')}
        </Text>
        
        <View style={styles.priceQuantityRow}>
          <Text style={styles.itemPrice}>${item.unit_price.toFixed(2)}</Text>
          
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
            >
              <Ionicons name="remove" size={16} color="#667eea" />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{item.quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Ionicons name="add" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemActions}>
          <Text style={styles.itemTotal}>
            Total: ${itemTotal.toFixed(2)}
          </Text>
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )};

  const renderMerchantGroup = (group: any) => (
    <View key={group.seller_id} style={styles.merchantGroup}>
      <View style={styles.merchantHeader}>
        <Ionicons name="business" size={20} color="#667eea" />
        <Text style={styles.merchantTitle}>{group.merchant_name}</Text>
        <Text style={styles.merchantItemCount}>
          {group.item_count} item{group.item_count !== 1 ? 's' : ''}
        </Text>
      </View>
      
      {group.items.map(renderCartItem)}
      
      <View style={styles.merchantSummary}>
        <Text style={styles.merchantSubtotal}>
          Subtotal: ${group.subtotal.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderCartTab = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {isEmpty ? (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={64} color="#94a3b8" />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartText}>
            Add some items to your cart to get started
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>
              Shopping Cart ({itemCount} item{itemCount !== 1 ? 's' : ''})
            </Text>
            <TouchableOpacity
              style={styles.clearCartButton}
              onPress={handleClearCart}
            >
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {merchantGroups.map(renderMerchantGroup)}
          
          {/* Checkout Button */}
          <View style={styles.checkoutSection}>
            <View style={styles.cartSummaryQuick}>
              <Text style={styles.quickSummaryText}>
                {itemCount} item{itemCount !== 1 ? 's' : ''} • ${cartSummary?.subtotal.toFixed(2)}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.checkoutButton, styles.primaryButton]}
              onPress={handleOneTimePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderSummaryTab = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {cartSummary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items ({cartSummary.total_items})</Text>
            <Text style={styles.summaryValue}>${cartSummary.subtotal.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Tax</Text>
            <Text style={styles.summaryValue}>${cartSummary.estimated_tax.toFixed(2)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Shipping ({cartSummary.unique_merchants} merchant{cartSummary.unique_merchants !== 1 ? 's' : ''})
            </Text>
            <Text style={styles.summaryValue}>${cartSummary.estimated_shipping.toFixed(2)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${cartSummary.estimated_total.toFixed(2)}</Text>
          </View>

          <View style={styles.checkoutButtons}>
            <TouchableOpacity
              style={[styles.checkoutButton, styles.expressButton]}
              onPress={handleExpressCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" />
                  <Text style={styles.checkoutButtonText}>Express Checkout</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkoutButton, styles.primaryButton]}
              onPress={handleOneTimePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );

  if (isCartLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (cartError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Cart Error</Text>
        <Text style={styles.errorText}>{cartError.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cart' && styles.activeTab]}
          onPress={() => setActiveTab('cart')}
        >
          <Ionicons 
            name="cart" 
            size={20} 
            color={activeTab === 'cart' ? '#667eea' : '#94a3b8'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'cart' && styles.activeTabText
          ]}>
            Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
          onPress={() => setActiveTab('summary')}
          disabled={isEmpty}
        >
          <Ionicons 
            name="receipt" 
            size={20} 
            color={activeTab === 'summary' ? '#667eea' : '#94a3b8'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'summary' && styles.activeTabText,
            isEmpty && styles.disabledTabText
          ]}>
            Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'cart' ? renderCartTab() : renderSummaryTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#94a3b8',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#667eea',
  },
  disabledTabText: {
    opacity: 0.5,
  },
  scrollContent: {
    flex: 1,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  clearCartButton: {
    padding: 8,
  },
  clearCartText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  merchantGroup: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  merchantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  merchantItemCount: {
    fontSize: 12,
    color: '#64748b',
  },
  merchantSummary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  merchantSubtotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'right',
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemImageContainer: {
    marginRight: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 12,
    color: '#667eea',
    marginBottom: 4,
  },
  itemCondition: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  priceQuantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'white',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  summaryContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 12,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  checkoutButtons: {
    marginTop: 24,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  expressButton: {
    backgroundColor: '#f59e0b',
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  checkoutSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cartSummaryQuick: {
    marginBottom: 12,
  },
  quickSummaryText: {
    fontSize: 14,
    color: '#64748b',
  },
});

export default ShoppingCartScreen;
