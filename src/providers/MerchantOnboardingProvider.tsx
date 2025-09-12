import React, { createContext, useContext, ReactNode } from 'react';
import { useMerchantOnboarding } from '../features/merchant-onboarding/hooks/useMerchantOnboarding';
import { MerchantOnboardingContextType } from '../features/merchant-onboarding/types';
import { ProviderProps } from '../types';

const MerchantOnboardingContext = createContext<MerchantOnboardingContextType | undefined>(undefined);

/**
 * Merchant Onboarding Provider
 * 
 * Provides merchant onboarding and Stripe Connect capabilities across the application.
 * Integrates with the Merchant Onboarding feature's hook system to manage
 * Stripe Connect accounts, onboarding flows, and merchant verification.
 */
export const MerchantOnboardingProvider: React.FC<ProviderProps> = ({ children }) => {
  const merchantOnboardingContext = useMerchantOnboarding();

  return (
    <MerchantOnboardingContext.Provider value={merchantOnboardingContext}>
      {/* Provide feature-scoped compatibility contexts so legacy-ported components
          can still consume subscription and stripe connect contexts from the feature.
      */}
      <React.Suspense fallback={children}>
        {/* Dynamically import to avoid circular imports at module load time */}
        <FeatureCompatibilityProviders>{children}</FeatureCompatibilityProviders>
      </React.Suspense>
    </MerchantOnboardingContext.Provider>
  );
};

/**
 * Hook to access Merchant Onboarding context
 */
// Feature compatibility wrapper to provide feature-scoped contexts
const FeatureCompatibilityProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Import providers lazily to prevent circular dependency issues
  const { SubscriptionProvider } = require('../features/merchant-onboarding/contexts/SubscriptionContext');
  const { StripeConnectProvider } = require('../features/merchant-onboarding/contexts/StripeConnectContext');

  return (
    <SubscriptionProvider>
      <StripeConnectProvider>
        {children}
      </StripeConnectProvider>
    </SubscriptionProvider>
  );
};

export const useMerchantOnboardingContext = (): MerchantOnboardingContextType => {
  const context = useContext(MerchantOnboardingContext);
  if (!context) {
    throw new Error('useMerchantOnboardingContext must be used within a MerchantOnboardingProvider');
  }
  return context;
};

export default MerchantOnboardingProvider;
