import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'day' | 'month' | 'year';
  description: string;
  stripe_price_id: string;
  type: 'one_time' | 'recurring'; 
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'expired' | 'past_due';
  type: 'one_time' | 'recurring';
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
  purchaseSubscription: (planId: string, paymentMethodId?: string) => Promise<boolean>;
  purchaseDailyAccess: (paymentMethodId?: string) => Promise<boolean>; 
  cancelSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'daily',
    name: 'Daily Access',
    price: 4.99,
    interval: 'day',
    description: 'Perfect for garage sales, auctions, or one-time selling events. Access expires after 24 hours.',
    stripe_price_id: 'price_daily_access',
    type: 'one_time',
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    price: 9.99,
    interval: 'month',
    description: 'Ideal for regular sellers. Full merchant features with monthly billing.',
    stripe_price_id: 'price_monthly_subscription',
    type: 'recurring',
  },
  {
    id: 'yearly',
    name: 'Annual Plan',
    price: 99.99,
    interval: 'year',
    description: 'Best value for committed merchants. Save over 15% with annual billing.',
    stripe_price_id: 'price_yearly_subscription',
    type: 'recurring',
  },
];

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscriptionStatus = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    
    if (sub.type === 'one_time') {
      return sub.status === 'active' && now < expiresAt;
    }
    
    return sub.status === 'active' && now < new Date(sub.current_period_end);
  };

  const isSubscriptionExpired = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    
    const now = new Date();
    
    if (sub.type === 'one_time') {
      return now >= new Date(sub.expires_at);
    }
    
    return now >= new Date(sub.current_period_end) || sub.status === 'expired';
  };

  const canCancelSubscription = (sub: UserSubscription | null): boolean => {
    if (!sub) return false;
    return sub.type === 'recurring' && sub.status === 'active';
  };

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pg_subscriptions')
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

  const purchaseSubscription = async (planId: string, paymentMethodId?: string): Promise<boolean> => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) return false;

    // Route to appropriate purchase method
    if (plan.type === 'one_time') {
      return purchaseDailyAccess(paymentMethodId);
    }

    // Handle recurring subscription purchase
    try {
      setLoading(true);
      
      // First, process the subscription payment
      // This would integrate with your existing payment processing
      // For now, simulate the purchase
      const now = new Date();
      const periodEnd = new Date();
      
      if (plan.interval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (plan.interval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const newSubscription: UserSubscription = {
        id: `sub_${Date.now()}`,
        user_id: user!.id,
        plan_id: planId,
        status: 'active',
        type: 'recurring',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        stripe_subscription_id: `sub_stripe_${Date.now()}`,
        purchased_at: now.toISOString(),
        expires_at: periodEnd.toISOString(),
      };

      // Save subscription to database
      const { error: subError } = await supabase
        .from('pg_subscriptions')
        .insert(newSubscription);

      if (subError) throw subError;

      setSubscription(newSubscription);
      
      // Note: Stripe Connect account creation will be handled separately
      // in the onboarding flow after subscription is confirmed
      
      return true;
    } catch (error) {
      console.error('Error purchasing subscription:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const purchaseDailyAccess = async (paymentMethodId?: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      const dailyAccess: UserSubscription = {
        id: `daily_${Date.now()}`,
        user_id: user!.id,
        plan_id: 'daily',
        status: 'active',
        type: 'one_time',
        current_period_start: now.toISOString(),
        current_period_end: expiresAt.toISOString(),
        purchased_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      // Save daily access to database
      const { error } = await supabase
        .from('pg_subscriptions')
        .insert(dailyAccess);

      if (error) throw error;

      setSubscription(dailyAccess);
      
      // Note: Stripe Connect account creation will be handled separately
      // in the onboarding flow after daily access is confirmed
      
      return true;
    } catch (error) {
      console.error('Error purchasing daily access:', error);
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
        status: 'canceled' as const,
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

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  useEffect(() => {
    if (subscription?.type === 'one_time') {
      const checkExpiry = () => {
        if (isSubscriptionExpired(subscription)) {
          setSubscription(prev => prev ? { ...prev, status: 'expired' } : null);
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
    purchaseDailyAccess,
    cancelSubscription,
    refreshSubscription,
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
