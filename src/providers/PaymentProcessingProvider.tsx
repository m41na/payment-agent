import React, { createContext, useContext, ReactNode } from 'react';
import { usePayment } from '../features/payment-processing/hooks/usePayment';
import { PaymentProcessingContextType } from '../features/payment-processing/types';
import { ProviderProps } from '../types';

const PaymentProcessingContext = createContext<PaymentProcessingContextType | undefined>(undefined);

/**
 * Payment Processing Provider
 * 
 * Provides payment processing and refund capabilities across the application.
 * Integrates with the Payment Processing feature's hook system to manage
 * payments, refunds, payment methods, and transaction processing.
 */
export const PaymentProcessingProvider: React.FC<ProviderProps> = ({ children }) => {
  const paymentProcessingContext = usePayment();

  return (
    <PaymentProcessingContext.Provider value={paymentProcessingContext}>
      {children}
    </PaymentProcessingContext.Provider>
  );
};

/**
 * Hook to access Payment Processing context
 */
export const usePaymentProcessingContext = (): PaymentProcessingContextType => {
  const context = useContext(PaymentProcessingContext);
  if (!context) {
    throw new Error('usePaymentProcessingContext must be used within a PaymentProcessingProvider');
  }
  return context;
};

export default PaymentProcessingProvider;
