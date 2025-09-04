export type UserType = 'buyer' | 'seller' | 'admin' | 'support';

export type MerchantStatus = 
  | 'none' 
  | 'payment_added' 
  | 'plan_selected' 
  | 'plan_purchased' 
  | 'onboarding_started' 
  | 'onboarding_completed' 
  | 'active' 
  | 'suspended';

export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  stripe_customer_id?: string;
  user_type: UserType;
  merchant_status: MerchantStatus;
  stripe_connect_account_id?: string;
  onboarding_url?: string;
  subscription_status: SubscriptionStatus;
  current_plan_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  stripe_product_id: string;
  stripe_price_id: string;
  price_amount: number; // in cents
  price_currency: string;
  billing_interval: 'month' | 'year';
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_subscription_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  stripe_payment_method_id: string;
  type: 'card' | 'bank_account';
  last4: string;
  exp_month?: number;
  exp_year?: number;
  brand: string;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id?: string;
  stripe_payment_intent_id: string;
  stripe_connect_account_id?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  payment_method_id?: string;
  transaction_type: 'payment' | 'subscription' | 'payout';
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface MerchantOnboardingLog {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
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
  seller_id?: string; // For marketplace transactions
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

// Merchant onboarding workflow types
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface MerchantOnboardingState {
  currentStep: MerchantStatus;
  steps: OnboardingStep[];
  canProceed: boolean;
  nextAction?: string;
}

// Subscription management types
export interface SubscriptionCheckoutData {
  plan_id: string;
  payment_method_id?: string;
}

export interface ConnectAccountInfo {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images: string[];
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  tags: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
  seller?: Profile;
  distance?: number;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description?: string;
  event_type: 'garage_sale' | 'auction' | 'farmers_market' | 'flea_market' | 'estate_sale' | 'country_fair' | 'craft_fair' | 'food_truck' | 'pop_up_shop' | 'other';
  start_date: string;
  end_date: string;
  location_name?: string;
  address?: string;
  latitude: number;
  longitude: number;
  contact_info: {
    phone?: string;
    email?: string;
    website?: string;
  };
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
  distance?: number;
  products?: Product[];
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
