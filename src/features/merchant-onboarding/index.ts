// Feature metadata
export const MERCHANT_ONBOARDING_FEATURE = {
  name: 'merchant-onboarding',
  version: '1.0.0',
  description: 'Merchant Onboarding feature with Stripe Connect integration, onboarding flow management, and real-time sync',
  dependencies: ['shared/auth', 'shared/data'],
} as const;

// Hooks - React integration layer
export { useMerchantOnboarding } from './hooks/useMerchantOnboarding';
export { useStripeConnect } from './hooks/useStripeConnect';
export { useOnboardingFlow } from './hooks/useOnboardingFlow';
export { useMerchantSync, useAllMerchantSync } from './hooks/useMerchantSync';

// Services - Business logic layer (for advanced usage)
export { StripeConnectService } from './services/StripeConnectService';
export { OnboardingFlowService } from './services/OnboardingFlowService';
export { MerchantSyncService } from './services/MerchantSyncService';

// Types - Domain models and interfaces
export type {
  StripeConnectAccount,
  OnboardingState,
  OnboardingProgress,
  CreateAccountRequest,
  CreateAccountResponse,
  OnboardingUrlRequest,
  OnboardingUrlResponse,
  AccountStatusResponse,
  MerchantCapabilities,
  OnboardingRequirements,
  AccountUpdateEvent,
  OnboardingEvent,
  MerchantOnboardingError,
  AccountOperationResult,
  OnboardingOperationResult,
  MerchantSubscriptionEvent,
} from './types';

// Re-export service callback types for convenience
export type { MerchantSubscriptionCallback } from './services/MerchantSyncService';

// Constants and enums
export { 
  ONBOARDING_STORAGE_KEY,
  MERCHANT_ACCOUNT_CACHE_KEY,
  OnboardingStatus,
  AccountCapability,
} from './types';
