import { supabase } from '../../../shared/data/supabase';
import {
  Cart,
  CartItem,
  AddToCartData,
  UpdateCartItemData,
  CartOperationResult,
  CartError,
  CartSummary,
  MerchantCartGroup,
  CART_ITEM_LIMIT,
} from '../types';

export class CartService {
  /**
   * Add item to cart
   */
  async addToCart(userId: string, itemData: AddToCartData): Promise<CartOperationResult> {
    try {
      // Validate input
      this.validateAddToCartData(itemData);

      // Check if item already exists in cart
      const existingItem = await this.getCartItem(userId, itemData.product_id);
      
      if (existingItem) {
        // Update quantity if item exists
        return await this.updateCartItem(
          userId, 
          existingItem.id, 
          { quantity: existingItem.quantity + itemData.quantity }
        );
      }

      // Check cart item limit
      const currentItemCount = await this.getCartItemCount(userId);
      if (currentItemCount >= CART_ITEM_LIMIT) {
        throw this.createError('CART_LIMIT_EXCEEDED', `Cart cannot exceed ${CART_ITEM_LIMIT} items`);
      }

      // Create new cart item
      const cartItemData = {
        user_id: userId,
        product_id: itemData.product_id,
        seller_id: itemData.seller_id,
        title: itemData.title,
        description: itemData.description,
        price: itemData.price,
        quantity: itemData.quantity,
        image_url: itemData.image_url,
        merchant_name: itemData.merchant_name,
        product_condition: itemData.product_condition,
        availability_status: 'available' as const,
        added_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: cartItem, error } = await supabase
        .from('pg_cart_items')
        .insert(cartItemData)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      const cart = await this.getUserCart(userId);
      return {
        success: true,
        cart,
      };
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Update cart item
   */
  async updateCartItem(
    userId: string, 
    itemId: string, 
    updates: UpdateCartItemData
  ): Promise<CartOperationResult> {
    try {
      // Validate quantity if provided
      if (updates.quantity !== undefined) {
        if (updates.quantity < 0) {
          throw this.createError('INVALID_QUANTITY', 'Quantity cannot be negative');
        }
        if (updates.quantity === 0) {
          return await this.removeFromCart(userId, itemId);
        }
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data: cartItem, error } = await supabase
        .from('pg_cart_items')
        .update(updateData)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      if (!cartItem) {
        throw this.createError('ITEM_NOT_FOUND', 'Cart item not found');
      }

      const cart = await this.getUserCart(userId);
      return {
        success: true,
        cart,
      };
    } catch (error: any) {
      console.error('Error updating cart item:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, itemId: string): Promise<CartOperationResult> {
    try {
      const { error } = await supabase
        .from('pg_cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      const cart = await this.getUserCart(userId);
      return {
        success: true,
        cart,
      };
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<CartOperationResult> {
    try {
      const { error } = await supabase
        .from('pg_cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      const cart = await this.getUserCart(userId);
      return {
        success: true,
        cart,
      };
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Get user's cart
   */
  async getUserCart(userId: string): Promise<Cart> {
    try {
      const { data: cartItems, error } = await supabase
        .from('pg_cart_items')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const items = cartItems || [];
      const summary = this.calculateCartSummary(items);

      return {
        id: `cart_${userId}`,
        user_id: userId,
        items,
        total_items: summary.total_items,
        subtotal: summary.subtotal,
        total_amount: summary.estimated_total,
        currency: summary.currency,
        created_at: items.length > 0 ? items[items.length - 1].added_at : new Date().toISOString(),
        updated_at: items.length > 0 ? items[0].updated_at : new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching cart:', error);
      // Return empty cart on error
      return {
        id: `cart_${userId}`,
        user_id: userId,
        items: [],
        total_items: 0,
        subtotal: 0,
        total_amount: 0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Get specific cart item
   */
  async getCartItem(userId: string, productId: string): Promise<CartItem | null> {
    try {
      const { data: cartItem, error } = await supabase
        .from('pg_cart_items')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching cart item:', error);
        return null;
      }

      return cartItem || null;
    } catch (error) {
      console.error('Error fetching cart item:', error);
      return null;
    }
  }

  /**
   * Get cart item count
   */
  async getCartItemCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('pg_cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting cart item count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting cart item count:', error);
      return 0;
    }
  }

  /**
   * Calculate cart summary
   */
  calculateCartSummary(items: CartItem[]): CartSummary {
    const total_items = items.reduce((sum, item) => sum + item.quantity, 0);
    const unique_products = items.length;
    const unique_merchants = new Set(items.map(item => item.seller_id)).size;
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Basic tax and shipping estimation (can be enhanced)
    const estimated_tax = subtotal * 0.08; // 8% tax rate
    const estimated_shipping = unique_merchants * 5.99; // $5.99 per merchant
    const estimated_total = subtotal + estimated_tax + estimated_shipping;

    return {
      total_items,
      unique_products,
      unique_merchants,
      subtotal,
      estimated_tax,
      estimated_shipping,
      estimated_total,
      currency: 'USD',
    };
  }

  /**
   * Group cart items by merchant
   */
  groupItemsByMerchant(items: CartItem[]): MerchantCartGroup[] {
    const merchantGroups = new Map<string, MerchantCartGroup>();

    items.forEach(item => {
      if (!merchantGroups.has(item.seller_id)) {
        merchantGroups.set(item.seller_id, {
          seller_id: item.seller_id,
          merchant_name: item.merchant_name,
          items: [],
          subtotal: 0,
          item_count: 0,
        });
      }

      const group = merchantGroups.get(item.seller_id)!;
      group.items.push(item);
      group.subtotal += item.price * item.quantity;
      group.item_count += item.quantity;
    });

    return Array.from(merchantGroups.values());
  }

  /**
   * Validate add to cart data
   */
  private validateAddToCartData(data: AddToCartData): void {
    if (!data.product_id) {
      throw this.createError('INVALID_QUANTITY', 'Product ID is required');
    }
    if (!data.seller_id) {
      throw this.createError('INVALID_QUANTITY', 'Seller ID is required');
    }
    if (!data.title) {
      throw this.createError('INVALID_QUANTITY', 'Product title is required');
    }
    if (data.price < 0) {
      throw this.createError('INVALID_QUANTITY', 'Price cannot be negative');
    }
    if (data.quantity <= 0) {
      throw this.createError('INVALID_QUANTITY', 'Quantity must be greater than 0');
    }
    if (data.quantity > 99) {
      throw this.createError('INVALID_QUANTITY', 'Quantity cannot exceed 99 per item');
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    code: CartError['code'],
    message: string,
    details?: Record<string, any>
  ): CartError {
    return {
      code,
      message,
      details,
    };
  }
}
