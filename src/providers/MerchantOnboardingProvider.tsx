import React, { createContext, useContext, ReactNode } from 'react';
import { useMerchantOnboarding } from '../features/merchant-onboarding/hooks/useMerchantOnboarding';
import { MerchantOnboardingContextType } from '../features/merchant-onboarding/types';

const MerchantOnboardingContext = createContext<MerchantOnboardingContextType | undefined>(undefined);

interface MerchantOnboardingProviderProps {
  children: ReactNode;
}

/**
 * Merchant Onboarding Provider
 * 
 * Provides merchant onboarding and Stripe Connect capabilities across the application.
 * Integrates with the Merchant Onboarding feature's hook system to manage
 * Stripe Connect accounts, onboarding flows, and merchant verification.
 */
export const MerchantOnboardingProvider: React.FC<MerchantOnboardingProviderProps> = ({ children }) => {
  const merchantOnboardingContext = useMerchantOnboarding();

  return (
    <MerchantOnboardingContext.Provider value={merchantOnboardingContext}>
      {children}
    </MerchantOnboardingContext.Provider>
  );
};

/**
 * Hook to access Merchant Onboarding context
 */
export const useMerchantOnboardingContext = (): MerchantOnboardingContextType => {
  const context = useContext(MerchantOnboardingContext);
  if (!context) {
    throw new Error('useMerchantOnboardingContext must be used within a MerchantOnboardingProvider');
  }
  return context;
};

export default MerchantOnboardingProvider;
