// Public API for Checkout feature
export { useCheckout } from './hooks/useCheckout';
export { OrderService } from './services/OrderService';
export { CheckoutScreen } from './components/CheckoutScreen';

// Types
export type {
  Order,
  OrderItem,
  CheckoutSummary,
  PaymentOption,
  OrderError,
  CheckoutScreenProps,
  OrderSummaryProps,
} from './types';

// Feature configuration
export const CheckoutFeature = {
  name: 'checkout',
  version: '1.0.0',
  dependencies: ['auth', 'shopping-cart', 'payment-processing'],
  exports: {
    hooks: ['useCheckout'],
    services: ['OrderService'],
    components: ['CheckoutScreen'],
    types: ['Order', 'OrderItem', 'CheckoutSummary', 'PaymentOption']
  }
} as const;
