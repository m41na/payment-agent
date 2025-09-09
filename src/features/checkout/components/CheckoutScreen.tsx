import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Button, Card, RadioButton, ActivityIndicator } from 'react-native-paper';
import { useCheckout } from '../hooks/useCheckout';
import { PaymentOption } from '../types';

interface CheckoutScreenProps {
  onCheckoutComplete: (orderId: string) => void;
  onCancel: () => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  onCheckoutComplete,
  onCancel
}) => {
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
    clearError
  } = useCheckout();

  console.log('CheckoutScreen render:');
  console.log('currentOrder:', currentOrder);
  console.log('checkoutSummary:', checkoutSummary);
  console.log('loading:', loading);
  console.log('error:', error);

  const [processingPayment, setProcessingPayment] = useState(false);

  // Create order from cart when component mounts
  useEffect(() => {
    if (!currentOrder) {
      createOrder();
    }
  }, [currentOrder, createOrder]);

  // Auto-select default payment option
  useEffect(() => {
    if (paymentOptions.length > 0 && !selectedPaymentOption) {
      const defaultOption = paymentOptions.find(option => option.isDefault) || paymentOptions[0];
      setSelectedPaymentOption(defaultOption);
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
        Alert.alert(
          'Payment Successful!',
          `Your order #${currentOrder.id} has been placed successfully.`,
          [{ text: 'OK', onPress: () => onCheckoutComplete(currentOrder.id) }]
        );
      }
    } catch (err) {
      Alert.alert('Payment Failed', err instanceof Error ? err.message : 'Payment processing failed');
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
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Preparing your order...</Text>
      </View>
    );
  }

  if (!currentOrder || !checkoutSummary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load order details</Text>
        <Button mode="outlined" onPress={handleCancel}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Order Summary */}
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

      {/* Order Items */}
      <Card style={styles.itemsCard}>
        <Card.Title title={`Items from ${checkoutSummary.merchantCount} seller${checkoutSummary.merchantCount > 1 ? 's' : ''}`} />
        <Card.Content>
          {currentOrder.items?.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Text style={styles.itemTitle}>{item.product_snapshot.title}</Text>
              <Text style={styles.itemDetails}>
                Qty: {item.quantity} × ${item.unit_price.toFixed(2)} = ${item.total_price.toFixed(2)}
              </Text>
              <Text style={styles.itemSeller}>Sold by {item.product_snapshot.merchant_name}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Payment Options */}
      <Card style={styles.paymentCard}>
        <Card.Title title="Payment Method" />
        <Card.Content>
          <RadioButton.Group
            onValueChange={(value) => {
              const option = paymentOptions.find(opt => opt.id === value);
              if (option) setSelectedPaymentOption(option);
            }}
            value={selectedPaymentOption?.id || ''}
          >
            {paymentOptions.map((option) => (
              <View key={option.id} style={styles.paymentOption}>
                <RadioButton.Item
                  label={option.label}
                  value={option.id}
                  status={selectedPaymentOption?.id === option.id ? 'checked' : 'unchecked'}
                />
                <Text style={styles.paymentDescription}>{option.description}</Text>
              </View>
            ))}
          </RadioButton.Group>
        </Card.Content>
      </Card>

      {/* Error Display */}
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={clearError} style={styles.clearErrorButton}>
              Dismiss
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handleCancel}
          style={styles.cancelButton}
          disabled={processingPayment}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleProcessPayment}
          style={styles.payButton}
          loading={processingPayment}
          disabled={!selectedPaymentOption || processingPayment}
        >
          {processingPayment ? 'Processing...' : `Pay $${checkoutSummary.total.toFixed(2)}`}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 8,
  },
  totalText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemsCard: {
    marginBottom: 16,
  },
  orderItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemSeller: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  paymentCard: {
    marginBottom: 16,
  },
  paymentOption: {
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 32,
    marginTop: -8,
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  clearErrorButton: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  payButton: {
    flex: 2,
    marginLeft: 8,
  },
});
