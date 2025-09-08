import { useCallback } from 'react';
import { useCart } from './useCart';
import { useOrders } from './useOrders';
import {
  Cart,
  CartItem,
  Order,
  AddToCartData,
  CreateOrderData,
  CartError,
  OrderError,
  CartSummary,
  MerchantCartGroup,
  OrderStatus,
} from '../types';

export interface UseShoppingCartReturn {
  // Cart state
  cart: Cart | null;
  cartSummary: CartSummary | null;
  merchantGroups: MerchantCartGroup[];
  isEmpty: boolean;
  itemCount: number;
  isCartLoading: boolean;
  cartError: CartError | null;
  
  // Orders state
  orders: Order[];
  currentOrder: Order | null;
  isOrdersLoading: boolean;
  isCreatingOrder: boolean;
  ordersError: OrderError | null;
  totalSpent: number;
  
  // Cart actions
  addToCart: (itemData: AddToCartData) => Promise<boolean>;
  updateCartItem: (itemId: string, updates: { quantity?: number }) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  
  // Order actions
  createOrder: (orderData: CreateOrderData) => Promise<Order | null>;
  getOrder: (orderId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
  
  // Combined actions
  checkout: (orderData: Omit<CreateOrderData, 'items'>) => Promise<Order | null>;
  addToCartAndCheckout: (itemData: AddToCartData, orderData: Omit<CreateOrderData, 'items'>) => Promise<Order | null>;
  
  // Utilities
  getCartItem: (productId: string) => CartItem | null;
  hasProduct: (productId: string) => boolean;
  getProductQuantity: (productId: string) => number;
  getRecentOrders: (limit?: number) => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  
  // Refresh actions
  refreshCart: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useShoppingCart = (): UseShoppingCartReturn => {
  const {
    cart,
    summary: cartSummary,
    merchantGroups,
    isEmpty,
    itemCount,
    isLoading: isCartLoading,
    error: cartError,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
    getCartItem,
    hasProduct,
    getProductQuantity,
  } = useCart();

  const {
    orders,
    currentOrder,
    isLoading: isOrdersLoading,
    isCreatingOrder,
    error: ordersError,
    createOrder,
    getOrder,
    cancelOrder,
    refreshOrders,
    getRecentOrders,
    getOrdersByStatus,
    getTotalSpent,
  } = useOrders();

  /**
   * Checkout with current cart items
   */
  const checkout = useCallback(async (
    orderData: Omit<CreateOrderData, 'items'>
  ): Promise<Order | null> => {
    if (!cart || cart.items.length === 0) {
      console.warn('Cannot checkout with empty cart');
      return null;
    }

    try {
      const completeOrderData: CreateOrderData = {
        ...orderData,
        items: cart.items,
      };

      const order = await createOrder(completeOrderData);
      
      if (order) {
        // Clear cart after successful order creation
        await clearCart();
      }
      
      return order;
    } catch (error) {
      console.error('Error during checkout:', error);
      return null;
    }
  }, [cart, createOrder, clearCart]);

  /**
   * Add item to cart and immediately checkout
   */
  const addToCartAndCheckout = useCallback(async (
    itemData: AddToCartData,
    orderData: Omit<CreateOrderData, 'items'>
  ): Promise<Order | null> => {
    try {
      // Add item to cart
      const addSuccess = await addToCart(itemData);
      if (!addSuccess) {
        console.error('Failed to add item to cart');
        return null;
      }

      // Wait a moment for cart to update
      await new Promise(resolve => setTimeout(resolve, 100));

      // Checkout with updated cart
      return await checkout(orderData);
    } catch (error) {
      console.error('Error during add to cart and checkout:', error);
      return null;
    }
  }, [addToCart, checkout]);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async (): Promise<void> => {
    await Promise.all([
      refreshCart(),
      refreshOrders(),
    ]);
  }, [refreshCart, refreshOrders]);

  const totalSpent = getTotalSpent();

  return {
    // Cart state
    cart,
    cartSummary,
    merchantGroups,
    isEmpty,
    itemCount,
    isCartLoading,
    cartError,
    
    // Orders state
    orders,
    currentOrder,
    isOrdersLoading,
    isCreatingOrder,
    ordersError,
    totalSpent,
    
    // Cart actions
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    
    // Order actions
    createOrder,
    getOrder,
    cancelOrder,
    
    // Combined actions
    checkout,
    addToCartAndCheckout,
    
    // Utilities
    getCartItem,
    hasProduct,
    getProductQuantity,
    getRecentOrders,
    getOrdersByStatus,
    
    // Refresh actions
    refreshCart,
    refreshOrders,
    refreshAll,
  };
};
