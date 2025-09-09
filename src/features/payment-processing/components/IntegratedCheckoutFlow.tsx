import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useEventListener, useEventEmitter, EVENT_TYPES } from '../../../events';
import { useShoppingCart } from '../../shopping-cart/hooks/useShoppingCart';
import { usePaymentProcessingContext } from '../../../providers/PaymentProcessingProvider';
import { useReferralSystemContext } from '../../../providers/ReferralSystemProvider';
import { useAuth } from '../../user-auth/context/AuthContext';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  unit_price: number;
  quantity: number;
  merchantId: string;
  merchantName: string;
}

interface ReferralDiscount {
  code: string;
  discountAmount: number;
  discountPercentage: number;
}

/**
 * Integrated Checkout Flow Component
 * 
 * Orchestrates the complete checkout experience across multiple features:
 * - Shopping Cart: Item management and totals
 * - Payment Processing: Stripe payment handling
 * - Referral System: Discount application and reward processing
 * - Event System: Real-time updates and cross-feature notifications
 */
export const IntegratedCheckoutFlow: React.FC = () => {
  console.log('IntegratedCheckoutFlow rendered');
  
  const { user } = useAuth();
  const { cart, cartSummary, isEmpty, clearCart } = useShoppingCart();
  console.log('IntegratedCheckoutFlow - cart:', cart);
  console.log('IntegratedCheckoutFlow - cartSummary:', cartSummary);
  console.log('IntegratedCheckoutFlow - isEmpty:', isEmpty);
  const { processPayment, isProcessing } = usePaymentProcessingContext();
  const { applyReferralCode, processReferralReward } = useReferralSystemContext();
  const emitEvent = useEventEmitter();

  const [referralCode, setReferralCode] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<ReferralDiscount | null>(null);
  const [paymentStep, setPaymentStep] = useState<'review' | 'payment' | 'processing' | 'success'>('review');
  const [paymentResult, setPaymentResult] = useState<any>(null);

  // Listen for cart updates to recalculate totals
  useEventListener(EVENT_TYPES.CART_ITEM_ADDED, () => {
    console.log('Cart updated, recalculating checkout totals');
  });

  useEventListener(EVENT_TYPES.CART_ITEM_REMOVED, () => {
    console.log('Item removed from cart, updating checkout');
  });

  // Listen for referral updates
  useEventListener(EVENT_TYPES.REFERRAL_USED, (referralData) => {
    console.log('Referral code used in checkout:', referralData);
  });

  const finalTotal = appliedReferral && cartSummary
    ? cartSummary.total - appliedReferral.discountAmount
    : cartSummary?.total || 0;

  const merchantGroups = (cart?.items || []).reduce((groups, item) => {
    // Use product_snapshot data for merchant info since merchantId/merchantName may not exist
    const merchantId = item.product_snapshot?.seller_id || 'unknown';
    const merchantName = item.product_snapshot?.merchant_name || 'Unknown Seller';
    
    if (!groups[merchantId]) {
      groups[merchantId] = {
        merchantId: merchantId,
        merchantName: merchantName,
        items: [],
        total: 0
      };
    }
    
    groups[merchantId].items.push({
      ...item,
      productId: item.product_id,
      productName: item.product_snapshot?.title || 'Unknown Product',
      merchantId: merchantId,
      merchantName: merchantName
    });
    groups[merchantId].total += item.unit_price * item.quantity;
    
    return groups;
  }, {} as any);

  const handleApplyReferralCode = async () => {
    if (!referralCode.trim()) return;

    try {
      const discount = await applyReferralCode(referralCode, cartSummary.total);
      setAppliedReferral(discount);
      
      // Emit referral used event
      await emitEvent(EVENT_TYPES.REFERRAL_USED, {
        referrerId: discount.referrerId,
        refereeId: user?.id || '',
        referralCode: referralCode,
        rewardAmount: discount.discountAmount,
        timestamp: new Date(),
      });

      Alert.alert('Success', `Referral code applied! You saved $${discount.discountAmount.toFixed(2)}`);
    } catch (error) {
      Alert.alert('Error', 'Invalid referral code or code has expired');
      console.error('Referral code error:', error);
    }
  };

  const handleProceedToPayment = async () => {
    setPaymentStep('payment');
    
    // Emit checkout initiated event
    await emitEvent(EVENT_TYPES.CHECKOUT_INITIATED, {
      userId: user?.id || '',
      cartTotal: finalTotal,
      itemCount: (cart?.items || []).length,
      merchantIds: Object.keys(merchantGroups),
      timestamp: new Date(),
    });
  };

  const handleProcessPayment = async () => {
    setPaymentStep('processing');

    try {
      // Process payments for each merchant (Stripe Connect)
      const paymentPromises = Object.values(merchantGroups).map(async (group: any) => {
        return await processPayment({
          amount: group.total,
          currency: 'usd',
          merchantId: group.merchantId,
          customerId: user?.id || '',
          metadata: {
            referralCode: appliedReferral?.code,
            discountApplied: appliedReferral?.discountAmount || 0,
          },
        });
      });

      const paymentResults = await Promise.all(paymentPromises);
      
      // Process successful payments
      for (const result of paymentResults) {
        if (result.success) {
          // Emit payment success event
          await emitEvent(EVENT_TYPES.PAYMENT_SUCCESS, {
            transactionId: result.transactionId,
            amount: result.amount,
            currency: result.currency,
            merchantId: result.merchantId,
            customerId: user?.id || '',
            timestamp: new Date(),
          });

          // Process referral rewards if applicable
          if (appliedReferral) {
            await processReferralReward({
              referralCode: appliedReferral.code,
              transactionId: result.transactionId,
              rewardAmount: appliedReferral.discountAmount,
            });

            await emitEvent(EVENT_TYPES.REFERRAL_REWARD_EARNED, {
              userId: user?.id || '',
              referralCode: appliedReferral.code,
              rewardAmount: appliedReferral.discountAmount,
              rewardType: 'discount' as const,
              timestamp: new Date(),
            });
          }

          // Emit product purchased events for each item
          for (const item of (cart?.items || []).filter(i => i.merchantId === result.merchantId)) {
            await emitEvent(EVENT_TYPES.PRODUCT_PURCHASED, {
              userId: user?.id || '',
              productId: item.productId,
              merchantId: item.merchantId,
              quantity: item.quantity,
              price: item.unit_price,
              timestamp: new Date(),
            });
          }
        }
      }

      setPaymentResult(paymentResults);
      setPaymentStep('success');
      
      // Clear cart after successful payment
      await clearCart();

    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Emit payment failure event
      await emitEvent(EVENT_TYPES.PAYMENT_FAILURE, {
        transactionId: 'failed-' + Date.now(),
        amount: finalTotal,
        currency: 'usd',
        merchantId: Object.keys(merchantGroups)[0] || '',
        customerId: user?.id || '',
        errorCode: 'PROCESSING_ERROR',
        errorMessage: error.message || 'Payment processing failed',
        timestamp: new Date(),
      });

      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
      setPaymentStep('payment');
    }
  };

  const renderReviewStep = () => (
    <ScrollView style={{ flex: 1 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Review Your Order
      </Text>

      {/* Order Items by Merchant */}
      {Object.values(merchantGroups).map((group: any) => (
        <View key={group.merchantId} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            {group.merchantName}
          </Text>
          
          {group.items.map((item: CartItem) => (
            <View key={item.id} style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginBottom: 8 
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16 }}>{item.productName}</Text>
                <Text style={{ fontSize: 14, color: '#666' }}>
                  Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>
                ${(item.unit_price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          
          <View style={{ 
            borderTopWidth: 1, 
            borderTopColor: '#eee', 
            paddingTop: 8, 
            marginTop: 8 
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Subtotal:</Text>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>
                ${group.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      ))}

      {/* Referral Code Section */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Referral Code
        </Text>
        
        {!appliedReferral ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text>Enter referral code for discount</Text>
            </View>
            <TouchableOpacity
              onPress={handleApplyReferralCode}
              style={{ padding: 12, backgroundColor: '#007bff', borderRadius: 8 }}
            >
              <Text style={{ color: '#fff' }}>Apply</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ 
            backgroundColor: '#d4edda', 
            padding: 12, 
            borderRadius: 8,
            borderColor: '#c3e6cb',
            borderWidth: 1 
          }}>
            <Text style={{ color: '#155724', fontWeight: '500' }}>
              ✅ Referral code "{appliedReferral.code}" applied
            </Text>
            <Text style={{ color: '#155724' }}>
              Discount: ${appliedReferral.discountAmount.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Order Total */}
      <View style={{ marginBottom: 20, backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 16 }}>Subtotal:</Text>
          <Text style={{ fontSize: 16 }}>${(cartSummary?.total || 0).toFixed(2)}</Text>
        </View>
        
        {appliedReferral && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, color: '#22c55e' }}>
              Referral Discount ({appliedReferral.code}):
            </Text>
            <Text style={{ fontSize: 16, color: '#22c55e' }}>
              -${appliedReferral.discountAmount.toFixed(2)}
            </Text>
          </View>
        )}
        
        <View 
          style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            paddingTop: 8, 
            borderTopWidth: 1, 
            borderTopColor: '#e5e7eb' 
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Total:</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            ${finalTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={handleProceedToPayment}
        style={{ padding: 12, backgroundColor: '#007bff', borderRadius: 8 }}
      >
        <Text style={{ color: '#fff' }}>Proceed to Payment</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPaymentStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Complete Payment
        </Text>
        
        <Text style={{ fontSize: 18, marginBottom: 8 }}>
          Total: ${finalTotal.toFixed(2)}
        </Text>
        
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
          Your payment will be processed securely through Stripe
        </Text>

        <TouchableOpacity
          onPress={handleProcessPayment}
          style={{ padding: 12, backgroundColor: '#007bff', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Pay Now</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setPaymentStep('review')}
          style={{ padding: 12, backgroundColor: '#6c757d', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Back to Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#007bff" />
    </View>
  );

  const renderSuccessStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 12 }}>
          Payment Successful!
        </Text>
        <Text style={{ fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 }}>
          Your order has been confirmed and merchants have been notified.
        </Text>
        
        {appliedReferral && (
          <Text style={{ fontSize: 14, color: '#28a745', textAlign: 'center', marginBottom: 20 }}>
            ✅ Referral reward of ${appliedReferral.discountAmount.toFixed(2)} has been processed
          </Text>
        )}

        <TouchableOpacity
          onPress={() => {
            setPaymentStep('review');
            setAppliedReferral(null);
            setReferralCode('');
          }}
          style={{ padding: 12, backgroundColor: '#007bff', borderRadius: 8 }}
        >
          <Text style={{ color: '#fff' }}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isEmpty) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center' }}>
          Your cart is empty.{'\n'}Add some products to get started!
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {paymentStep === 'review' && renderReviewStep()}
      {paymentStep === 'payment' && renderPaymentStep()}
      {paymentStep === 'processing' && renderProcessingStep()}
      {paymentStep === 'success' && renderSuccessStep()}
    </View>
  );
};

export default IntegratedCheckoutFlow;
