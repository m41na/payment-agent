import React, { createContext, useContext, ReactNode } from 'react';
import { useStorefront } from '../features/storefront/hooks/useStorefront';
import { StorefrontContextType } from '../features/storefront/types';
import { ProviderProps } from '../types';

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined);

/**
 * Storefront Provider
 * 
 * Provides merchant storefront management capabilities across the application.
 * Integrates with the Storefront feature's hook system to manage
 * business profiles, transaction history, and merchant operations.
 */
export const StorefrontProvider: React.FC<ProviderProps> = ({ children }) => {
  const storefrontContext = useStorefront();

  return (
    <StorefrontContext.Provider value={storefrontContext}>
      {children}
    </StorefrontContext.Provider>
  );
};

/**
 * Hook to access Storefront context
 */
export const useStorefrontContext = (): StorefrontContextType => {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error('useStorefrontContext must be used within a StorefrontProvider');
  }
  return context;
};

export default StorefrontProvider;
