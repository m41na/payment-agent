import React, { createContext, useContext, ReactNode } from 'react';
import { useInventory } from '../features/inventory-management/hooks/useInventory';
import { InventoryManagementContextType } from '../features/inventory-management/types';
import { ProviderProps } from '../types';

const InventoryManagementContext = createContext<InventoryManagementContextType | undefined>(undefined);

/**
 * Inventory Management Provider
 * 
 * Provides inventory and product management capabilities across the application.
 * Integrates with the Inventory Management feature's hook system to manage
 * product inventory, stock levels, and inventory operations.
 */
export const InventoryManagementProvider: React.FC<ProviderProps> = ({ children }) => {
  const inventoryManagementContext = useInventory();

  return (
    <InventoryManagementContext.Provider value={inventoryManagementContext}>
      {children}
    </InventoryManagementContext.Provider>
  );
};

/**
 * Hook to access Inventory Management context
 */
export const useInventoryManagementContext = (): InventoryManagementContextType => {
  const context = useContext(InventoryManagementContext);
  if (!context) {
    throw new Error('useInventoryManagementContext must be used within an InventoryManagementProvider');
  }
  return context;
};

export default InventoryManagementProvider;
