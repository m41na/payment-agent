import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../../user-auth/context/AuthContext';
import { SubscriptionService } from '../services/SubscriptionService';
import { PaymentService } from '../services/PaymentService';
import { SubscriptionPlan, UserSubscription } from '../types';

export const useSubscription = () => {
  const { user } = useAuth();
  const stripe = useStripe();
  
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize services to prevent recreation on every render
  const subscriptionService = useMemo(() => {
    return user ? new SubscriptionService(user.id) : null;
  }, [user?.id]);

  const paymentService = useMemo(() => {
    return user ? new PaymentService(user.id) : null;
  }, [user?.id]);

  // Data fetching
  const fetchSubscription = useCallback(async () => {
    if (!subscriptionService) return;
    
    try {
      setLoading(true);
      setError(null);
      const userSubscription = await subscriptionService.getUserSubscription();
      setSubscription(userSubscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  }, [subscriptionService]);

  const fetchSubscriptionPlans = useCallback(async () => {
    if (!subscriptionService) return;
    
    try {
      setLoading(true);
      setError(null);
      const plans = await subscriptionService.getSubscriptionPlans();
      setSubscriptionPlans(plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  }, [subscriptionService]);

  // Subscription management
  const purchaseSubscription = useCallback(async (planId: string, paymentMethodId?: string, paymentOption?: string): Promise<boolean> => {
    if (!subscriptionService) throw new Error('Subscription service not available');
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await subscriptionService.purchaseSubscription(planId, paymentMethodId, paymentOption);
      
      if (result.success) {
        await fetchSubscription(); // Refresh subscription data
        return true;
      } else {
        setError(result.error || 'Subscription purchase failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [subscriptionService, fetchSubscription]);

  const purchaseWithNewCard = useCallback(async (planId: string): Promise<boolean> => {
    if (!paymentService || !stripe) throw new Error('Payment service not available');
    
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      setError('Plan not found');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Create payment intent for one-time purchase
      const intent = await paymentService.createPaymentIntent({
        amount: plan.price_amount,
        description: `${plan.name} subscription`
      });

      const clientSecret = intent.clientSecret;
      if (!clientSecret) throw new Error('Missing client secret for subscription payment');

      // Initialize payment sheet
      const { error: initError } = await stripe.initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Payment Agent',
        style: 'alwaysDark',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present payment sheet
      const { error: presentError } = await stripe.presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
        return false; // User canceled
      }

      // Payment succeeded - refresh subscription data
      await fetchSubscription();
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase with new card';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [paymentService, stripe, subscriptionPlans, fetchSubscription]);

  const purchaseWithSavedCard = useCallback(async (planId: string, paymentMethodId: string): Promise<boolean> => {
    return purchaseSubscription(planId, paymentMethodId, 'saved');
  }, [purchaseSubscription]);

  const purchaseWithExpressCheckout = useCallback(async (planId: string): Promise<boolean> => {
    return purchaseSubscription(planId, undefined, 'express');
  }, [purchaseSubscription]);

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscriptionService) throw new Error('Subscription service not available');
    
    try {
      setLoading(true);
      setError(null);
      await subscriptionService.cancelSubscription();
      await fetchSubscription(); // Refresh subscription data
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [subscriptionService, fetchSubscription]);

  // Initial data load
  useEffect(() => {
    if (user) {
      fetchSubscription();
      fetchSubscriptionPlans();
    } else {
      setSubscription(null);
      setSubscriptionPlans([]);
    }
  }, [user, fetchSubscription, fetchSubscriptionPlans]);

  // Computed values
  const hasActiveSubscription = subscriptionService?.checkSubscriptionStatus(subscription) || false;
  const isSubscriptionExpired = subscriptionService?.isSubscriptionExpired(subscription) || false;
  const canCancelSubscription = subscriptionService?.canCancelSubscription(subscription) || false;

  return {
    // Data
    subscription,
    subscriptionPlans,
    hasActiveSubscription,
    isSubscriptionExpired,
    canCancelSubscription,
    
    // State
    loading,
    error,
    
    // Actions
    purchaseSubscription,
    purchaseWithNewCard,
    purchaseWithSavedCard,
    purchaseWithExpressCheckout,
    cancelSubscription,
    refreshSubscription: fetchSubscription,
    refreshPlans: fetchSubscriptionPlans,
    
    // Utils
    clearError: () => setError(null),
  };
};
