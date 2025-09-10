import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../user-auth/context/AuthContext';
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

  // Memoize services to prevent recreation on every render
  const paymentService = useMemo(() => {
    return user ? new PaymentService(user.id) : null;
  }, [user?.id]);
  
  const checkoutService = useMemo(() => {
    return paymentService && stripe ? new CheckoutService(paymentService, stripe) : null;
  }, [paymentService, stripe]);

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

  // Payment method management with setup intent flow
  const addPaymentMethodWithSetup = useCallback(async () => {
    if (!paymentService || !stripe) throw new Error('Payment service not available');
    
    try {
      setLoading(true);
      setError(null);
      
      // Create setup intent via Edge Function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_create-setup-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { client_secret } = await response.json();

      // Initialize payment sheet with setup intent
      const { error: initError } = await stripe.initPaymentSheet({
        setupIntentClientSecret: client_secret,
        merchantDisplayName: 'Payment Agent',
        style: 'alwaysDark',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present payment sheet
      const { error: presentError } = await stripe.presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
        return; // User canceled
      }

      // Payment method collection succeeded - refresh the list
      await fetchPaymentMethods();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [paymentService, stripe, fetchPaymentMethods]);

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
    addPaymentMethodWithSetup,
    removePaymentMethod,
    setDefaultPaymentMethod,
    fetchPaymentMethods,
    fetchTransactions,

    // Checkout
    expressCheckout,
    selectiveCheckout,
    oneTimeCheckout,
    processCheckout,

    // Low-level intent creation (used by some checkout flows)
    createPaymentIntent: async (options: any) => {
      if (!paymentService) throw new Error('Payment service not available');
      const payload = {
        amount: options.amount,
        description: options.description || options.metadata?.description,
        paymentMethodId: options.paymentMethodId || options.payment_method_id || options.payment_methodId,
        currency: options.currency,
        idempotencyKey: options.idempotencyKey || options.idempotency_key,
      };
      return paymentService.createPaymentIntent(payload);
    },

    // Utils
    clearError: () => setError(null),
  };
};
