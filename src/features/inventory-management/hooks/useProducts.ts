import { useState, useEffect, useCallback } from 'react';
import { ProductService } from '../services/ProductService';
import { Product, CreateProductData, UpdateProductData, ProductFilters, ProductSearchResult, InventoryError } from '../types';
import { useAuth } from '../../../contexts/AuthContext';

const productService = new ProductService();

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userProducts = await productService.fetchUserProducts(user.id);
      setProducts(userProducts);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(async (productData: CreateProductData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const newProduct = await productService.createProduct(user.id, productData);
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
      throw err;
    }
  }, [user]);

  const updateProduct = useCallback(async (productId: string, updates: UpdateProductData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const updatedProduct = await productService.updateProduct(user.id, productId, updates);
      setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
      return updatedProduct;
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      throw err;
    }
  }, [user]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      await productService.deleteProduct(user.id, productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
      throw err;
    }
  }, [user]);

  const getProductById = useCallback(async (productId: string) => {
    try {
      setError(null);
      return await productService.getProductById(productId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch product');
      throw err;
    }
  }, []);

  const searchProducts = useCallback(async (filters: ProductFilters, limit?: number, offset?: number) => {
    try {
      setError(null);
      return await productService.searchProducts(filters, limit, offset);
    } catch (err: any) {
      setError(err.message || 'Failed to search products');
      throw err;
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  // Computed values
  const availableProducts = products.filter(p => p.is_available);
  const unavailableProducts = products.filter(p => !p.is_available);
  const totalValue = products.reduce((sum, p) => sum + p.price, 0);
  const availableValue = availableProducts.reduce((sum, p) => sum + p.price, 0);
  
  const productsByCategory = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const productsByCondition = products.reduce((acc, product) => {
    if (!acc[product.condition]) acc[product.condition] = [];
    acc[product.condition].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return {
    // State
    products,
    loading,
    error,
    
    // Actions
    createProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    searchProducts,
    refreshProducts,
    
    // Computed values
    availableProducts,
    unavailableProducts,
    totalValue,
    availableValue,
    productsByCategory,
    productsByCondition,
    hasProducts: products.length > 0,
    productCount: products.length,
    availableCount: availableProducts.length,
    unavailableCount: unavailableProducts.length,
  };
};
