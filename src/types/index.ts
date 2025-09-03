export interface UserProfile {
  id: string;
  stripe_customer_id?: string;
  default_payment_method_id?: string;
  user_type: 'customer' | 'agent' | 'buyer';
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  type: 'card' | 'bank_account';
  last_four: string;
  expire_month?: number;
  expire_year?: number;
  brand: string;
  is_default: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  payment_method_used: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile?: UserProfile;
}

export interface CheckoutData {
  amount: number;
  currency: string;
  payment_method_id?: string;
  save_payment_method?: boolean;
}

export type CheckoutFlow = 'express' | 'select' | 'one-time';

export interface StripeError {
  type: string;
  code?: string;
  message: string;
  decline_code?: string;
}

export interface PaymentResult {
  success: boolean;
  payment_intent_id?: string;
  error?: StripeError;
}
