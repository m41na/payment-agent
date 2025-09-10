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
import { useShoppingCartContext } from '../../../providers/ShoppingCartProvider';
import { CartItem, ShoppingCartScreenProps, Order } from '../types';
import PrimaryButton from '../../shared/PrimaryButton';
import BrandLogo from '../../shared/BrandLogo';
import { appTheme } from '../../theme';

const ShoppingCartScreen: React.FC<ShoppingCartScreenProps> = ({
  // view state
  activeTab,
  loading,
  checkoutLoading,

  // cart data (container may provide but hooks also available)
  cartItems: propsCartItems,
  cartTotal,
  cartItemCount,

  // orders
  orders = [],

  // actions
  onTabChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onNavigateToCheckout,
  onNavigateToOrders,
  onNavigateToProduct,
  onViewOrderDetails,

  // misc
  orderNotification = false,
}) => {
  const {
    cart,
    cartSummary,
    merchantGroups,
    isEmpty: hookIsEmpty,
    itemCount,
    isCartLoading,
    cartError,
    updateCartItem,
    removeFromCart,
    clearCart,
  } = useShoppingCartContext();

  const [isProcessing, setIsProcessing] = useState(false);

  // Use global hook values directly to ensure reactivity
  const effectiveIsEmpty = typeof hookIsEmpty === 'boolean' ? hookIsEmpty : !(cart && Array.isArray(cart.items) && cart.items.length > 0);
  const effectiveCartItems = cart && Array.isArray(cart.items) ? cart.items : (propsCartItems || []);

  const handleClearCartLocal = useCallback(async () => {
    await (onClearCart ? onClearCart() : clearCart());
  }, [onClearCart, clearCart]);

  const renderCartItem = (item: CartItem) => {
    const itemTotal = Math.round((item.unit_price * item.quantity) * 100) / 100;

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
              <Ionicons name="image" size={28} color={appTheme.colors.muted} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.itemDetails}>
          <TouchableOpacity onPress={() => onNavigateToProduct?.(item.product_id)}>
            <Text style={styles.itemTitle} numberOfLines={2}>{item.product_snapshot.title}</Text>
          </TouchableOpacity>

          <Text style={styles.merchantName}>{item.product_snapshot.merchant_name}</Text>
          <Text style={styles.itemCondition}>Condition: {item.product_snapshot.product_condition.replace('_', ' ')}</Text>

          <View style={styles.priceQuantityRow}>
            <Text style={styles.itemPrice}>${item.unit_price.toFixed(2)}</Text>

            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.quantityButton} onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}>
                <Ionicons name="remove" size={16} color={appTheme.colors.primary} />
              </TouchableOpacity>

              <Text style={styles.quantityText}>{item.quantity}</Text>

              <TouchableOpacity style={styles.quantityButton} onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}>
                <Ionicons name="add" size={16} color={appTheme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.itemActions}>
            <Text style={styles.itemTotal}>Total: ${itemTotal.toFixed(2)}</Text>

            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveItem(item.id)}>
              <Ionicons name="trash-outline" size={16} color={appTheme.colors.danger} />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderMerchantGroup = (group: any) => (
    <View key={group.seller_id} style={styles.merchantGroup}>
      <View style={styles.merchantHeader}>
        <Ionicons name="business" size={20} color={appTheme.colors.primary} />
        <Text style={styles.merchantTitle}>{group.merchant_name}</Text>
        <Text style={styles.merchantItemCount}>{group.item_count} item{group.item_count !== 1 ? 's' : ''}</Text>
      </View>

      {group.items.map(renderCartItem)}

      <View style={styles.merchantSummary}>
        <Text style={styles.merchantSubtotal}>Subtotal: ${group.subtotal.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderCartTab = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {effectiveIsEmpty ? (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={72} color={appTheme.colors.muted} />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartText}>Add items to your cart to get started.</Text>
          <PrimaryButton onPress={() => onNavigateToOrders?.()} style={{ marginTop: 16 }}>Browse products</PrimaryButton>
        </View>
      ) : (
        <>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Shopping Cart ({(cart && cart.items ? cart.items.length : (propsCartItems || []).length)} item{(cart && cart.items ? cart.items.length : (propsCartItems || []).length) !== 1 ? 's' : ''})</Text>
            <TouchableOpacity style={styles.clearCartButton} onPress={handleClearCartLocal}>
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {merchantGroups.map(renderMerchantGroup)}

          <View style={styles.checkoutSection}>
            <PrimaryButton onPress={() => { if (onNavigateToCheckout) onNavigateToCheckout(); else onCheckout?.(); }} disabled={isProcessing} fullWidth>
              Proceed to Checkout
            </PrimaryButton>
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderOrderHistoryTab = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={{ padding: 16 }}>
        {orders.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartTitle}>No orders yet</Text>
            <Text style={styles.emptyCartText}>Your recent purchases will appear here.</Text>
          </View>
        ) : (
          orders.map((order: Order) => (
            <View key={order.id} style={[styles.card, { marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontWeight: '700' }}>Order #{order.order_number}</Text>
                <Text style={{ color: appTheme.colors.textSecondary }}>{new Date(order.created_at).toLocaleDateString()}</Text>
              </View>

              <Text style={{ marginBottom: 8 }}>{order.items.length} item{order.items.length !== 1 ? 's' : ''} • ${order.total_amount.toFixed(2)}</Text>
              <Text style={{ marginBottom: 8, color: appTheme.colors.muted }}>Status: {order.status}</Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <PrimaryButton onPress={() => onViewOrderDetails?.(order.id)} style={{ paddingHorizontal: 12 }}>View</PrimaryButton>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  if (isCartLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading cart...</Text>
      </View>
    );
  }

  if (cartError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={appTheme.colors.danger} />
        <Text style={styles.errorTitle}>Cart Error</Text>
        <Text style={styles.errorText}>{cartError.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <BrandLogo size={48} />
        <Text style={styles.headerTitle}>My Cart</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'cart' && styles.activeTab]} onPress={() => onTabChange?.('cart')}>
          <Ionicons name="cart" size={20} color={activeTab === 'cart' ? appTheme.colors.primary : appTheme.colors.muted} />
          <Text style={[styles.tabText, activeTab === 'cart' && styles.activeTabText]}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => { if (!effectiveIsEmpty) onTabChange?.('orders'); }}
          disabled={effectiveIsEmpty}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="receipt" size={20} color={activeTab === 'orders' ? appTheme.colors.primary : appTheme.colors.muted} />
            {orderNotification && (
              <View style={styles.notificationDot} />
            )}
          </View>

          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText, effectiveIsEmpty && styles.disabledTabText]}>Order History</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'cart' ? renderCartTab() : renderOrderHistoryTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appTheme.colors.background },
  loadingText: { marginTop: 16, fontSize: 16, color: appTheme.colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appTheme.colors.background, padding: 32 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: appTheme.colors.danger, marginTop: 16, marginBottom: 8 },
  errorText: { fontSize: 14, color: appTheme.colors.textSecondary, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: appTheme.colors.textPrimary, marginLeft: 8 },
  tabContainer: { flexDirection: 'row', backgroundColor: appTheme.colors.surface, borderBottomWidth: 1, borderBottomColor: appTheme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: appTheme.colors.primary },
  tabText: { fontSize: 16, fontWeight: '500', color: appTheme.colors.muted, marginLeft: 8 },
  activeTabText: { color: appTheme.colors.primary },
  disabledTabText: { opacity: 0.5 },
  notificationDot: { position: 'absolute', top: -6, right: -6, width: 10, height: 10, borderRadius: 6, backgroundColor: appTheme.colors.danger, borderWidth: 1, borderColor: appTheme.colors.surface },
  scrollContent: { flex: 1 },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyCartTitle: { fontSize: 20, fontWeight: '600', color: appTheme.colors.textPrimary, marginTop: 16, marginBottom: 8 },
  emptyCartText: { fontSize: 14, color: appTheme.colors.textSecondary, textAlign: 'center' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: appTheme.colors.surface, borderBottomWidth: 1, borderBottomColor: appTheme.colors.border },
  cartTitle: { fontSize: 18, fontWeight: '600', color: appTheme.colors.textPrimary },
  clearCartButton: { padding: 8 },
  clearCartText: { fontSize: 14, color: appTheme.colors.danger, fontWeight: '500' },
  merchantGroup: { backgroundColor: appTheme.colors.surface, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  merchantHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: appTheme.colors.surface, borderBottomWidth: 1, borderBottomColor: appTheme.colors.border },
  merchantTitle: { fontSize: 16, fontWeight: '600', color: appTheme.colors.textPrimary, marginLeft: 8, flex: 1 },
  merchantItemCount: { fontSize: 12, color: appTheme.colors.textSecondary },
  merchantSummary: { padding: 16, borderTopWidth: 1, borderTopColor: appTheme.colors.border, backgroundColor: appTheme.colors.surface },
  merchantSubtotal: { fontSize: 14, fontWeight: '500', color: appTheme.colors.textPrimary, textAlign: 'right' },
  cartItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: appTheme.colors.surfaceElevated },
  itemImageContainer: { marginRight: 12 },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  placeholderImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: appTheme.colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  itemDetails: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: appTheme.colors.textPrimary, marginBottom: 4 },
  merchantName: { fontSize: 12, color: appTheme.colors.primary, marginBottom: 4 },
  itemCondition: { fontSize: 12, color: appTheme.colors.textSecondary, marginBottom: 8, textTransform: 'capitalize' },
  priceQuantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemPrice: { fontSize: 16, fontWeight: '600', color: appTheme.colors.textPrimary },
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: appTheme.colors.surfaceElevated, borderRadius: 8, padding: 4 },
  quantityButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 6, backgroundColor: appTheme.colors.surface },
  quantityText: { fontSize: 14, fontWeight: '600', color: appTheme.colors.textPrimary, marginHorizontal: 12, minWidth: 20, textAlign: 'center' },
  itemActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTotal: { fontSize: 14, fontWeight: '600', color: appTheme.colors.success },
  removeButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  removeButtonText: { fontSize: 12, color: appTheme.colors.danger, marginLeft: 4 },
  summaryContainer: { backgroundColor: appTheme.colors.surface, margin: 16, borderRadius: 12, padding: 20 },
  summaryTitle: { fontSize: 20, fontWeight: '700', color: appTheme.colors.textPrimary, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontSize: 14, color: appTheme.colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '500', color: appTheme.colors.textPrimary },
  totalRow: { borderTopWidth: 1, borderTopColor: appTheme.colors.border, marginTop: 12, paddingTop: 16 },
  totalLabel: { fontSize: 18, fontWeight: '700', color: appTheme.colors.textPrimary },
  totalValue: { fontSize: 18, fontWeight: '700', color: appTheme.colors.success },
  checkoutButtons: { marginTop: 24 },
  expressButton: { backgroundColor: appTheme.colors.warning },
  primaryButton: { backgroundColor: appTheme.colors.primary },
  checkoutSection: { backgroundColor: appTheme.colors.surface, padding: 16, borderRadius: 12, marginBottom: 16, marginHorizontal: 16 },
  cartSummaryQuick: { marginBottom: 12 },
  quickSummaryText: { fontSize: 14, color: appTheme.colors.textSecondary },
  card: { backgroundColor: appTheme.colors.surface, padding: 12, borderRadius: 10, elevation: 2 },
});

export default ShoppingCartScreen;
