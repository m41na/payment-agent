import React, { createContext, useContext, ReactNode } from 'react';
import { useDiscoveryListing } from '../features/discovery-listing/hooks/useDiscoveryListing';
import { DiscoveryListingContextType } from '../features/discovery-listing/types';

const DiscoveryListingContext = createContext<DiscoveryListingContextType | undefined>(undefined);

interface DiscoveryListingProviderProps {
  children: ReactNode;
}

/**
 * Discovery Listing Provider
 * 
 * Provides discovery listing and search capabilities across the application.
 * Integrates with the Discovery Listing feature's hook system to manage
 * product browsing, filtering, sorting, and search functionality.
 */
export const DiscoveryListingProvider: React.FC<DiscoveryListingProviderProps> = ({ children }) => {
  const discoveryListingContext = useDiscoveryListing();

  return (
    <DiscoveryListingContext.Provider value={discoveryListingContext}>
      {children}
    </DiscoveryListingContext.Provider>
  );
};

/**
 * Hook to access Discovery Listing context
 */
export const useDiscoveryListingContext = (): DiscoveryListingContextType => {
  const context = useContext(DiscoveryListingContext);
  if (!context) {
    throw new Error('useDiscoveryListingContext must be used within a DiscoveryListingProvider');
  }
  return context;
};

export default DiscoveryListingProvider;
