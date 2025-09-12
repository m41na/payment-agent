import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useSubscription, SubscriptionPlan } from '../contexts/SubscriptionContext';
import { usePayment } from '../contexts/PaymentContext';

interface MerchantPlanPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan | null;
}

type PaymentOption = 'express' | 'one_time' | 'saved';

export const MerchantPlanPurchaseModal: React.FC<MerchantPlanPurchaseModalProps> = ({
  visible,
  onClose,
  selectedPlan,
}) => {
  const { purchaseSubscription, loading } = useSubscription();
  const { paymentMethods, fetchPaymentMethods } = usePayment();
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentOption>('express');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      fetchPaymentMethods();
    }
  }, [visible]);

  const formatPrice = (amountInCents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  };

  const getBillingText = (interval: string) => {
    switch (interval) {
      case 'one_time':
        return 'One-time payment';
      case 'month':
        return 'per month';
      case 'year':
        return 'per year';
      default:
        return '';
    }
  };

  const handlePurchase = async () => {
    if (!selectedPlan) return;

    try {
      let paymentMethodId: string | undefined;

      if (selectedPaymentOption === 'saved' && selectedPaymentMethodId) {
        paymentMethodId = selectedPaymentMethodId;
      }

      const success = await purchaseSubscription(selectedPlan.id, paymentMethodId, selectedPaymentOption);

      if (success) {
        Alert.alert(
          'Purchase Successful!',
          `You now have access to merchant features with ${selectedPlan.name}. You can now create products and events!`,
          [
            { 
              text: 'Get Started', 
              onPress: () => {
                onClose();
                // Navigation to merchant features will be handled by parent component
                // when it detects the subscription status change
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Purchase Failed',
          'There was an error processing your payment. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert(
        'Purchase Failed',
        'There was an error processing your payment. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (!selectedPlan) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Purchase {selectedPlan.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Plan Summary */}
          <View style={styles.planSummary}>
            <Text style={styles.planName}>{selectedPlan.name}</Text>
            <Text style={styles.planPrice}>
              {formatPrice(selectedPlan.price_amount, selectedPlan.price_currency)}
              {selectedPlan.billing_interval !== 'one_time' && (
                <Text style={styles.billingInterval}> {getBillingText(selectedPlan.billing_interval)}</Text>
              )}
            </Text>
            <Text style={styles.planDescription}>{selectedPlan.description}</Text>
          </View>

          {/* Payment Options */}
          <View style={styles.paymentOptions}>
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>

            {/* Express Checkout */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentOption === 'express' && styles.selectedPaymentOption,
              ]}
              onPress={() => setSelectedPaymentOption('express')}
            >
              <View style={styles.paymentOptionContent}>
                <Text style={styles.paymentOptionTitle}>💳 Express Checkout</Text>
                <Text style={styles.paymentOptionDescription}>
                  Quick payment with a new card (saves for future use)
                </Text>
              </View>
            </TouchableOpacity>

            {/* One-time Payment */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentOption === 'one_time' && styles.selectedPaymentOption,
              ]}
              onPress={() => setSelectedPaymentOption('one_time')}
            >
              <View style={styles.paymentOptionContent}>
                <Text style={styles.paymentOptionTitle}>🔒 One-time Payment</Text>
                <Text style={styles.paymentOptionDescription}>
                  Pay without saving card details
                </Text>
              </View>
            </TouchableOpacity>

            {/* Saved Payment Methods */}
            {paymentMethods.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPaymentOption === 'saved' && styles.selectedPaymentOption,
                ]}
                onPress={() => setSelectedPaymentOption('saved')}
              >
                <View style={styles.paymentOptionContent}>
                  <Text style={styles.paymentOptionTitle}>⚡ Saved Payment Method</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Use a previously saved payment method
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Saved Payment Method Selection */}
            {selectedPaymentOption === 'saved' && paymentMethods.length > 0 && (
              <View style={styles.savedMethodsContainer}>
                <Text style={styles.savedMethodsTitle}>Select a saved method:</Text>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.savedMethod,
                      selectedPaymentMethodId === method.id && styles.selectedSavedMethod,
                    ]}
                    onPress={() => setSelectedPaymentMethodId(method.id)}
                  >
                    <Text style={styles.savedMethodText}>
                      {method.brand?.toUpperCase()} •••• {method.last4}
                    </Text>
                    {method.is_default && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading || (selectedPaymentOption === 'saved' && !selectedPaymentMethodId)}
          >
            <Text style={styles.purchaseButtonText}>
              {loading ? 'Processing...' : `Purchase for ${formatPrice(selectedPlan.price_amount, selectedPlan.price_currency)}`}
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.terms}>
            By purchasing, you agree to our Terms of Service and Privacy Policy.
            {selectedPlan.billing_interval !== 'one_time' && 
              ' This is a recurring subscription that can be cancelled anytime.'
            }
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  planSummary: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  billingInterval: {
    fontSize: 16,
    color: '#666',
  },
  planDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  paymentOptions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  paymentOption: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedPaymentOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  savedMethodsContainer: {
    marginTop: 16,
    marginLeft: 16,
  },
  savedMethodsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  savedMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSavedMethod: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  savedMethodText: {
    fontSize: 16,
    color: '#333',
  },
  defaultBadge: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
});
