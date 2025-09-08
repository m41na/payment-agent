import { useState, useEffect, useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../../../shared/auth/AuthContext';
import { PaymentService } from '../services/PaymentService';
import { CheckoutService } from '../services/CheckoutService';
import { PaymentMethod, Transaction, CheckoutOptions, CheckoutFlow, PaymentResult } from '../types';

export const usePayment = () => {
  const { user } = useAuth();
  const stripe = useStripe();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize services
  const paymentService = user ? new PaymentService(user.id) : null;
  const checkoutService = paymentService && stripe ? new CheckoutService(paymentService, stripe) : null;

  // Data fetching
  const fetchPaymentMethods = useCallback(async () => {
    if (!paymentService) return;
    
    try {
      setLoading(true);
      setError(null);
      const methods = await paymentService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  }, [paymentService]);

  const fetchTransactions = useCallback(async () => {
    if (!paymentService) return;
    
    try {
      setLoading(true);
      setError(null);
      const txns = await paymentService.getTransactions();
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [paymentService, setLoading, setError, setTransactions]);

  // Payment method management
  const addPaymentMethod = useCallback(async (paymentMethodId: string) => {
    if (!paymentService) throw new Error('Payment service not available');
    
    try {
      setLoading(true);
      setError(null);
      await paymentService.addPaymentMethod(paymentMethodId);
      await fetchPaymentMethods(); // Refresh list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [paymentService, fetchPaymentMethods]);

  const removePaymentMethod = useCallback(async (id: string) => {
    if (!paymentService) throw new Error('Payment service not available');
    
    try {
      setLoading(true);
      setError(null);
      await paymentService.removePaymentMethod(id);
      // Real-time subscription will update the list automatically
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [paymentService]);

  const setDefaultPaymentMethod = useCallback(async (id: string) => {
    if (!paymentService) throw new Error('Payment service not available');
    
    try {
      setLoading(true);
      setError(null);
      await paymentService.setDefaultPaymentMethod(id);
      // Real-time subscription will update the list automatically
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [paymentService]);

  // Checkout flows
  const processCheckout = useCallback(async (flow: CheckoutFlow, options: CheckoutOptions): Promise<PaymentResult> => {
    if (!checkoutService) throw new Error('Checkout service not available');
    
    try {
      setLoading(true);
      setError(null);
      const result = await checkoutService.processCheckout(flow, options);
      
      if (result.success) {
        await fetchTransactions(); // Refresh transactions
      } else {
        setError(result.error || 'Checkout failed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [checkoutService, fetchTransactions]);

  // Convenience methods for specific checkout flows
  const expressCheckout = useCallback((amount: number, description?: string) => {
    return processCheckout('express', { amount, description });
  }, [processCheckout]);

  const selectiveCheckout = useCallback((amount: number, paymentMethodId: string, description?: string) => {
    return processCheckout('selective', { amount, paymentMethodId, description });
  }, [processCheckout]);

  const oneTimeCheckout = useCallback((amount: number, description?: string) => {
    return processCheckout('one-time', { amount, description });
  }, [processCheckout]);

  // Initial data load
  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
      fetchTransactions();
    } else {
      setPaymentMethods([]);
      setTransactions([]);
    }
  }, [user, fetchPaymentMethods, fetchTransactions]);

  // Computed values
  const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default) || paymentMethods[0] || null;
  const hasPaymentMethods = paymentMethods.length > 0;

  return {
    // Data
    paymentMethods,
    transactions,
    defaultPaymentMethod,
    hasPaymentMethods,
    
    // State
    loading,
    error,
    
    // Actions
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    fetchPaymentMethods,
    fetchTransactions,
    
    // Checkout
    expressCheckout,
    selectiveCheckout,
    oneTimeCheckout,
    processCheckout,
    
    // Utils
    clearError: () => setError(null),
  };
};
