// Feature metadata
export const INVENTORY_MANAGEMENT_FEATURE = {
  name: 'inventory-management',
  version: '1.0.0',
  description: 'Inventory Management feature with products, real-time sync, and availability tracking',
  dependencies: ['shared/auth', 'shared/data'],
} as const;

// Hooks - React integration layer
export { useInventory } from './hooks/useInventory';
export { useProducts } from './hooks/useProducts';
export { useInventorySync, useProductSync } from './hooks/useInventorySync';

// Services - Business logic layer (for advanced usage)
export { ProductService } from './services/ProductService';
export { InventoryService } from './services/InventoryService';
export { SyncService } from './services/SyncService';

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
  ProductSubscriptionEvent,
  InventoryError,
  ProductFilters,
  ProductSearchResult,
} from './types';

// Re-export subscription callback type for convenience
export type { SubscriptionCallback } from './services/SyncService';
