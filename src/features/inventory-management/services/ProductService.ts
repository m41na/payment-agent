import { supabase } from '../../../shared/data/supabase';
import { Product, CreateProductData, UpdateProductData, ProductFilters, ProductSearchResult, InventoryError } from '../types';

export class ProductService {
  private readonly tableName = 'pg_products';

  async fetchUserProducts(userId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching user products:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async createProduct(userId: string, productData: CreateProductData): Promise<Product> {
    try {
      // Validate product data
      this.validateProductData(productData);

      const newProductData = {
        ...productData,
        seller_id: userId,
        images: productData.images || [],
        tags: productData.tags || [],
        is_available: true,
      };

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([newProductData])
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating product:', error);
      if (error instanceof Error && error.message.includes('VALIDATION_ERROR')) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async updateProduct(userId: string, productId: string, updates: UpdateProductData): Promise<Product> {
    try {
      // Validate updates
      this.validateProductUpdates(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', productId)
        .eq('seller_id', userId)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      if (!data) {
        throw this.createError('NOT_FOUND', 'Product not found or access denied');
      }

      return data;
    } catch (error: any) {
      console.error('Error updating product:', error);
      if (error instanceof Error && error.message.includes('VALIDATION_ERROR')) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async deleteProduct(userId: string, productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', productId)
        .eq('seller_id', userId);

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async getProductById(productId: string): Promise<Product | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', productId)
        .single();

      if (error && error.code !== 'PGRST116') { // No rows returned
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data || null;
    } catch (error: any) {
      console.error('Error fetching product by ID:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async searchProducts(filters: ProductFilters, limit: number = 50, offset: number = 0): Promise<ProductSearchResult> {
    try {
      let query = supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.condition && filters.condition.length > 0) {
        query = query.in('condition', filters.condition);
      }

      if (filters.price_range) {
        if (filters.price_range.min !== undefined) {
          query = query.gte('price', filters.price_range.min);
        }
        if (filters.price_range.max !== undefined) {
          query = query.lte('price', filters.price_range.max);
        }
      }

      if (filters.availability !== undefined) {
        query = query.eq('is_available', filters.availability);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return {
        products: data || [],
        total_count: count || 0,
        has_more: (count || 0) > offset + limit,
      };
    } catch (error: any) {
      console.error('Error searching products:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  private validateProductData(data: CreateProductData): void {
    if (!data.title || data.title.trim().length < 3) {
      throw this.createError('VALIDATION_ERROR', 'Product title must be at least 3 characters', 'title');
    }

    if (data.title.length > 100) {
      throw this.createError('VALIDATION_ERROR', 'Product title must be less than 100 characters', 'title');
    }

    if (data.price <= 0) {
      throw this.createError('VALIDATION_ERROR', 'Product price must be greater than 0', 'price');
    }

    if (data.price > 1000000) {
      throw this.createError('VALIDATION_ERROR', 'Product price must be less than $1,000,000', 'price');
    }

    if (data.description && data.description.length > 1000) {
      throw this.createError('VALIDATION_ERROR', 'Product description must be less than 1000 characters', 'description');
    }

    if (!this.isValidLocation(data.latitude, data.longitude)) {
      throw this.createError('LOCATION_ERROR', 'Invalid location coordinates');
    }

    if (data.images && data.images.length > 10) {
      throw this.createError('VALIDATION_ERROR', 'Maximum 10 images allowed', 'images');
    }

    if (data.tags && data.tags.length > 20) {
      throw this.createError('VALIDATION_ERROR', 'Maximum 20 tags allowed', 'tags');
    }
  }

  private validateProductUpdates(updates: UpdateProductData): void {
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length < 3) {
        throw this.createError('VALIDATION_ERROR', 'Product title must be at least 3 characters', 'title');
      }
      if (updates.title.length > 100) {
        throw this.createError('VALIDATION_ERROR', 'Product title must be less than 100 characters', 'title');
      }
    }

    if (updates.price !== undefined) {
      if (updates.price <= 0) {
        throw this.createError('VALIDATION_ERROR', 'Product price must be greater than 0', 'price');
      }
      if (updates.price > 1000000) {
        throw this.createError('VALIDATION_ERROR', 'Product price must be less than $1,000,000', 'price');
      }
    }

    if (updates.description !== undefined && updates.description && updates.description.length > 1000) {
      throw this.createError('VALIDATION_ERROR', 'Product description must be less than 1000 characters', 'description');
    }

    if (updates.latitude !== undefined && updates.longitude !== undefined) {
      if (!this.isValidLocation(updates.latitude, updates.longitude)) {
        throw this.createError('LOCATION_ERROR', 'Invalid location coordinates');
      }
    }

    if (updates.images && updates.images.length > 10) {
      throw this.createError('VALIDATION_ERROR', 'Maximum 10 images allowed', 'images');
    }

    if (updates.tags && updates.tags.length > 20) {
      throw this.createError('VALIDATION_ERROR', 'Maximum 20 tags allowed', 'tags');
    }
  }

  private isValidLocation(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  private createError(code: InventoryError['code'], message: string, field?: string): InventoryError {
    return {
      code,
      message,
      field,
    };
  }
}
