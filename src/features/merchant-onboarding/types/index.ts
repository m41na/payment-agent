// Core domain types
export interface StripeConnectAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  onboarding_status: 'pending' | 'in_progress' | 'completed' | 'restricted';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  created_at: string;
  updated_at: string;
}

// Onboarding flow types
export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  loading: boolean;
}

export interface OnboardingProgress {
  step: 'welcome' | 'account_setup' | 'verification' | 'completed';
  completedSteps: string[];
  currentStepData?: Record<string, any>;
}

// API request/response types
export interface CreateAccountRequest {
  business_type?: 'individual' | 'company';
  country?: string;
  email?: string;
}

export interface CreateAccountResponse {
  success: boolean;
  account_id?: string;
  onboarding_url?: string;
  error?: string;
}

export interface OnboardingUrlRequest {
  account_id: string;
  return_url: string;
  refresh_url: string;
}

export interface OnboardingUrlResponse {
  success: boolean;
  onboarding_url?: string;
  error?: string;
}

export interface AccountStatusResponse {
  success: boolean;
  account?: StripeConnectAccount;
  error?: string;
}

// Computed state types
export interface MerchantCapabilities {
  canAcceptPayments: boolean;
  canReceivePayouts: boolean;
  isOnboardingComplete: boolean;
  hasActiveRestrictions: boolean;
  requiresAction: boolean;
}

export interface OnboardingRequirements {
  currentlyDue: string[];
  eventuallyDue: string[];
  pastDue: string[];
  hasRequirements: boolean;
  isBlocked: boolean;
}

// Event types for real-time updates
export interface AccountUpdateEvent {
  type: 'account_updated';
  account_id: string;
  changes: Partial<StripeConnectAccount>;
  timestamp: string;
}

export interface OnboardingEvent {
  type: 'onboarding_completed' | 'onboarding_failed' | 'requirements_updated';
  account_id: string;
  data?: Record<string, any>;
  timestamp: string;
}

// Error types
export interface MerchantOnboardingError {
  code: 'ACCOUNT_CREATION_FAILED' | 'ONBOARDING_URL_FAILED' | 'STATUS_FETCH_FAILED' | 'NETWORK_ERROR' | 'AUTHENTICATION_ERROR';
  message: string;
  details?: Record<string, any>;
}

// Service operation results
export interface AccountOperationResult {
  success: boolean;
  account?: StripeConnectAccount;
  onboarding_url?: string;
  error?: MerchantOnboardingError;
}

export interface OnboardingOperationResult {
  success: boolean;
  url?: string;
  error?: MerchantOnboardingError;
}

// Storage keys and constants
export const ONBOARDING_STORAGE_KEY = '@payment_agent_onboarding_completed';
export const MERCHANT_ACCOUNT_CACHE_KEY = '@merchant_account_cache';

// Status enums for better type safety
export enum OnboardingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RESTRICTED = 'restricted',
}

export enum AccountCapability {
  CHARGES_ENABLED = 'charges_enabled',
  PAYOUTS_ENABLED = 'payouts_enabled',
}

// Subscription event types
export type MerchantSubscriptionEvent = AccountUpdateEvent | OnboardingEvent;

// UI Component Types (for dumb components)
export interface MerchantOnboardingScreenProps {
  account: StripeConnectAccount | null;
  loading: boolean;
  isOnboardingComplete: boolean;
  canAcceptPayments: boolean;
  onCreateAccount: () => Promise<void>;
  onContinueOnboarding: () => Promise<void>;
  onRefreshAccountStatus: () => Promise<void>;
  onComplete: () => void;
}
