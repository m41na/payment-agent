// Export hooks
export { useCart } from './hooks/useCart';
export { useOrders } from './hooks/useOrders';
export { useCartSync } from './hooks/useCartSync';
export { useShoppingCart } from './hooks/useShoppingCart';

// Export services
export { CartService } from './services/CartService';
export { OrderService } from './services/OrderService';
export { CartSyncService } from './services/CartSyncService';

// Export types
export type {
  // Core types
  Cart,
  CartItem,
  Order,
  OrderItem,
  ShippingAddress,
  BillingAddress,
  
  // Enums
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  
  // Operation types
  AddToCartData,
  UpdateCartItemData,
  CreateOrderData,
  
  // Analytics types
  CartSummary,
  MerchantCartGroup,
  OrderFilters,
  OrderSearchResult,
  
  // Error types
  CartError,
  OrderError,
  
  // Result types
  CartOperationResult,
  OrderOperationResult,
  
  // Event types
  CartUpdateEvent,
  OrderUpdateEvent,
  CartSubscriptionEvent,
  OrderSubscriptionEvent,
  
  // Hook return types
  UseCartReturn,
  UseOrdersReturn,
  UseCartSyncReturn,
  UseShoppingCartReturn,
} from './types';

// Export constants
export {
  CART_ITEM_LIMIT,
  CART_STORAGE_KEY,
  ORDER_STORAGE_KEY,
} from './types';

// Feature metadata
export const SHOPPING_CART_FEATURE = {
  name: 'Shopping Cart & Orders',
  version: '1.0.0',
  description: 'Complete shopping cart and order management system with real-time synchronization',
  
  // Feature capabilities
  capabilities: [
    'cart_management',
    'order_creation',
    'order_tracking',
    'real_time_sync',
    'multi_merchant_support',
    'order_history',
    'cart_persistence',
    'offline_support',
  ],
  
  // Dependencies
  dependencies: [
    '@supabase/supabase-js',
    '@react-native-async-storage/async-storage',
    'react',
  ],
  
  // Database tables
  tables: [
    'pg_cart_items',
    'pg_orders',
    'pg_order_items',
  ],
  
  // Real-time channels
  channels: [
    'cart_updates_{userId}',
    'order_updates_{userId}',
  ],
} as const;
