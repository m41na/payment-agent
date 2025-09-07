import { useState, useCallback } from 'react';
import { useProducts } from './useProducts';
import { useInventorySync } from './useInventorySync';
import { InventoryService } from '../services/InventoryService';
import { Product, CreateProductData, UpdateProductData, ProductFilters } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

const inventoryService = new InventoryService();

export const useInventory = () => {
  const { user } = useAuth();
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  // Use specialized hooks
  const products = useProducts();
  const sync = useInventorySync();

  // Inventory-specific operations
  const toggleProductAvailability = useCallback(async (productId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setInventoryError(null);
      setInventoryLoading(true);
      
      const updatedProduct = await inventoryService.toggleProductAvailability(user.id, productId);
      
      // Update local state
      products.updateProduct(productId, { is_available: updatedProduct.is_available });
      
      return updatedProduct;
    } catch (err: any) {
      setInventoryError(err.message || 'Failed to toggle product availability');
      throw err;
    } finally {
      setInventoryLoading(false);
    }
  }, [user, products]);

  const setProductAvailability = useCallback(async (productId: string, isAvailable: boolean) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setInventoryError(null);
      setInventoryLoading(true);
      
      const updatedProduct = await inventoryService.setProductAvailability(user.id, productId, isAvailable);
      
      // Update local state
      products.updateProduct(productId, { is_available: updatedProduct.is_available });
      
      return updatedProduct;
    } catch (err: any) {
      setInventoryError(err.message || 'Failed to set product availability');
      throw err;
    } finally {
      setInventoryLoading(false);
    }
  }, [user, products]);

  const bulkUpdateAvailability = useCallback(async (productIds: string[], isAvailable: boolean) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setInventoryError(null);
      setInventoryLoading(true);
      
      const result = await inventoryService.bulkUpdateAvailability(user.id, productIds, isAvailable);
      
      if (result.success) {
        // Refresh products to get updated state
        await products.refreshProducts();
      }
      
      return result;
    } catch (err: any) {
      setInventoryError(err.message || 'Failed to bulk update availability');
      throw err;
    } finally {
      setInventoryLoading(false);
    }
  }, [user, products]);

  const getInventoryStats = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    try {
      setInventoryError(null);
      return await inventoryService.getInventoryStats(user.id);
    } catch (err: any) {
      setInventoryError(err.message || 'Failed to get inventory stats');
      throw err;
    }
  }, [user]);

  const archiveProduct = useCallback(async (productId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setInventoryError(null);
      setInventoryLoading(true);
      
      const archivedProduct = await inventoryService.archiveProduct(user.id, productId);
      
      // Update local state
      products.updateProduct(productId, { is_available: false });
      
      return archivedProduct;
    } catch (err: any) {
      setInventoryError(err.message || 'Failed to archive product');
      throw err;
    } finally {
      setInventoryLoading(false);
    }
  }, [user, products]);

  const restoreProduct = useCallback(async (productId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setInventoryError(null);
      setInventoryLoading(true);
      
      const restoredProduct = await inventoryService.restoreProduct(user.id, productId);
      
      // Update local state
      products.updateProduct(productId, { is_available: true });
      
      return restoredProduct;
    } catch (err: any) {
      setInventoryError(err.message || 'Failed to restore product');
      throw err;
    } finally {
      setInventoryLoading(false);
    }
  }, [user, products]);

  // Enhanced computed values combining products and inventory
  const inventoryStats = {
    totalProducts: products.productCount,
    availableProducts: products.availableCount,
    unavailableProducts: products.unavailableCount,
    totalValue: products.totalValue,
    availableValue: products.availableValue,
    categories: Object.keys(products.productsByCategory).length,
    conditions: Object.keys(products.productsByCondition),
  };

  const hasLowStock = products.unavailableCount > 0;
  const inventoryHealth = products.productCount > 0 ? (products.availableCount / products.productCount) * 100 : 0;

  return {
    // Product operations (from useProducts)
    products: products.products,
    loading: products.loading || inventoryLoading,
    error: products.error || inventoryError,
    createProduct: products.createProduct,
    updateProduct: products.updateProduct,
    deleteProduct: products.deleteProduct,
    getProductById: products.getProductById,
    searchProducts: products.searchProducts,
    refreshProducts: products.refreshProducts,

    // Inventory-specific operations
    toggleProductAvailability,
    setProductAvailability,
    bulkUpdateAvailability,
    getInventoryStats,
    archiveProduct,
    restoreProduct,

    // Real-time sync (from useInventorySync)
    connectionState: sync.connectionState,
    isConnected: sync.isConnected,
    lastSyncTime: sync.lastSyncTime,
    forceSync: sync.forceSync,

    // Enhanced computed values
    availableProducts: products.availableProducts,
    unavailableProducts: products.unavailableProducts,
    productsByCategory: products.productsByCategory,
    productsByCondition: products.productsByCondition,
    inventoryStats,
    hasLowStock,
    inventoryHealth,
    hasProducts: products.hasProducts,

    // Utility methods
    isProductAvailable: (productId: string) => {
      const product = products.products.find(p => p.id === productId);
      return product?.is_available ?? false;
    },
    
    getProductsByAvailability: (isAvailable: boolean) => {
      return products.products.filter(p => p.is_available === isAvailable);
    },

    getProductsByCategory: (category: string) => {
      return products.products.filter(p => p.category === category);
    },

    getProductsByCondition: (condition: string) => {
      return products.products.filter(p => p.condition === condition);
    },
  };
};
