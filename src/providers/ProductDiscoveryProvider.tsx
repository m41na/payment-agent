import React, { createContext, useContext, ReactNode } from 'react';
import { useProductDiscovery } from '../features/product-discovery/hooks/useProductDiscovery';
import { ProductDiscoveryContextType } from '../features/product-discovery/types';

const ProductDiscoveryContext = createContext<ProductDiscoveryContextType | undefined>(undefined);

interface ProductDiscoveryProviderProps {
  children: ReactNode;
}

/**
 * Product Discovery Provider
 * 
 * Provides product discovery and search capabilities across the application.
 * Integrates with the Product Discovery feature's hook system to manage
 * product browsing, filtering, sorting, and search functionality.
 */
export const ProductDiscoveryProvider: React.FC<ProductDiscoveryProviderProps> = ({ children }) => {
  const productDiscoveryContext = useProductDiscovery();

  return (
    <ProductDiscoveryContext.Provider value={productDiscoveryContext}>
      {children}
    </ProductDiscoveryContext.Provider>
  );
};

/**
 * Hook to access Product Discovery context
 */
export const useProductDiscoveryContext = (): ProductDiscoveryContextType => {
  const context = useContext(ProductDiscoveryContext);
  if (!context) {
    throw new Error('useProductDiscoveryContext must be used within a ProductDiscoveryProvider');
  }
  return context;
};

export default ProductDiscoveryProvider;
