// Feature metadata
export const INVENTORY_MANAGEMENT_FEATURE = {
  name: 'inventory-management',
  version: '1.0.0',
  description: 'Inventory Management feature with products and availability tracking',
  dependencies: ['shared/auth', 'shared/data'],
} as const;

// Hooks - React integration layer
export { useInventory } from './hooks/useInventory';
export { useProducts } from './hooks/useProducts';

// Services - Business logic layer (for advanced usage)
export { ProductService } from './services/ProductService';
export { InventoryService } from './services/InventoryService';

// Types - Domain models and interfaces
export type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductLocation,
  LocationSearchParams,
  InventoryStatus,
  InventoryItem,
  ProductOperationResult,
  InventoryUpdateResult,
  InventoryError,
  ProductFilters,
  ProductSearchResult,
} from './types';
