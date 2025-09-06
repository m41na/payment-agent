import { supabase } from '../../../shared/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ProductFavorite,
  ProductFavoriteOperationResult,
  ProductError,
  Product,
  PRODUCT_CONSTANTS,
} from '../types';

export class ProductFavoritesService {
  private static readonly STORAGE_KEYS = {
    CACHED_FAVORITES: '@product_favorites_cache',
    FAVORITE_SYNC_QUEUE: '@product_favorites_sync_queue',
  };

  /**
   * Add product to favorites
   */
  async addToFavorites(productId: string, userId: string): Promise<ProductFavoriteOperationResult> {
    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('pg_product_favorites')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        return {
          success: false,
          error: this.createError('ALREADY_EXISTS', 'Product is already in favorites'),
        };
      }

      // Add to favorites
      const { data: favorite, error } = await supabase
        .from('pg_product_favorites')
        .insert({
          product_id: productId,
          user_id: userId,
          favorited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      // Update product favorite count
      await supabase.rpc('increment_product_favorite_count', {
        product_id: productId,
      });

      // Update local cache
      await this.updateLocalFavoriteCache(userId, productId, true);

      return {
        success: true,
        favorite: this.transformFavoriteData(favorite),
      };
    } catch (error: any) {
      console.error('Error adding to favorites:', error);
      
      // Queue for offline sync
      await this.queueFavoriteOperation({
        type: 'add',
        product_id: productId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Remove product from favorites
   */
  async removeFromFavorites(productId: string, userId: string): Promise<ProductFavoriteOperationResult> {
    try {
      const { data: favorite, error } = await supabase
        .from('pg_product_favorites')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: this.createError('NOT_FOUND', 'Product not in favorites'),
          };
        }
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      // Update product favorite count
      await supabase.rpc('decrement_product_favorite_count', {
        product_id: productId,
      });

      // Update local cache
      await this.updateLocalFavoriteCache(userId, productId, false);

      return {
        success: true,
        favorite: this.transformFavoriteData(favorite),
      };
    } catch (error: any) {
      console.error('Error removing from favorites:', error);
      
      // Queue for offline sync
      await this.queueFavoriteOperation({
        type: 'remove',
        product_id: productId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Toggle product favorite status
   */
  async toggleFavorite(productId: string, userId: string): Promise<ProductFavoriteOperationResult> {
    try {
      const isFavorited = await this.isProductFavorited(productId, userId);
      
      if (isFavorited) {
        return await this.removeFromFavorites(productId, userId);
      } else {
        return await this.addToFavorites(productId, userId);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Check if product is favorited by user
   */
  async isProductFavorited(productId: string, userId: string): Promise<boolean> {
    try {
      // Check local cache first
      const cachedFavorites = await this.getCachedFavorites(userId);
      if (cachedFavorites.includes(productId)) {
        return true;
      }

      // Check database
      const { data: favorite } = await supabase
        .from('pg_product_favorites')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', userId)
        .single();

      return !!favorite;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  }

  /**
   * Get user's favorite products
   */
  async getUserFavorites(
    userId: string,
    limit: number = PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
    offset: number = 0
  ): Promise<Product[]> {
    try {
      const { data: favorites, error } = await supabase
        .from('pg_product_favorites')
        .select(`
          *,
          product:pg_products(
            *,
            seller:pg_profiles!seller_id(
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', userId)
        .order('favorited_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching user favorites:', error);
        return [];
      }

      return (favorites || [])
        .filter(fav => fav.product) // Filter out favorites with deleted products
        .map(fav => this.transformProductData(fav.product));
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      return [];
    }
  }

  /**
   * Get favorite products count for user
   */
  async getUserFavoritesCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pg_product_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching favorites count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error fetching favorites count:', error);
      return 0;
    }
  }

  /**
   * Get multiple products favorite status for user
   */
  async getProductsFavoriteStatus(productIds: string[], userId: string): Promise<Record<string, boolean>> {
    try {
      const { data: favorites, error } = await supabase
        .from('pg_product_favorites')
        .select('product_id')
        .eq('user_id', userId)
        .in('product_id', productIds);

      if (error) {
        console.error('Error fetching favorite statuses:', error);
        return {};
      }

      const favoriteMap: Record<string, boolean> = {};
      productIds.forEach(id => {
        favoriteMap[id] = false;
      });

      (favorites || []).forEach(fav => {
        favoriteMap[fav.product_id] = true;
      });

      return favoriteMap;
    } catch (error) {
      console.error('Error fetching favorite statuses:', error);
      return {};
    }
  }

  /**
   * Clear all favorites for user
   */
  async clearAllFavorites(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pg_product_favorites')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing favorites:', error);
        return false;
      }

      // Clear local cache
      await AsyncStorage.removeItem(`${ProductFavoritesService.STORAGE_KEYS.CACHED_FAVORITES}_${userId}`);

      return true;
    } catch (error) {
      console.error('Error clearing favorites:', error);
      return false;
    }
  }

  /**
   * Sync offline favorite operations
   */
  async syncOfflineFavorites(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(ProductFavoritesService.STORAGE_KEYS.FAVORITE_SYNC_QUEUE);
      if (!queueData) return;

      const queue: Array<{
        type: 'add' | 'remove';
        product_id: string;
        user_id: string;
        timestamp: string;
      }> = JSON.parse(queueData);

      const syncPromises = queue.map(async (operation) => {
        try {
          if (operation.type === 'add') {
            await this.addToFavorites(operation.product_id, operation.user_id);
          } else {
            await this.removeFromFavorites(operation.product_id, operation.user_id);
          }
        } catch (error) {
          console.error('Error syncing favorite operation:', error);
          // Keep failed operations in queue
          return operation;
        }
        return null;
      });

      const results = await Promise.all(syncPromises);
      const failedOperations = results.filter(op => op !== null);

      // Update queue with failed operations
      if (failedOperations.length > 0) {
        await AsyncStorage.setItem(
          ProductFavoritesService.STORAGE_KEYS.FAVORITE_SYNC_QUEUE,
          JSON.stringify(failedOperations)
        );
      } else {
        await AsyncStorage.removeItem(ProductFavoritesService.STORAGE_KEYS.FAVORITE_SYNC_QUEUE);
      }
    } catch (error) {
      console.error('Error syncing offline favorites:', error);
    }
  }

  /**
   * Get cached favorites for user
   */
  private async getCachedFavorites(userId: string): Promise<string[]> {
    try {
      const cacheKey = `${ProductFavoritesService.STORAGE_KEYS.CACHED_FAVORITES}_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      return cachedData ? JSON.parse(cachedData) : [];
    } catch (error) {
      console.error('Error getting cached favorites:', error);
      return [];
    }
  }

  /**
   * Update local favorite cache
   */
  private async updateLocalFavoriteCache(userId: string, productId: string, isFavorited: boolean): Promise<void> {
    try {
      const cacheKey = `${ProductFavoritesService.STORAGE_KEYS.CACHED_FAVORITES}_${userId}`;
      const cachedFavorites = await this.getCachedFavorites(userId);
      
      let updatedFavorites: string[];
      if (isFavorited) {
        updatedFavorites = [...new Set([...cachedFavorites, productId])];
      } else {
        updatedFavorites = cachedFavorites.filter(id => id !== productId);
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedFavorites));
    } catch (error) {
      console.error('Error updating favorite cache:', error);
    }
  }

  /**
   * Queue favorite operation for offline sync
   */
  private async queueFavoriteOperation(operation: {
    type: 'add' | 'remove';
    product_id: string;
    user_id: string;
    timestamp: string;
  }): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(ProductFavoritesService.STORAGE_KEYS.FAVORITE_SYNC_QUEUE);
      const queue = queueData ? JSON.parse(queueData) : [];
      
      // Remove any existing operation for the same product/user combination
      const filteredQueue = queue.filter((op: any) => 
        !(op.product_id === operation.product_id && op.user_id === operation.user_id)
      );
      
      filteredQueue.push(operation);
      
      await AsyncStorage.setItem(
        ProductFavoritesService.STORAGE_KEYS.FAVORITE_SYNC_QUEUE,
        JSON.stringify(filteredQueue)
      );

      // Update local cache optimistically
      await this.updateLocalFavoriteCache(operation.user_id, operation.product_id, operation.type === 'add');
    } catch (error) {
      console.error('Error queuing favorite operation:', error);
    }
  }

  /**
   * Transform raw favorite data from database
   */
  private transformFavoriteData(rawFavorite: any): ProductFavorite {
    return {
      id: rawFavorite.id,
      product_id: rawFavorite.product_id,
      user_id: rawFavorite.user_id,
      favorited_at: rawFavorite.favorited_at,
    };
  }

  /**
   * Transform raw product data from database
   */
  private transformProductData(rawProduct: any): Product {
    return {
      id: rawProduct.id,
      seller_id: rawProduct.seller_id,
      title: rawProduct.title,
      description: rawProduct.description,
      price: rawProduct.price,
      category: rawProduct.category,
      condition: rawProduct.condition,
      images: rawProduct.images || [],
      latitude: rawProduct.latitude,
      longitude: rawProduct.longitude,
      location_name: rawProduct.location_name,
      address: rawProduct.address,
      tags: rawProduct.tags || [],
      is_available: rawProduct.is_available,
      inventory_count: rawProduct.inventory_count,
      created_at: rawProduct.created_at,
      updated_at: rawProduct.updated_at,
      distance: rawProduct.distance,
      view_count: rawProduct.view_count || 0,
      favorite_count: rawProduct.favorite_count || 0,
      seller: rawProduct.seller ? {
        id: rawProduct.seller.id,
        full_name: rawProduct.seller.full_name,
        avatar_url: rawProduct.seller.avatar_url,
        rating: rawProduct.seller.rating,
        total_sales: rawProduct.seller.total_sales,
        member_since: rawProduct.seller.created_at || rawProduct.seller.member_since,
      } : undefined,
    };
  }

  /**
   * Create standardized error
   */
  private createError(
    code: ProductError['code'],
    message: string,
    details?: Record<string, any>
  ): ProductError {
    return {
      code,
      message,
      details,
    };
  }
}
