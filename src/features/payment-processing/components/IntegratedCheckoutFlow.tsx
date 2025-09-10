import React, { useMemo, useState, useRef } from 'react';
import { View, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Text, Button, List, RadioButton, Modal, Portal, Divider } from 'react-native-paper';
import { useShoppingCartContext } from '../../../providers/ShoppingCartProvider';
import { usePayment } from '../hooks/usePayment';
import { useReferralSystemContext } from '../../../providers/ReferralSystemProvider';
import { useAuth } from '../../user-auth/context/AuthContext';
import { appTheme } from '../../theme';
import { useEventEmitter, EVENT_TYPES } from '../../../events';

const IntegratedCheckoutFlow: React.FC = () => {
  const { cart, cartSummary, isEmpty, clearCart } = useShoppingCartContext();
  const payment = usePayment();
  const { applyReferralCode } = useReferralSystemContext();
  const { user } = useAuth();
  const emitEvent = useEventEmitter();

  const [selectedFlow, setSelectedFlow] = useState<'express' | 'one-time' | 'selective'>('express');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [paymentMethodsModalVisible, setPaymentMethodsModalVisible] = useState(false);
  const inProgressRef = useRef(false);

  const merchantGroups = useMemo(() => {
    return (cart?.items || []).reduce((groups: any, item: any) => {
      const merchantId = item.product_snapshot?.seller_id || 'unknown';
      const merchantName = item.product_snapshot?.merchant_name || 'Unknown Seller';
      if (!groups[merchantId]) groups[merchantId] = { merchantId, merchantName, items: [], total: 0 };
      groups[merchantId].items.push({ ...item, productId: item.product_id, productName: item.product_snapshot?.title });
      groups[merchantId].total += (item.unit_price || 0) * (item.quantity || 0);
      return groups;
    }, {} as any);
  }, [cart]);

  const finalTotal = useMemo(() => {
    // referral handling omitted here for simplicity (can be added)
    return cartSummary?.total || 0;
  }, [cartSummary]);

  const defaultMethod = payment.defaultPaymentMethod;

  const openPaymentMethods = () => {
    setPaymentMethodsModalVisible(true);
  };

  const closePaymentMethods = () => {
    setPaymentMethodsModalVisible(false);
  };

  const runPayment = async (flow: 'express' | 'one-time' | 'selective', paymentMethodId?: string) => {
    if (inProgressRef.current) return;
    inProgressRef.current = true;
    setProcessing(true);

    try {
      const results: any[] = [];
      for (const group of Object.values(merchantGroups)) {
        const amountCents = Math.round(group.total * 100);
        let res;
        if (flow === 'express') {
          res = await payment.expressCheckout(amountCents, `Order for ${group.merchantName}`);
        } else if (flow === 'one-time') {
          res = await payment.oneTimeCheckout(amountCents, `Order for ${group.merchantName}`);
        } else {
          if (!paymentMethodId) throw new Error('No payment method selected');
          res = await payment.selectiveCheckout(amountCents, paymentMethodId, `Order for ${group.merchantName}`);
        }

        results.push(res);

        if (res.success) {
          // emit event for success per group
          await emitEvent(EVENT_TYPES.PAYMENT_SUCCESS, { transactionId: res.paymentIntentId || res.transactionId || '', amount: res.amount || group.total, currency: 'usd', merchantId: group.merchantId, customerId: user?.id || '', timestamp: new Date() });
        }
      }

      const allSuccess = results.every(r => r.success);
      if (allSuccess) {
        setSuccessData(results);
        await clearCart();
        await payment.fetchTransactions();
      } else {
        const firstError = results.find(r => !r.success)?.error || 'Checkout failed';
        throw new Error(firstError);
      }

    } catch (err: any) {
      console.error('IntegratedCheckoutFlow payment error:', err);
      Alert.alert('Payment Error', err?.message || String(err));
    } finally {
      inProgressRef.current = false;
      setProcessing(false);
    }
  };

  if (isEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Your cart is empty. Add items to checkout.</Text>
      </View>
    );
  }

  if (successData) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Payment Successful</Text>
        <Text style={styles.successSub}>Your order has been placed. Thank you!</Text>
        <Button mode="contained" onPress={() => setSuccessData(null)} style={styles.continueButton}>Continue Shopping</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Review Order</Text>

      <Card style={styles.card}>
        <Card.Content>
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

              <Divider style={{ marginVertical: 8 }} />
            </View>
          ))}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>${finalTotal.toFixed(2)}</Text>
          </View>
        </Card.Content>
      </Card>

      <Text style={styles.sectionTitle}>Payment Options</Text>

      <RadioButton.Group onValueChange={(value) => setSelectedFlow(value as any)} value={selectedFlow}>
        {defaultMethod && (
          <RadioButton.Item label={`Express — ${defaultMethod.brand} •••• ${defaultMethod.last4}`} value="express" />
        )}
        <RadioButton.Item label="One-time card (enter new card)" value="one-time" />
        <RadioButton.Item label="Use a saved card" value="selective" />
      </RadioButton.Group>

      {selectedFlow === 'selective' && (
        <Card style={styles.cardSmall}>
          <Card.Content>
            <Text style={{ marginBottom: 8 }}>Select a saved card</Text>
            {payment.paymentMethods.length === 0 ? (
              <Text>No saved cards. Add a payment method first.</Text>
            ) : (
              payment.paymentMethods.map((pm) => (
                <List.Item
                  key={pm.id}
                  title={`•••• •••• •••• ${pm.last4}`}
                  description={`${pm.brand?.toUpperCase()} • Expires ${pm.exp_month}/${pm.exp_year}`}
                  onPress={() => setSelectedPaymentMethod(pm.stripe_payment_method_id)}
                  right={() => selectedPaymentMethod === pm.stripe_payment_method_id ? <Text>Selected</Text> : null}
                />
              ))
            )}
            <Button mode="outlined" onPress={openPaymentMethods} style={{ marginTop: 8 }}>Manage Payment Methods</Button>
          </Card.Content>
        </Card>
      )}

      <View style={{ height: 16 }} />

      <Button
        mode="contained"
        onPress={() => {
          if (selectedFlow === 'express' && !defaultMethod) {
            Alert.alert('No default payment method', 'Please add a payment method first or choose another option.');
            return;
          }
          if (selectedFlow === 'selective' && !selectedPaymentMethod) {
            Alert.alert('Select a card', 'Please pick a saved card to proceed.');
            return;
          }

          runPayment(selectedFlow, selectedPaymentMethod || undefined);
        }}
        loading={processing}
        disabled={processing}
        style={styles.payButton}
      >
        {processing ? 'Processing...' : `Pay $${finalTotal.toFixed(2)}`}
      </Button>

      <Portal>
        <Modal visible={paymentMethodsModalVisible} onDismiss={closePaymentMethods} contentContainerStyle={styles.modalContainer}>
          <Card>
            <Card.Content>
              <Text style={{ marginBottom: 8, fontWeight: '700' }}>Manage Payment Methods</Text>
              {payment.paymentMethods.length === 0 ? (
                <Text>No payment methods</Text>
              ) : (
                payment.paymentMethods.map(pm => (
                  <List.Item
                    key={pm.id}
                    title={`•••• •••• •••• ${pm.last4}`}
                    description={`${pm.brand?.toUpperCase()} • Expires ${pm.exp_month}/${pm.exp_year}`}
                    right={() => pm.is_default ? <Text>Default</Text> : null}
                  />
                ))
              )}
              <Button onPress={async () => { closePaymentMethods(); await payment.addPaymentMethodWithSetup(); await payment.fetchPaymentMethods(); }} style={{ marginTop: 12 }}>Add Payment Method</Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.colors.background },
  title: { fontSize: 22, fontWeight: '800', color: appTheme.colors.textPrimary, marginBottom: 12 },
  card: { backgroundColor: appTheme.colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  cardSmall: { backgroundColor: appTheme.colors.surface, borderRadius: 8, padding: 8, marginBottom: 12 },
  merchantBlock: { marginBottom: 12 },
  merchantTitle: { fontSize: 16, fontWeight: '800', color: appTheme.colors.primary, marginBottom: 8 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: appTheme.colors.surfaceElevated },
  itemTitle: { fontSize: 16, fontWeight: '700', color: appTheme.colors.textPrimary },
  itemMeta: { fontSize: 12, color: appTheme.colors.textSecondary, marginTop: 4 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: appTheme.colors.textPrimary },
  groupSummary: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  groupSubtotal: { fontSize: 14, color: appTheme.colors.textSecondary },
  groupSubtotalValue: { fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, marginTop: 8 },
  summaryLabel: { color: appTheme.colors.textSecondary, fontWeight: '700' },
  summaryValue: { fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: appTheme.colors.textPrimary },
  payButton: { marginTop: 12, paddingVertical: 12, backgroundColor: appTheme.colors.primary },
  modalContainer: { margin: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: appTheme.colors.textSecondary },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  successEmoji: { fontSize: 48, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  successSub: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  continueButton: { paddingHorizontal: 16 },
});

export default IntegratedCheckoutFlow;
