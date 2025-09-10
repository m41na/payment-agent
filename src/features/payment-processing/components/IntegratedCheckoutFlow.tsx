import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEventListener, useEventEmitter, EVENT_TYPES } from '../../../events';
import { useShoppingCartContext } from '../../../providers/ShoppingCartProvider';
import { usePaymentProcessingContext } from '../../../providers/PaymentProcessingProvider';
import { useReferralSystemContext } from '../../../providers/ReferralSystemProvider';
import { useAuth } from '../../user-auth/context/AuthContext';
import { appTheme } from '../../theme';
import PaymentMethodsScreen from './PaymentMethodsScreen';
import { usePayment } from '../hooks/usePayment';

const Stack = createStackNavigator();

export const IntegratedCheckoutFlow: React.FC = () => {
  const { user } = useAuth();
  const { cart, cartSummary, isEmpty, clearCart } = useShoppingCartContext();
  const { processPayment, isProcessing } = usePaymentProcessingContext();
  const { applyReferralCode } = useReferralSystemContext();
  const emitEvent = useEventEmitter();

  // Local shared state for the nested screens
  const [referralCode, setReferralCode] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<any | null>(null);
  const [paymentMode, setPaymentMode] = useState<'one-time' | 'saved' | null>(null);
  const [processingResult, setProcessingResult] = useState<any>(null);

  // Payment hook
  const payment = usePayment();
  const paymentMethods = payment.paymentMethods || [];
  const paymentLoading = payment.loading;
  const defaultMethod = payment.defaultPaymentMethod;

  // Merchant grouping
  const merchantGroups = (cart?.items || []).reduce((groups, item: any) => {
    const merchantId = item.product_snapshot?.seller_id || 'unknown';
    const merchantName = item.product_snapshot?.merchant_name || 'Unknown Seller';
    if (!groups[merchantId]) groups[merchantId] = { merchantId, merchantName, items: [], total: 0 };
    groups[merchantId].items.push({ ...item, productId: item.product_id, productName: item.product_snapshot?.title });
    groups[merchantId].total += (item.unit_price || 0) * (item.quantity || 0);
    return groups;
  }, {} as any);

  const finalTotal = appliedReferral && cartSummary ? cartSummary.total - appliedReferral.discountAmount : cartSummary?.total || 0;

  // Shared handlers
  const handleApplyReferralCode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const discount = await applyReferralCode(code, cartSummary.total);
      setAppliedReferral(discount);
      await emitEvent(EVENT_TYPES.REFERRAL_USED, { referrerId: discount.referrerId, refereeId: user?.id || '', referralCode: code, rewardAmount: discount.discountAmount, timestamp: new Date() });
      Alert.alert('Success', `Referral code applied! You saved $${discount.discountAmount.toFixed(2)}`);
    } catch (err) {
      Alert.alert('Error', 'Invalid referral code or code has expired');
    }
  };

  const handleProcessPayment = async (flow: 'express' | 'one-time' | 'selective', paymentMethodId?: string) => {
    try {
      const results: any[] = [];
      for (const group of Object.values(merchantGroups)) {
        const amountCents = Math.round(group.total * 100);
        let res;
        if (flow === 'express') res = await payment.expressCheckout(amountCents, `Order for ${group.merchantName}`);
        else if (flow === 'one-time') res = await payment.oneTimeCheckout(amountCents, `Order for ${group.merchantName}`);
        else {
          if (!paymentMethodId) throw new Error('Payment method required');
          res = await payment.selectiveCheckout(amountCents, paymentMethodId, `Order for ${group.merchantName}`);
        }
        results.push(res);
        if (res.success) await emitEvent(EVENT_TYPES.PAYMENT_SUCCESS, { transactionId: res.paymentIntentId || res.transactionId || '', amount: res.amount || group.total, currency: 'usd', merchantId: group.merchantId, customerId: user?.id || '', timestamp: new Date() });
      }
      setProcessingResult(results);
      await clearCart();
      return { success: true, results };
    } catch (err: any) {
      console.error('Payment error:', err);
      return { success: false, error: err };
    }
  };

  // Nested screens capture the shared state via closure
  const ReviewScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>Review your order</Text>

        <View style={styles.card}>
          {Object.values(merchantGroups).map((group: any) => (
            <View key={group.merchantId} style={styles.merchantBlock}>
              <Text style={styles.merchantTitle}>{group.merchantName}</Text>
              {group.items.map((item: any) => (
                <View key={item.id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.product_snapshot?.title || item.productName}</Text>
                    <Text style={styles.itemMeta}>Qty {item.quantity} • ${(item.unit_price || 0).toFixed(2)}</Text>
                  </View>
                  <Text style={styles.itemTotal}>${((item.unit_price || 0) * (item.quantity || 0)).toFixed(2)}</Text>
                </View>
              ))}

              <View style={styles.groupSummary}>
                <Text style={styles.groupSubtotal}>Subtotal</Text>
                <Text style={styles.groupSubtotalValue}>${group.total.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>${appliedReferral ? appliedReferral.discountAmount.toFixed(2) : '0.00'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${(cartSummary?.tax || 0).toFixed(2)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
            <Text style={[styles.summaryValue, styles.totalValue]}>${finalTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />

        <Text style={styles.sectionTitle}>Payment Options</Text>
        <View style={styles.paymentOptionsRow}>
          {defaultMethod && (
            <TouchableOpacity style={styles.paymentOption} onPress={async () => { const res = await handleProcessPayment('express'); if (res.success) navigation.navigate('Success'); else Alert.alert('Payment Failed'); }}>
              <Text style={styles.paymentOptionTitle}>Express Checkout</Text>
              <Text style={styles.paymentOptionSub}>Pay with {defaultMethod.brand} •••• {defaultMethod.last4}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.paymentOption} onPress={() => { setPaymentMode('one-time'); navigation.navigate('Payment'); }}>
            <Text style={styles.paymentOptionTitle}>Pay with New Card</Text>
            <Text style={styles.paymentOptionSub}>Enter card details (one-time)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.paymentOption} onPress={() => { setPaymentMode('saved'); navigation.navigate('Payment'); }}>
            <Text style={styles.paymentOptionTitle}>Use Saved Card</Text>
            <Text style={styles.paymentOptionSub}>Choose from your saved cards</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />

        <TouchableOpacity onPress={() => navigation.navigate('Payment')} style={[styles.primaryButton, { backgroundColor: appTheme.colors.primary }]}>
          <Text style={{ color: appTheme.colors.surface, fontWeight: '700' }}>Continue to Payment</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const AddCardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    // automatically trigger add payment sheet for new card flows
    React.useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          await payment.addPaymentMethodWithSetup();
          await payment.fetchPaymentMethods();
          if (!mounted) return;
          // After adding, process one-time checkout
          const res = await handleProcessPayment('one-time');
          if (res.success) navigation.replace('Success');
          else Alert.alert('Payment Failed');
        } catch (err: any) {
          if (err?.message && mounted) Alert.alert('Error', err.message);
        }
      })();
      return () => { mounted = false; };
    }, []);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: appTheme.colors.primary }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const PaymentScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    if (paymentMode === 'one-time') {
      return <AddCardScreen navigation={navigation} />;
    }

    return (
      <PaymentMethodsScreen
        paymentMethods={paymentMethods}
        loading={paymentLoading}
        onAddPaymentMethod={async () => {
          await payment.addPaymentMethodWithSetup();
          await payment.fetchPaymentMethods();
        }}
        onRemovePaymentMethod={async (id: string) => { await payment.removePaymentMethod(id); await payment.fetchPaymentMethods(); }}
        onSetDefaultPaymentMethod={async (id: string) => { await payment.setDefaultPaymentMethod(id); await payment.fetchPaymentMethods(); }}
        onRefreshPaymentMethods={async () => await payment.fetchPaymentMethods()}
        onSelectPaymentMethod={async (id: string) => {
          const res = await handleProcessPayment('selective', id);
          if (res.success) navigation.navigate('Success'); else Alert.alert('Payment Failed');
        }}
      />
    );
  };

  const ProcessingScreen: React.FC = () => (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={appTheme.colors.primary} />
    </View>
  );

  const SuccessScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>Payment Successful!</Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }}>Your order has been confirmed and merchants have been notified.</Text>
        {appliedReferral && (<Text style={{ fontSize: 14, color: '#28a745', textAlign: 'center', marginBottom: 20 }}>✅ Referral reward of ${appliedReferral.discountAmount.toFixed(2)} has been processed</Text>)}

        <TouchableOpacity onPress={() => {
          // navigate back to the CommerceStack root (ShoppingCart)
          const parent = navigation.getParent();
          if (parent) parent.navigate('ShoppingCart');
        }} style={{ padding: 12, backgroundColor: appTheme.colors.primary, borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isEmpty) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>Your cart is empty.{'\n'}Add some products to get started!</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: appTheme.colors.surface }, headerTintColor: appTheme.colors.textPrimary }}>
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Review Order' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment Methods' }} />
      <Stack.Screen name="Processing" component={ProcessingScreen} options={{ title: 'Processing', headerBackTitleVisible: false }} />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ title: 'Success', headerLeft: () => null }} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.colors.background },
  title: { fontSize: 22, fontWeight: '800', color: appTheme.colors.textPrimary, marginBottom: 12 },
  card: { backgroundColor: appTheme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  merchantBlock: { marginBottom: 12 },
  merchantTitle: { fontSize: 16, fontWeight: '800', color: appTheme.colors.primary, marginBottom: 8 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: appTheme.colors.surfaceElevated },
  itemTitle: { fontSize: 16, fontWeight: '700', color: appTheme.colors.textPrimary },
  itemMeta: { fontSize: 12, color: appTheme.colors.textSecondary, marginTop: 4 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: appTheme.colors.textPrimary },
  groupSummary: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  groupSubtotal: { fontSize: 14, color: appTheme.colors.textSecondary },
  groupSubtotalValue: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: appTheme.colors.surfaceElevated, marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { color: appTheme.colors.textSecondary },
  summaryValue: { fontWeight: '700' },
  totalLabel: { fontSize: 16 },
  totalValue: { fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: appTheme.colors.textPrimary },
  paymentOptionsRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  paymentOption: { flex: 1, padding: 12, backgroundColor: appTheme.colors.surfaceElevated, borderRadius: 8, marginRight: 8 },
  paymentOptionTitle: { fontWeight: '700', color: appTheme.colors.textPrimary },
  paymentOptionSub: { fontSize: 12, color: appTheme.colors.textSecondary, marginTop: 6 },
  primaryButton: { paddingVertical: 14, alignItems: 'center', borderRadius: 10 },
});

export default IntegratedCheckoutFlow;
