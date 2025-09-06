import React, { createContext, useContext, ReactNode } from 'react';
import { useReferrals } from '../features/referral-system/hooks/useReferrals';
import { ReferralSystemContextType } from '../features/referral-system/types';

const ReferralSystemContext = createContext<ReferralSystemContextType | undefined>(undefined);

interface ReferralSystemProviderProps {
  children: ReactNode;
}

/**
 * Referral System Provider
 * 
 * Provides referral management and analytics capabilities across the application.
 * Integrates with the Referral System feature's hook system to manage
 * referral codes, tracking, rewards, and analytics.
 */
export const ReferralSystemProvider: React.FC<ReferralSystemProviderProps> = ({ children }) => {
  const referralSystemContext = useReferrals();

  return (
    <ReferralSystemContext.Provider value={referralSystemContext}>
      {children}
    </ReferralSystemContext.Provider>
  );
};

/**
 * Hook to access Referral System context
 */
export const useReferralSystemContext = (): ReferralSystemContextType => {
  const context = useContext(ReferralSystemContext);
  if (!context) {
    throw new Error('useReferralSystemContext must be used within a ReferralSystemProvider');
  }
  return context;
};

export default ReferralSystemProvider;
