import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cart, CartItem, CART_STORAGE_KEY } from '../types';

export class CartPersistenceService {
  /**
   * Save cart to local storage
   */
  static async saveCart(userId: string, cart: Cart): Promise<void> {
    try {
      const cartKey = `${CART_STORAGE_KEY}_${userId}`;
      const cartData = {
        ...cart,
        cached_at: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(cartKey, JSON.stringify(cartData));
      console.log('💾 Cart saved to local storage for user:', userId);
    } catch (error) {
      console.error('Failed to save cart to storage:', error);
    }
  }

  /**
   * Load cart from local storage
   */
  static async loadCart(userId: string): Promise<Cart | null> {
    try {
      const cartKey = `${CART_STORAGE_KEY}_${userId}`;
      const cartJson = await AsyncStorage.getItem(cartKey);
      
      if (!cartJson) {
        return null;
      }

      const cartData = JSON.parse(cartJson);
      
      // Check if cached cart is not too old (24 hours)
      const cachedAt = new Date(cartData.cached_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        console.log('🗑️ Cached cart is too old, removing...');
        await this.clearCart(userId);
        return null;
      }

      console.log('📱 Cart loaded from local storage for user:', userId);
      return cartData;
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
      return null;
    }
  }

  /**
   * Clear cart from local storage
   */
  static async clearCart(userId: string): Promise<void> {
    try {
      const cartKey = `${CART_STORAGE_KEY}_${userId}`;
      await AsyncStorage.removeItem(cartKey);
      console.log('🗑️ Cart cleared from local storage for user:', userId);
    } catch (error) {
      console.error('Failed to clear cart from storage:', error);
    }
  }

  /**
   * Save individual cart item for offline support
   */
  static async saveCartItem(userId: string, item: CartItem): Promise<void> {
    try {
      const itemKey = `${CART_STORAGE_KEY}_item_${userId}_${item.id}`;
      const itemData = {
        ...item,
        cached_at: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(itemKey, JSON.stringify(itemData));
      console.log('💾 Cart item saved to local storage:', item.id);
    } catch (error) {
      console.error('Failed to save cart item to storage:', error);
    }
  }

  /**
   * Load all cached cart items for a user
   */
  static async loadCartItems(userId: string): Promise<CartItem[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const itemKeys = keys.filter(key => key.startsWith(`${CART_STORAGE_KEY}_item_${userId}_`));
      
      if (itemKeys.length === 0) {
        return [];
      }

      const items: CartItem[] = [];
      const itemsData = await AsyncStorage.multiGet(itemKeys);
      
      for (const [key, value] of itemsData) {
        if (value) {
          try {
            const itemData = JSON.parse(value);
            
            // Check if cached item is not too old (24 hours)
            const cachedAt = new Date(itemData.cached_at);
            const now = new Date();
            const hoursDiff = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff <= 24) {
              items.push(itemData);
            } else {
              // Remove old cached item
              await AsyncStorage.removeItem(key);
            }
          } catch (parseError) {
            console.error('Failed to parse cached cart item:', parseError);
            await AsyncStorage.removeItem(key);
          }
        }
      }

      console.log(`📱 Loaded ${items.length} cart items from local storage`);
      return items;
    } catch (error) {
      console.error('Failed to load cart items from storage:', error);
      return [];
    }
  }

  /**
   * Remove specific cart item from local storage
   */
  static async removeCartItem(userId: string, itemId: string): Promise<void> {
    try {
      const itemKey = `${CART_STORAGE_KEY}_item_${userId}_${itemId}`;
      await AsyncStorage.removeItem(itemKey);
      console.log('🗑️ Cart item removed from local storage:', itemId);
    } catch (error) {
      console.error('Failed to remove cart item from storage:', error);
    }
  }

  /**
   * Clear all cart items for a user
   */
  static async clearAllCartItems(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const itemKeys = keys.filter(key => key.startsWith(`${CART_STORAGE_KEY}_item_${userId}_`));
      
      if (itemKeys.length > 0) {
        await AsyncStorage.multiRemove(itemKeys);
        console.log(`🗑️ Cleared ${itemKeys.length} cart items from local storage`);
      }
    } catch (error) {
      console.error('Failed to clear cart items from storage:', error);
    }
  }

  /**
   * Sync local cart with server cart
   */
  static async syncCart(userId: string, serverCart: Cart, localCart: Cart | null): Promise<Cart> {
    try {
      if (!localCart) {
        // No local cart, save server cart
        await this.saveCart(userId, serverCart);
        return serverCart;
      }

      // Compare timestamps to determine which is more recent
      const serverUpdated = new Date(serverCart.updated_at);
      const localUpdated = new Date(localCart.updated_at);

      if (serverUpdated >= localUpdated) {
        // Server cart is more recent, use it
        await this.saveCart(userId, serverCart);
        return serverCart;
      } else {
        // Local cart is more recent, this shouldn't happen often
        // but we'll still use server cart for consistency
        console.log('⚠️ Local cart appears newer than server cart, using server cart');
        await this.saveCart(userId, serverCart);
        return serverCart;
      }
    } catch (error) {
      console.error('Failed to sync cart:', error);
      return serverCart;
    }
  }

  /**
   * Get cart storage info for debugging
   */
  static async getStorageInfo(userId: string): Promise<{
    hasCart: boolean;
    itemCount: number;
    totalSize: number;
  }> {
    try {
      const cartKey = `${CART_STORAGE_KEY}_${userId}`;
      const cartData = await AsyncStorage.getItem(cartKey);
      
      const keys = await AsyncStorage.getAllKeys();
      const itemKeys = keys.filter(key => key.startsWith(`${CART_STORAGE_KEY}_item_${userId}_`));
      
      let totalSize = 0;
      if (cartData) {
        totalSize += cartData.length;
      }
      
      for (const key of itemKeys) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      }

      return {
        hasCart: !!cartData,
        itemCount: itemKeys.length,
        totalSize,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        hasCart: false,
        itemCount: 0,
        totalSize: 0,
      };
    }
  }
}
