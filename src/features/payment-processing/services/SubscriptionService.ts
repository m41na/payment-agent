import { supabase } from '../../../services/supabase';
import { SubscriptionPlan, UserSubscription, SubscriptionError } from '../types';

export class SubscriptionService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Subscription Plan Management
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('pg_merchant_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_amount', { ascending: true });

      if (error) throw this.createSubscriptionError(error.message, 'network');
      return data || [];
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch subscription plans');
    }
  }

  // User Subscription Management
  async getUserSubscription(): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('pg_user_subscriptions')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw this.createSubscriptionError(error.message, 'network');
      }
      
      return data || null;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'PGRST116') {
        return null; // No subscription found
      }
      throw this.handleError(error, 'Failed to fetch user subscription');
    }
  }

  // Subscription Purchase
  async purchaseSubscription(planId: string, paymentMethodId?: string, paymentOption?: string): Promise<{
    success: boolean;
    requires_action?: boolean;
    client_secret?: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('pg_subscription-checkout', {
        body: {
          action: 'create_subscription',
          subscriptionData: {
            plan_id: planId,
            payment_method_id: paymentMethodId,
            payment_option: paymentMethodId ? 'saved' : (paymentOption === 'express' ? 'express' : 'one_time'),
          }
        }
      });

      if (error) {
        throw this.createSubscriptionError(error.message, 'stripe');
      }

      return data;
    } catch (error) {
      throw this.handleError(error, 'Failed to purchase subscription');
    }
  }

  // Subscription Cancellation
  async cancelSubscription(): Promise<void> {
    try {
      const subscription = await this.getUserSubscription();
      if (!subscription || !subscription.stripe_subscription_id) {
        throw this.createSubscriptionError('No active subscription found', 'validation');
      }

      const { error } = await supabase.functions.invoke('pg_subscription-checkout', {
        body: {
          action: 'cancel_subscription',
          subscriptionId: subscription.stripe_subscription_id
        }
      });

      if (error) {
        throw this.createSubscriptionError(error.message, 'stripe');
      }
    } catch (error) {
      throw this.handleError(error, 'Failed to cancel subscription');
    }
  }

  // Business Logic Methods
  checkSubscriptionStatus(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;
    
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    
    if (subscription.type === 'one_time') {
      return subscription.status === 'active' && now < expiresAt;
    }
    
    return subscription.status === 'active' && now < new Date(subscription.current_period_end);
  }

  isSubscriptionExpired(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;
    
    const now = new Date();
    
    if (subscription.type === 'one_time') {
      return now >= new Date(subscription.expires_at);
    }
    
    return now >= new Date(subscription.current_period_end) || subscription.status === 'expired';
  }

  canCancelSubscription(subscription: UserSubscription | null): boolean {
    if (!subscription) return false;
    return subscription.type === 'recurring' && subscription.status === 'active';
  }

  // Error Handling
  private createSubscriptionError(message: string, type: SubscriptionError['type'], code?: string): SubscriptionError {
    const error = new Error(message) as SubscriptionError;
    error.type = type;
    error.code = code;
    return error;
  }

  private handleError(error: unknown, fallbackMessage: string): SubscriptionError {
    if (error instanceof Error) {
      if ('type' in error) {
        return error as SubscriptionError;
      }
      return this.createSubscriptionError(error.message, 'network');
    }
    return this.createSubscriptionError(fallbackMessage, 'network');
  }
}
