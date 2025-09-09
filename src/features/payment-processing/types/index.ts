export interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  type: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

export interface Transaction {
  id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

export interface CheckoutOptions {
  amount: number;
  description?: string;
  paymentMethodId?: string;
}

export type CheckoutFlow = 'express' | 'selective' | 'one-time';

export interface PaymentError extends Error {
  code?: string;
  type?: 'validation' | 'network' | 'stripe' | 'auth';
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  stripe_product_id: string;
  stripe_price_id: string;
  price_amount: number; // in cents
  price_currency: string;
  billing_interval: 'one_time' | 'month' | 'year';
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface SubscriptionError extends Error {
  code?: string;
  type?: 'validation' | 'network' | 'stripe' | 'auth';
}

// UI Component Types (for dumb components)
export interface PaymentMethodsScreenProps {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  onAddPaymentMethod: () => void;
  onRemovePaymentMethod: (id: string) => Promise<void>;
  onSetDefaultPaymentMethod: (id: string) => Promise<void>;
  onRefreshPaymentMethods: () => void;
  // Optional callback when a payment method is selected for checkout
  onSelectPaymentMethod?: (id: string) => void;
}
