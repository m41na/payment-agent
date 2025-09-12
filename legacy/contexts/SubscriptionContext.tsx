import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../src/services/supabase';
import { useAuth } from './AuthContext';
import { useStripe } from '@stripe/stripe-react-native';
import { usePayment } from './PaymentContext';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  stripe_product_id: string;
  stripe_price_id: string;
  price_amount: number; // in cents
  price_currency: string;
  billing_interval: typeof VALIDITY_PERIOD[keyof typeof VALIDITY_PERIOD];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
  type: typeof SUBSCRIPTION_TYPES[keyof typeof SUBSCRIPTION_TYPES];
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id?: string; 
  purchased_at: string; 
  expires_at: string; 
}

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  isSubscriptionExpired: boolean;
  canCancelSubscription: boolean; 
  subscriptionPlans: SubscriptionPlan[];
  purchaseSubscription: (planId: string, paymentMethodId?: string, paymentOption?: string) => Promise<boolean>;
  purchaseWithNewCard: (planId: string) => Promise<boolean>;
  purchaseWithSavedCard: (planId: string, paymentMethodId: string) => Promise<boolean>;
  purchaseWithExpressCheckout: (planId: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  refreshPlans: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Constants for payment options
const PAYMENT_OPTIONS = {
  EXPRESS: 'express',
  ONE_TIME: 'one_time',
  SAVED: 'saved'
} as const;

// Constants for subscription types
const SUBSCRIPTION_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring'
} as const;

// Constants for validity periods (billing intervals)
const VALIDITY_PERIOD = {
  ONE_DAY: 'one_time',
  MONTH: 'month',
  YEAR: 'year'
} as const;

// Constants for subscription status
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  EXPIRED: 'expired',
  PAST_DUE: 'past_due'
} as const;

const fetchPlans = async (setSubscriptionPlans: (plans: SubscriptionPlan[]) => void) => {
  try {
    const { data, error } = await supabase
      .from('pg_merchant_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_amount', { ascending: true });

    if (error) {
      console.error('Error fetching merchant plans:', error);
      setSubscriptionPlans([]);
    } else {
      setSubscriptionPlans(data || []);
    }
  } catch (error) {
    console.error('Error fetching merchant plans:', error);
    setSubscriptionPlans([]);
  }
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { oneTimePayment } = usePayment();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const checkSubscriptionStatus = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    
    if (sub.type === SUBSCRIPTION_TYPES.ONE_TIME) {
      return sub.status === SUBSCRIPTION_STATUS.ACTIVE && now < expiresAt;
    }
    
    return sub.status === SUBSCRIPTION_STATUS.ACTIVE && now < new Date(sub.current_period_end);
  };

  const isSubscriptionExpired = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    
    const now = new Date();
    
    if (sub.type === SUBSCRIPTION_TYPES.ONE_TIME) {
      return now >= new Date(sub.expires_at);
    }
    
    return now >= new Date(sub.current_period_end) || sub.status === SUBSCRIPTION_STATUS.EXPIRED;
  };

  const canCancelSubscription = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    return sub.type === SUBSCRIPTION_TYPES.RECURRING && sub.status === SUBSCRIPTION_STATUS.ACTIVE;
  };

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pg_user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        setSubscription(null);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const purchaseSubscription = async (planId: string, paymentMethodId?: string, paymentOption?: string): Promise<boolean> => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) return false;

    console.log('inspecting paymentOption value ->', paymentOption);

    // Route based on payment method, not plan type (product-agnostic payment processing)
    if (paymentOption === PAYMENT_OPTIONS.ONE_TIME) {
      return purchaseWithNewCard(planId);
    }

    // Handle recurring subscription purchase
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('pg_subscription-checkout', {
        body: {
          action: 'create_subscription',
          subscriptionData: {
            plan_id: planId,
            payment_method_id: paymentMethodId,
            payment_option: paymentMethodId ? PAYMENT_OPTIONS.SAVED : (paymentOption === PAYMENT_OPTIONS.EXPRESS ? PAYMENT_OPTIONS.EXPRESS : PAYMENT_OPTIONS.ONE_TIME),
          }
        }
      });

      if (error) {
        console.error('Error calling subscription checkout:', error);
        console.error('Error message:', error.message);
        console.error('Error context:', error.context);
        console.error('Error details:', error.details);
        
        // Extract the actual error response body
        try {
          const responseText = new TextDecoder().decode(error.context._bodyBlob._data.buffer);
          console.error('Edge Function response body:', responseText);
          
          // Try to parse as JSON
          try {
            const responseJson = JSON.parse(responseText);
            console.error('Parsed error response:', responseJson);
          } catch (parseError) {
            console.error('Could not parse response as JSON');
          }
        } catch (decodeError) {
          console.error('Could not decode response body');
        }
        
        return false;
      }

      if (!data.success) {
        console.error('Recurring subscription purchase failed:', data.error);
        return false;
      }

      if (data.requires_action && data.client_secret) {
        // Return requires_action response to let UI handle payment sheet
        return true;
      }

      // Refresh subscription data to ensure UI updates
      await fetchSubscription();
      return true;
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const purchaseWithNewCard = async (planId: string): Promise<boolean> => {
    if (!user) return false;

    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      console.error('Plan not found:', planId);
      return false;
    }

    try {
      setLoading(true);
      
      console.log('=== NEW CARD PURCHASE ===');
      console.log('User:', user?.id);
      console.log('Plan:', plan);

      // Use Edge Function for new card payments - product agnostic
      const { data, error } = await supabase.functions.invoke('pg_subscription-checkout', {
        body: {
          action: 'create_subscription',
          subscriptionData: {
            plan_id: planId,
            payment_method_id: undefined, // No payment method ID = new card
            payment_option: PAYMENT_OPTIONS.ONE_TIME, // New card, don't save
          }
        }
      });

      if (error) {
        console.error('Error calling subscription checkout for new card payment:', error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.context?.status);
        
        // Extract the actual error response body
        try {
          const response = await error.context.text();
          console.error('Edge Function response body:', response);
          
          try {
            const responseJson = JSON.parse(response);
            console.error('Parsed error response:', responseJson);
          } catch (parseError) {
            console.error('Response is not JSON:', response);
          }
        } catch (decodeError) {
          console.error('Could not decode response body:', decodeError);
        }
        
        return false;
      }

      if (!data.success) {
        console.error('New card payment failed:', data.error);
        return false;
      }

      console.log('New card payment response:', data);

      // Handle payment confirmation if required
      if (data.requires_action && data.client_secret) {
        const { error: paymentError } = await initPaymentSheet({
          paymentIntentClientSecret: data.client_secret,
          merchantDisplayName: 'Payment Agent',
        });

        if (paymentError) {
          console.error('Payment sheet initialization failed:', paymentError);
          return false;
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          console.error('Payment sheet presentation failed:', presentError);
          return false;
        }
      }

      // Refresh subscription data to ensure UI updates
      await fetchSubscription();
      
      return true;
    } catch (error) {
      console.error('Error purchasing with new card:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const purchaseWithSavedCard = async (planId: string, paymentMethodId: string): Promise<boolean> => {
    if (!user) return false;

    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      console.error('Plan not found:', planId);
      return false;
    }

    try {
      setLoading(true);
      
      console.log('=== SAVED CARD PURCHASE ===');
      console.log('User:', user?.id);
      console.log('Plan:', plan);
      console.log('Payment Method ID:', paymentMethodId);

      // Use Edge Function for saved card payments - product agnostic
      const { data, error } = await supabase.functions.invoke('pg_subscription-checkout', {
        body: {
          action: 'create_subscription',
          subscriptionData: {
            plan_id: planId,
            payment_method_id: paymentMethodId,
            payment_option: PAYMENT_OPTIONS.SAVED,
          }
        }
      });

      if (error) {
        console.error('Error calling subscription checkout for saved card payment:', error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.context?.status);
        
        try {
          const response = await error.context.text();
          console.error('Edge Function response body:', response);
          
          try {
            const responseJson = JSON.parse(response);
            console.error('Parsed error response:', responseJson);
          } catch (parseError) {
            console.error('Response is not JSON:', response);
          }
        } catch (decodeError) {
          console.error('Could not decode response body:', decodeError);
        }
        
        return false;
      }

      if (!data.success) {
        console.error('Saved card payment failed:', data.error);
        return false;
      }

      console.log('Saved card payment response:', data);

      // Handle payment confirmation if required
      if (data.requires_action && data.client_secret) {
        const { error: paymentError } = await initPaymentSheet({
          paymentIntentClientSecret: data.client_secret,
          merchantDisplayName: 'Payment Agent',
        });

        if (paymentError) {
          console.error('Payment sheet initialization failed:', paymentError);
          return false;
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          console.error('Payment sheet presentation failed:', presentError);
          return false;
        }
      }

      // Refresh subscription data to ensure UI updates
      await fetchSubscription();
      
      return true;
    } catch (error) {
      console.error('Error purchasing with saved card:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const purchaseWithExpressCheckout = async (planId: string): Promise<boolean> => {
    if (!user) return false;

    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      console.error('Plan not found:', planId);
      return false;
    }

    try {
      setLoading(true);
      
      console.log('=== EXPRESS CHECKOUT PURCHASE ===');
      console.log('User:', user?.id);
      console.log('Plan:', plan);

      // Use Edge Function for express checkout - product agnostic
      const { data, error } = await supabase.functions.invoke('pg_subscription-checkout', {
        body: {
          action: 'create_subscription',
          subscriptionData: {
            plan_id: planId,
            payment_method_id: undefined, // Express checkout finds default payment method
            payment_option: PAYMENT_OPTIONS.EXPRESS,
          }
        }
      });

      if (error) {
        console.error('Error calling subscription checkout for express checkout:', error);
        console.error('Error message:', error.message);
        console.error('Error status:', error.context?.status);
        
        try {
          const response = await error.context.text();
          console.error('Edge Function response body:', response);
          
          try {
            const responseJson = JSON.parse(response);
            console.error('Parsed error response:', responseJson);
          } catch (parseError) {
            console.error('Response is not JSON:', response);
          }
        } catch (decodeError) {
          console.error('Could not decode response body:', decodeError);
        }
        
        return false;
      }

      if (!data.success) {
        console.error('Express checkout failed:', data.error);
        return false;
      }

      console.log('Express checkout response:', data);

      // Handle payment confirmation if required
      if (data.requires_action && data.client_secret) {
        const { error: paymentError } = await initPaymentSheet({
          paymentIntentClientSecret: data.client_secret,
          merchantDisplayName: 'Payment Agent',
        });

        if (paymentError) {
          console.error('Payment sheet initialization failed:', paymentError);
          return false;
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          console.error('Payment sheet presentation failed:', presentError);
          return false;
        }
      }

      // Refresh subscription data to ensure UI updates
      await fetchSubscription();
      
      return true;
    } catch (error) {
      console.error('Error purchasing with express checkout:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!subscription || !canCancelSubscription(subscription)) {
      return false;
    }

    try {
      setLoading(true);
      
      const updatedSubscription = {
        ...subscription,
        status: SUBSCRIPTION_STATUS.CANCELED as const,
      };
      
      setSubscription(updatedSubscription);
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscription();
  };

  const refreshPlans = async () => {
    await fetchPlans(setSubscriptionPlans);
  };

  useEffect(() => {
    fetchSubscription();
    // Remove fetchPlans from here - only fetch when needed in Storefront
  }, [user]);

  useEffect(() => {
    if (subscription?.type === SUBSCRIPTION_TYPES.ONE_TIME) {
      const checkExpiry = () => {
        if (isSubscriptionExpired(subscription)) {
          setSubscription(prev => prev ? { ...prev, status: SUBSCRIPTION_STATUS.EXPIRED } : null);
        }
      };

      const interval = setInterval(checkExpiry, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, [subscription]);

  const value: SubscriptionContextType = {
    subscription,
    loading,
    hasActiveSubscription: checkSubscriptionStatus(subscription),
    isSubscriptionExpired: isSubscriptionExpired(subscription),
    canCancelSubscription: canCancelSubscription(subscription),
    subscriptionPlans,
    purchaseSubscription,
    purchaseWithNewCard,
    purchaseWithSavedCard,
    purchaseWithExpressCheckout,
    cancelSubscription,
    refreshSubscription,
    refreshPlans,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
