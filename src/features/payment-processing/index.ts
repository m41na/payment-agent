// Public API for Payment Processing feature
export { usePayment } from './hooks/usePayment';
export { useSubscription } from './hooks/useSubscription';
export { useTransactionHistory } from './hooks/useTransactionHistory';
export { PaymentService } from './services/PaymentService';
export { CheckoutService } from './services/CheckoutService';
export { SubscriptionService } from './services/SubscriptionService';
export { TransactionHistoryService } from './services/TransactionHistoryService';
export { default as PaymentMethodsContainer } from './containers/PaymentMethodsContainer';

// Types
export type {
  PaymentMethod,
  Transaction,
  CheckoutOptions,
  CheckoutFlow,
  PaymentResult,
  PaymentError,
  SubscriptionPlan,
  UserSubscription,
  SubscriptionError,
  TransactionHistory,
  TransactionError,
  PaymentMethodsScreenProps,
} from './types';

// Feature configuration
export const PaymentProcessingFeature = {
  name: 'payment-processing',
  version: '1.0.0',
  dependencies: ['auth', 'data'],
  exports: {
    hooks: ['usePayment', 'useSubscription', 'useTransactionHistory'],
    services: ['PaymentService', 'CheckoutService', 'SubscriptionService', 'TransactionHistoryService'],
    types: ['PaymentMethod', 'Transaction', 'CheckoutOptions', 'PaymentResult', 'SubscriptionPlan', 'UserSubscription', 'TransactionHistory']
  }
} as const;
