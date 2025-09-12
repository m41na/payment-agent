import React, { createContext, useContext } from 'react';
import { useStripeConnect as useStripeConnectHook } from '../hooks/useStripeConnect';

export type StripeConnectContextType = ReturnType<typeof useStripeConnectHook>;

const StripeConnectContext = createContext<StripeConnectContextType | undefined>(undefined);

export const StripeConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const stripeConnect = useStripeConnectHook();

  return (
    <StripeConnectContext.Provider value={stripeConnect}>
      {children}
    </StripeConnectContext.Provider>
  );
};

export const useStripeConnect = (): StripeConnectContextType => {
  const ctx = useContext(StripeConnectContext);
  if (!ctx) {
    throw new Error('useStripeConnect must be used within a StripeConnectProvider');
  }
  return ctx;
};

export default StripeConnectProvider;
