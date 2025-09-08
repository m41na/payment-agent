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

// UI Component Types (for dumb components)
export interface PaymentMethodsScreenProps {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  onAddPaymentMethod: () => void;
  onRemovePaymentMethod: (id: string) => Promise<void>;
  onSetDefaultPaymentMethod: (id: string) => Promise<void>;
  onRefreshPaymentMethods: () => void;
}
