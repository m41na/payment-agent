import React, { createContext, useContext, ReactNode } from 'react';
import { useShoppingCart } from '../features/shopping-cart/hooks/useShoppingCart';
import { ShoppingCartContextType } from '../features/shopping-cart/types';
import { ProviderProps } from '../types';

const ShoppingCartContext = createContext<ShoppingCartContextType | undefined>(undefined);

/**
 * Shopping Cart Provider
 * 
 * Provides shopping cart and order management capabilities across the application.
 * Integrates with the Shopping Cart feature's hook system to manage
 * cart items, checkout processes, and order operations.
 */
export const ShoppingCartProvider: React.FC<ProviderProps> = ({ children }) => {
  const shoppingCartContext = useShoppingCart();

  return (
    <ShoppingCartContext.Provider value={shoppingCartContext}>
      {children}
    </ShoppingCartContext.Provider>
  );
};

/**
 * Hook to access Shopping Cart context
 */
export const useShoppingCartContext = (): ShoppingCartContextType => {
  const context = useContext(ShoppingCartContext);
  if (!context) {
    throw new Error('useShoppingCartContext must be used within a ShoppingCartProvider');
  }
  return context;
};

export default ShoppingCartProvider;
