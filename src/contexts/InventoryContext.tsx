import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images: string[];
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  tags: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images?: string[];
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  tags?: string[];
}

interface InventoryContextType {
  products: Product[];
  loading: boolean;
  createProduct: (data: CreateProductData) => Promise<Product>;
  updateProduct: (id: string, data: Partial<CreateProductData>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductAvailability: (id: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async (): Promise<void> => {
    if (!user) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pg_products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (data: CreateProductData): Promise<Product> => {
    if (!user) throw new Error('User not authenticated');

    const productData = {
      ...data,
      seller_id: user.id,
      images: data.images || [],
      tags: data.tags || [],
      is_available: true,
    };

    const { data: newProduct, error } = await supabase
      .from('pg_products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;

    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = async (id: string, data: Partial<CreateProductData>): Promise<Product> => {
    if (!user) throw new Error('User not authenticated');

    const { data: updatedProduct, error } = await supabase
      .from('pg_products')
      .update(data)
      .eq('id', id)
      .eq('seller_id', user.id)
      .select()
      .single();

    if (error) throw error;

    setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
    return updatedProduct;
  };

  const deleteProduct = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('pg_products')
      .delete()
      .eq('id', id)
      .eq('seller_id', user.id);

    if (error) throw error;

    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleProductAvailability = async (id: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');

    const product = products.find(p => p.id === id);
    if (!product) throw new Error('Product not found');

    await updateProduct(id, { is_available: !product.is_available });
  };

  const refreshProducts = async (): Promise<void> => {
    await fetchProducts();
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  // Set up realtime subscription for product updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('products_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pg_products',
        filter: `seller_id=eq.${user.id}`,
      }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value: InventoryContextType = {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductAvailability,
    refreshProducts,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
