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
import PrimaryButton from '../../shared/PrimaryButton';
import BrandLogo from '../../shared/BrandLogo';
import { appTheme } from '../../theme';

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
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }
    await updateCartItem(itemId, { quantity });
  }, [updateCartItem, removeFromCart]);

  const handleRemoveItem = useCallback(async (itemId: string) => {
    await removeFromCart(itemId);
  }, [removeFromCart]);

  const handleClearCart = useCallback(async () => {
    await clearCart();
  }, [clearCart]);

  const handleOneTimePayment = useCallback(() => {
    if (!onNavigateToCheckout || isEmpty) return;
    onNavigateToCheckout();
  }, [onNavigateToCheckout, isEmpty]);

  const handleExpressCheckout = useCallback(() => {
    if (!onNavigateToCheckout || isEmpty) return;
    onNavigateToCheckout();
  }, [onNavigateToCheckout, isEmpty]);

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
      {isEmpty ? (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={72} color={appTheme.colors.muted} />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartText}>Add items to your cart to get started.</Text>
          <PrimaryButton onPress={() => onNavigateToOrders?.()} style={{ marginTop: 16 }}>Browse products</PrimaryButton>
        </View>
      ) : (
        <>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Shopping Cart ({itemCount} item{itemCount !== 1 ? 's' : ''})</Text>
            <TouchableOpacity style={styles.clearCartButton} onPress={handleClearCart}>
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          {merchantGroups.map(renderMerchantGroup)}

          <View style={styles.checkoutSection}>
            <View style={styles.cartSummaryQuick}>
              <Text style={styles.quickSummaryText}>{itemCount} item{itemCount !== 1 ? 's' : ''} • ${cartSummary?.subtotal.toFixed(2)}</Text>
            </View>

            <PrimaryButton onPress={handleOneTimePayment} disabled={isProcessing} fullWidth>
              Proceed to Checkout
            </PrimaryButton>

            <PrimaryButton onPress={handleExpressCheckout} style={{ marginTop: 8 }} fullWidth>
              Express Checkout
            </PrimaryButton>
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
            <Text style={styles.summaryLabel}>Shipping ({cartSummary.unique_merchants} merchant{cartSummary.unique_merchants !== 1 ? 's' : ''})</Text>
            <Text style={styles.summaryValue}>${cartSummary.estimated_shipping.toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${cartSummary.estimated_total.toFixed(2)}</Text>
          </View>

          <View style={styles.checkoutButtons}>
            <PrimaryButton onPress={handleExpressCheckout} style={styles.expressButton} fullWidth>
              Express Checkout
            </PrimaryButton>

            <PrimaryButton onPress={handleOneTimePayment} style={[styles.primaryButton, { marginTop: 12 }]} fullWidth>
              Proceed to Checkout
            </PrimaryButton>
          </View>
        </View>
      )}
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
        <TouchableOpacity style={[styles.tab, activeTab === 'cart' && styles.activeTab]} onPress={() => setActiveTab('cart')}>
          <Ionicons name="cart" size={20} color={activeTab === 'cart' ? appTheme.colors.primary : appTheme.colors.muted} />
          <Text style={[styles.tabText, activeTab === 'cart' && styles.activeTabText]}>Cart</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'summary' && styles.activeTab]} onPress={() => setActiveTab('summary')} disabled={isEmpty}>
          <Ionicons name="receipt" size={20} color={activeTab === 'summary' ? appTheme.colors.primary : appTheme.colors.muted} />
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText, isEmpty && styles.disabledTabText]}>Summary</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'cart' ? renderCartTab() : renderSummaryTab()}
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
});

export default ShoppingCartScreen;
