import React, { createContext, useContext } from 'react';
import { useSubscription as useSubscriptionHook } from '../../payment-processing/hooks/useSubscription';

// This context is a compatibility wrapper that exposes a legacy-like
// SubscriptionContext API for code ported from the legacy app. It delegates
// to the new payment-processing hook implementation.

export type SubscriptionContextType = ReturnType<typeof useSubscriptionHook>;

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscription = useSubscriptionHook();

  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
};

export default SubscriptionProvider;
