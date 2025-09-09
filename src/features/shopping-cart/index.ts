// Shopping Cart Feature Exports
// Version: 2.1.0 - Added seller transaction management

// Types
export * from './types';

// Hooks
export { useCart } from './hooks/useCart';
export { useOrders } from './hooks/useOrders';
export { useShoppingCart } from './hooks/useShoppingCart';
export { useCheckout } from './hooks/useCheckout';
export { useOrderRealtime } from './hooks/useOrderRealtime';
export { useSellerTransactions } from './hooks/useSellerTransactions';

// Services
export { CartService } from './services/CartService';
export { OrderService } from './services/OrderService';
export { CartPersistenceService } from './services/CartPersistenceService';

// Components
export { default as ShoppingCartScreen } from './components/ShoppingCartScreen';

// Feature Metadata
export const SHOPPING_CART_FEATURE = {
  name: 'Shopping Cart & Orders',
  version: '2.1.0',
  description: 'Complete shopping cart and order management system with real-time synchronization, payment integration, and ka-ching notifications',
  
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
    'payment_integration',
    'express_checkout',
    'realtime_notifications',
    'ka_ching_alerts',
    'seller_transaction_management',
  ],
  
  // Dependencies
  dependencies: [
    '@supabase/supabase-js',
    '@react-native-async-storage/async-storage',
    '@stripe/stripe-react-native',
    'react',
    'react-native',
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
    'seller_transactions_{userId}',
  ],
  
  // Integration points
  integrations: [
    'payment-processing',
    'user-auth',
    'inventory-management',
    'seller-transaction-management',
  ],
} as const;
