import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../user-auth/context/AuthContext';
import { CartService } from '../services/CartService';
import {
  Cart,
  CartItem,
  AddToCartData,
  UpdateCartItemData,
  CartError,
  CartSummary,
  MerchantCartGroup,
} from '../types';

export interface UseCartReturn {
  // State
  cart: Cart | null;
  isLoading: boolean;
  error: CartError | null;
  
  // Computed values
  summary: CartSummary | null;
  merchantGroups: MerchantCartGroup[];
  isEmpty: boolean;
  itemCount: number;
  
  // Actions
  addToCart: (itemData: AddToCartData) => Promise<boolean>;
  updateCartItem: (itemId: string, updates: UpdateCartItemData) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
  
  // Utilities
  getCartItem: (productId: string) => CartItem | null;
  hasProduct: (productId: string) => boolean;
  getProductQuantity: (productId: string) => number;
}

const cartService = new CartService();

export const useCart = (): UseCartReturn => {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CartError | null>(null);

  /**
   * Load user's cart
   */
  const loadCart = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const userCart = await cartService.getUserCart(user.id);
      setCart(userCart);
    } catch (err) {
      console.error('Error loading cart:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to load cart',
        details: { error: err },
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Add item to cart
   */
  const addToCart = useCallback(async (itemData: AddToCartData): Promise<boolean> => {
    if (!user?.id) {
      setError({
        code: 'AUTHENTICATION_ERROR',
        message: 'User must be authenticated to add items to cart',
      });
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await cartService.addToCart(user.id, itemData);
      
      if (result.success && result.cart) {
        setCart(result.cart);
        return true;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to add item to cart',
        });
        return false;
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to add item to cart',
        details: { error: err },
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Update cart item
   */
  const updateCartItem = useCallback(async (
    itemId: string, 
    updates: UpdateCartItemData
  ): Promise<boolean> => {
    if (!user?.id) {
      setError({
        code: 'AUTHENTICATION_ERROR',
        message: 'User must be authenticated to update cart items',
      });
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await cartService.updateCartItem(user.id, itemId, updates);
      
      if (result.success && result.cart) {
        setCart(result.cart);
        return true;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to update cart item',
        });
        return false;
      }
    } catch (err) {
      console.error('Error updating cart item:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to update cart item',
        details: { error: err },
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user?.id) {
      setError({
        code: 'AUTHENTICATION_ERROR',
        message: 'User must be authenticated to remove cart items',
      });
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await cartService.removeFromCart(user.id, itemId);
      
      if (result.success && result.cart) {
        setCart(result.cart);
        return true;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to remove cart item',
        });
        return false;
      }
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to remove cart item',
        details: { error: err },
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError({
        code: 'AUTHENTICATION_ERROR',
        message: 'User must be authenticated to clear cart',
      });
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await cartService.clearCart(user.id);
      
      if (result.success && result.cart) {
        setCart(result.cart);
        return true;
      } else {
        setError(result.error || {
          code: 'NETWORK_ERROR',
          message: 'Failed to clear cart',
        });
        return false;
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError({
        code: 'NETWORK_ERROR',
        message: 'Failed to clear cart',
        details: { error: err },
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Refresh cart data
   */
  const refreshCart = useCallback(async (): Promise<void> => {
    await loadCart();
  }, [loadCart]);

  /**
   * Get specific cart item by product ID
   */
  const getCartItem = useCallback((productId: string): CartItem | null => {
    if (!cart?.items) return null;
    return cart.items.find(item => item.product_id === productId) || null;
  }, [cart?.items]);

  /**
   * Check if product is in cart
   */
  const hasProduct = useCallback((productId: string): boolean => {
    return getCartItem(productId) !== null;
  }, [getCartItem]);

  /**
   * Get quantity of specific product in cart
   */
  const getProductQuantity = useCallback((productId: string): number => {
    const item = getCartItem(productId);
    return item?.quantity || 0;
  }, [getCartItem]);

  // Computed values
  const summary: CartSummary | null = cart ? cartService.calculateCartSummary(cart.items) : null;
  
  const merchantGroups: MerchantCartGroup[] = cart ? 
    cartService.groupItemsByMerchant(cart.items) : [];
  
  const isEmpty = !cart || cart.items.length === 0;
  const itemCount = cart?.total_items || 0;

  // Load cart on mount and user change
  useEffect(() => {
    if (user?.id) {
      loadCart();
    } else {
      setCart(null);
      setError(null);
    }
  }, [user?.id, loadCart]);

  return {
    // State
    cart,
    isLoading,
    error,
    
    // Computed values
    summary,
    merchantGroups,
    isEmpty,
    itemCount,
    
    // Actions
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
    
    // Utilities
    getCartItem,
    hasProduct,
    getProductQuantity,
  };
};
