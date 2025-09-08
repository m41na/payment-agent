import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Button, Card, LoadingSpinner, Modal } from '../../../components/shared';
import { useEventListener, useEventEmitter, EVENT_TYPES } from '../../../events';
import { useShoppingCartContext } from '../../../providers/ShoppingCartProvider';
import { usePaymentProcessingContext } from '../../../providers/PaymentProcessingProvider';
import { useReferralSystemContext } from '../../../providers/ReferralSystemProvider';
import { useAuth } from '../../../shared/auth/AuthContext';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
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
  const { user } = useAuth();
  const { cartItems, cartTotal, clearCart } = useShoppingCartContext();
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

  const finalTotal = appliedReferral 
    ? cartTotal - appliedReferral.discountAmount
    : cartTotal;

  const merchantGroups = (cartItems || []).reduce((groups, item) => {
    if (!groups[item.merchantId]) {
      groups[item.merchantId] = {
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        items: [],
        subtotal: 0,
      };
    }
    groups[item.merchantId].items.push(item);
    groups[item.merchantId].subtotal += item.price * item.quantity;
    return groups;
  }, {} as Record<string, any>);

  const handleApplyReferralCode = async () => {
    if (!referralCode.trim()) return;

    try {
      const discount = await applyReferralCode(referralCode, cartTotal);
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
      itemCount: (cartItems || []).length,
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
          amount: group.subtotal,
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
          for (const item of (cartItems || []).filter(i => i.merchantId === result.merchantId)) {
            await emitEvent(EVENT_TYPES.PRODUCT_PURCHASED, {
              userId: user?.id || '',
              productId: item.productId,
              merchantId: item.merchantId,
              quantity: item.quantity,
              price: item.price,
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
        <Card key={group.merchantId} variant="outlined" style={{ marginBottom: 16 }}>
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
                  Qty: {item.quantity} × ${item.price.toFixed(2)}
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>
                ${(item.price * item.quantity).toFixed(2)}
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
                ${group.subtotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      {/* Referral Code Section */}
      <Card variant="filled" style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
          Referral Code
        </Text>
        
        {!appliedReferral ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text>Enter referral code for discount</Text>
            </View>
            <Button
              title="Apply"
              onPress={handleApplyReferralCode}
              variant="outline"
              size="small"
            />
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
      </Card>

      {/* Order Total */}
      <Card variant="elevated" style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 16 }}>Subtotal:</Text>
          <Text style={{ fontSize: 16 }}>${cartTotal.toFixed(2)}</Text>
        </View>
        
        {appliedReferral && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, color: '#28a745' }}>Referral Discount:</Text>
            <Text style={{ fontSize: 16, color: '#28a745' }}>
              -${appliedReferral.discountAmount.toFixed(2)}
            </Text>
          </View>
        )}
        
        <View style={{ 
          borderTopWidth: 2, 
          borderTopColor: '#333', 
          paddingTop: 8, 
          flexDirection: 'row', 
          justifyContent: 'space-between' 
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Total:</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            ${finalTotal.toFixed(2)}
          </Text>
        </View>
      </Card>

      <Button
        title="Proceed to Payment"
        onPress={handleProceedToPayment}
        variant="primary"
        size="large"
        fullWidth
      />
    </ScrollView>
  );

  const renderPaymentStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Card variant="elevated" style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          Complete Payment
        </Text>
        
        <Text style={{ fontSize: 18, marginBottom: 8 }}>
          Total: ${finalTotal.toFixed(2)}
        </Text>
        
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
          Your payment will be processed securely through Stripe
        </Text>

        <Button
          title="Pay Now"
          onPress={handleProcessPayment}
          variant="primary"
          size="large"
          fullWidth
          style={{ marginBottom: 12 }}
        />
        
        <Button
          title="Back to Review"
          onPress={() => setPaymentStep('review')}
          variant="outline"
          size="medium"
          fullWidth
        />
      </Card>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <LoadingSpinner
        message="Processing your payment..."
        overlay={false}
      />
    </View>
  );

  const renderSuccessStep = () => (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Card variant="elevated" style={{ alignItems: 'center' }}>
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

        <Button
          title="Continue Shopping"
          onPress={() => {
            setPaymentStep('review');
            setAppliedReferral(null);
            setReferralCode('');
          }}
          variant="primary"
          size="large"
          fullWidth
        />
      </Card>
    </View>
  );

  if ((cartItems || []).length === 0) {
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
