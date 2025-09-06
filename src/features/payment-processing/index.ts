// Public API for Payment Processing feature
export { usePayment } from './hooks/usePayment';
export { PaymentService } from './services/PaymentService';
export { CheckoutService } from './services/CheckoutService';

// Types
export type {
  PaymentMethod,
  Transaction,
  CheckoutOptions,
  CheckoutFlow,
  PaymentResult,
  PaymentError
} from './types';

// Feature configuration
export const PaymentProcessingFeature = {
  name: 'payment-processing',
  version: '1.0.0',
  dependencies: ['auth', 'data'],
  exports: {
    hooks: ['usePayment'],
    services: ['PaymentService', 'CheckoutService'],
    types: ['PaymentMethod', 'Transaction', 'CheckoutOptions', 'PaymentResult']
  }
} as const;
