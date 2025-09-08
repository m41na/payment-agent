import { supabase } from '../../../services/supabase';
import { Product, InventoryStatus, InventoryItem, InventoryUpdateResult, InventoryError } from '../types';

export class InventoryService {
  private readonly tableName = 'pg_products';

  async toggleProductAvailability(userId: string, productId: string): Promise<Product> {
    try {
      // First get the current product
      const { data: currentProduct, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', productId)
        .eq('seller_id', userId)
        .single();

      if (fetchError) {
        throw this.createError('NETWORK_ERROR', fetchError.message);
      }

      if (!currentProduct) {
        throw this.createError('NOT_FOUND', 'Product not found or access denied');
      }

      // Toggle availability
      const newAvailability = !currentProduct.is_available;

      const { data: updatedProduct, error: updateError } = await supabase
        .from(this.tableName)
        .update({ is_available: newAvailability })
        .eq('id', productId)
        .eq('seller_id', userId)
        .select()
        .single();

      if (updateError) {
        throw this.createError('NETWORK_ERROR', updateError.message);
      }

      return updatedProduct;
    } catch (error: any) {
      console.error('Error toggling product availability:', error);
      if (error instanceof Error && error.message.includes('VALIDATION_ERROR')) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async setProductAvailability(userId: string, productId: string, isAvailable: boolean): Promise<Product> {
    try {
      const { data: updatedProduct, error } = await supabase
        .from(this.tableName)
        .update({ is_available: isAvailable })
        .eq('id', productId)
        .eq('seller_id', userId)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      if (!updatedProduct) {
        throw this.createError('NOT_FOUND', 'Product not found or access denied');
      }

      return updatedProduct;
    } catch (error: any) {
      console.error('Error setting product availability:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async bulkUpdateAvailability(userId: string, productIds: string[], isAvailable: boolean): Promise<InventoryUpdateResult> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ is_available: isAvailable })
        .eq('seller_id', userId)
        .in('id', productIds)
        .select('id');

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return {
        success: true,
        updated_count: data?.length || 0,
      };
    } catch (error: any) {
      console.error('Error bulk updating availability:', error);
      return {
        success: false,
        updated_count: 0,
        error: error.message,
      };
    }
  }

  async getInventoryStats(userId: string): Promise<{
    total_products: number;
    available_products: number;
    unavailable_products: number;
    total_value: number;
    available_value: number;
  }> {
    try {
      const { data: products, error } = await supabase
        .from(this.tableName)
        .select('price, is_available')
        .eq('seller_id', userId);

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      const stats = products?.reduce(
        (acc, product) => {
          acc.total_products += 1;
          acc.total_value += product.price;

          if (product.is_available) {
            acc.available_products += 1;
            acc.available_value += product.price;
          } else {
            acc.unavailable_products += 1;
          }

          return acc;
        },
        {
          total_products: 0,
          available_products: 0,
          unavailable_products: 0,
          total_value: 0,
          available_value: 0,
        }
      ) || {
        total_products: 0,
        available_products: 0,
        unavailable_products: 0,
        total_value: 0,
        available_value: 0,
      };

      return stats;
    } catch (error: any) {
      console.error('Error getting inventory stats:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async getProductsByAvailability(userId: string, isAvailable: boolean): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('seller_id', userId)
        .eq('is_available', isAvailable)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching products by availability:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async archiveProduct(userId: string, productId: string): Promise<Product> {
    try {
      // Set product as unavailable (archived)
      const archivedProduct = await this.setProductAvailability(userId, productId, false);
      
      // Could add additional archiving logic here (e.g., move to archive table)
      
      return archivedProduct;
    } catch (error: any) {
      console.error('Error archiving product:', error);
      throw error;
    }
  }

  async restoreProduct(userId: string, productId: string): Promise<Product> {
    try {
      // Set product as available (restore from archive)
      const restoredProduct = await this.setProductAvailability(userId, productId, true);
      
      return restoredProduct;
    } catch (error: any) {
      console.error('Error restoring product:', error);
      throw error;
    }
  }

  async getLowStockProducts(userId: string, threshold: number = 1): Promise<Product[]> {
    try {
      // For now, this returns unavailable products as "low stock"
      // In a real inventory system, this would check quantity levels
      return await this.getProductsByAvailability(userId, false);
    } catch (error: any) {
      console.error('Error getting low stock products:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  private createError(code: InventoryError['code'], message: string, productId?: string): InventoryError {
    return {
      code,
      message,
      product_id: productId,
    };
  }
}
