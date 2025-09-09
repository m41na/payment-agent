import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, RadioButton, ActivityIndicator, Text as PaperText } from 'react-native-paper';
import { useCheckout } from '../hooks/useCheckout';
import { PaymentOption } from '../types';
import PrimaryButton from '../../shared/PrimaryButton';
import BrandLogo from '../../shared/BrandLogo';
import { appTheme } from '../../theme';

interface CheckoutScreenProps {
  onCheckoutComplete: (orderId: string) => void;
  onCancel: () => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ onCheckoutComplete, onCancel }) => {
  const {
    currentOrder,
    selectedPaymentOption,
    checkoutSummary,
    paymentOptions,
    loading,
    error,
    createOrder,
    processPayment,
    setSelectedPaymentOption,
    resetCheckout,
    clearError,
  } = useCheckout();

  const [processingPayment, setProcessingPayment] = useState(false);

  // If available, expose a quick express option (one-click using default saved card)
  const expressOption = paymentOptions?.find((o: any) => o?.id === 'express');

  useEffect(() => {
    if (!currentOrder) createOrder();
  }, [currentOrder, createOrder]);

  useEffect(() => {
    if (paymentOptions?.length > 0 && !selectedPaymentOption) {
      const defaultOption = paymentOptions.find((o) => (o as any).isDefault) || paymentOptions[0];
      setSelectedPaymentOption(defaultOption as PaymentOption);
    }
  }, [paymentOptions, selectedPaymentOption, setSelectedPaymentOption]);

  const handleProcessPayment = async () => {
    if (!selectedPaymentOption) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setProcessingPayment(true);
      const success = await processPayment();
      if (success && currentOrder) {
        Alert.alert('Payment Successful!', `Your order #${currentOrder.id} has been placed successfully.`, [
          { text: 'OK', onPress: () => onCheckoutComplete(currentOrder.id) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Payment Failed', err?.message || 'Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancel = () => {
    resetCheckout();
    onCancel();
  };

  if (loading && !currentOrder) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <Text style={styles.loadingText}>Preparing your order...</Text>
      </View>
    );
  }

  if (!currentOrder || !checkoutSummary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load order details</Text>
        <PrimaryButton onPress={handleCancel}>Go Back</PrimaryButton>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.headerRow}>
        <BrandLogo size={48} />
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      {expressOption && checkoutSummary && (
        <PrimaryButton
          onPress={async () => {
            try {
              setProcessingPayment(true);
              setSelectedPaymentOption?.(expressOption as PaymentOption);
              const success = await processPayment();
              if (success && currentOrder) {
                Alert.alert('Payment Successful!', `Your order #${currentOrder.id} has been placed successfully.`, [
                  { text: 'OK', onPress: () => onCheckoutComplete(currentOrder.id) },
                ]);
              }
            } catch (err: any) {
              Alert.alert('Payment Failed', err?.message || 'Payment processing failed');
            } finally {
              setProcessingPayment(false);
            }
          }}
          style={[styles.expressQuickButton, { marginHorizontal: 16, marginBottom: 12 }]}
          disabled={processingPayment}
        >
          {processingPayment ? 'Processing...' : `Express Checkout — Pay $${checkoutSummary.total.toFixed(2)}`}
        </PrimaryButton>
      )}

      <Card style={styles.summaryCard}>
        <Card.Title title="Order Summary" />
        <Card.Content>
          <View style={styles.summaryRow}>
            <Text>Items ({checkoutSummary.itemCount})</Text>
            <Text>${checkoutSummary.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Tax</Text>
            <Text>${checkoutSummary.tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Shipping</Text>
            <Text>${checkoutSummary.shipping.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalText}>${checkoutSummary.total.toFixed(2)}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.itemsCard}>
        <Card.Title title={`Items from ${checkoutSummary.merchantCount} seller${checkoutSummary.merchantCount > 1 ? 's' : ''}`} />
        <Card.Content>
          {currentOrder.items?.map((item: any) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.itemTitle}>{item.product_snapshot.title}</Text>
              <Text style={styles.itemDetails}>Qty: {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)}</Text>
              <Text style={styles.itemSeller}>Sold by {item.product_snapshot.merchant_name}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={styles.paymentCard}>
        <Card.Title title="Payment Method" />
        <Card.Content>
          <RadioButton.Group
            onValueChange={(value) => {
              const option = paymentOptions.find((opt: any) => opt.id === value);
              if (option) setSelectedPaymentOption(option as PaymentOption);
            }}
            value={selectedPaymentOption?.id || ''}
          >
            {paymentOptions.map((option: any) => (
              <View key={option.id} style={styles.paymentOptionRow}>
                <RadioButton.Item label={option.label} value={option.id} status={selectedPaymentOption?.id === option.id ? 'checked' : 'unchecked'} />
                <Text style={styles.paymentDescription}>{option.description}</Text>
              </View>
            ))}
          </RadioButton.Group>
        </Card.Content>
      </Card>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{typeof error === 'string' ? error : (error?.message || 'An error occurred')}</Text>
            <PrimaryButton onPress={clearError} style={styles.clearErrorButton}>Dismiss</PrimaryButton>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actionButtons}>
        <PrimaryButton onPress={handleCancel} style={styles.cancelButton} mode="outlined">Cancel</PrimaryButton>
        <PrimaryButton onPress={handleProcessPayment} style={styles.payButton} disabled={!selectedPaymentOption || processingPayment}>
          {processingPayment ? 'Processing...' : `Pay $${checkoutSummary.total.toFixed(2)}`}
        </PrimaryButton>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.colors.background, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: appTheme.colors.textPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: appTheme.colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  errorText: { color: appTheme.colors.danger, marginBottom: 12 },
  summaryCard: { marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRow: { borderTopWidth: 1, borderTopColor: appTheme.colors.border, marginTop: 8, paddingTop: 8 },
  totalText: { fontWeight: 'bold', fontSize: 16 },
  itemsCard: { marginBottom: 16 },
  orderItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: appTheme.colors.surfaceElevated },
  itemTitle: { fontWeight: '700', fontSize: 14, color: appTheme.colors.textPrimary },
  itemDetails: { fontSize: 12, color: appTheme.colors.textSecondary, marginTop: 4 },
  itemSeller: { fontSize: 12, color: appTheme.colors.textSecondary, marginTop: 4 },
  paymentCard: { marginBottom: 16 },
  paymentOptionRow: { marginBottom: 8 },
  paymentDescription: { fontSize: 12, color: appTheme.colors.textSecondary, marginLeft: 32, marginTop: -8 },
  errorCard: { marginBottom: 16, backgroundColor: '#fff5f5' },
  clearErrorButton: { alignSelf: 'flex-start', marginTop: 8 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 32 },
  cancelButton: { flex: 1, marginRight: 8 },
  payButton: { flex: 2, marginLeft: 8 },
  expressQuickButton: { backgroundColor: appTheme.colors.warning, paddingVertical: 12 },
});

export default CheckoutScreen;
