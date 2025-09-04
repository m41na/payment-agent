import React, { createContext, useContext, useState, useEffect } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface PaymentMethod {
  id: string;
  stripe_payment_method_id: string;
  type: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

interface Transaction {
  id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  created_at: string;
}

interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  
  // Payment method management
  addPaymentMethod: (paymentMethodId: string) => Promise<void>;
  removePaymentMethod: (id: string) => Promise<void>;
  setDefaultPaymentMethod: (id: string) => Promise<void>;
  
  // Payment processing
  processPayment: (amount: number, description?: string, paymentMethodId?: string) => Promise<string>;
  expressCheckout: (amount: number, description?: string) => Promise<string>;
  
  // Data fetching
  fetchPaymentMethods: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet, createPaymentMethod, confirmPaymentIntent } = useStripe();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch payment methods from pg_payment_methods table
  const fetchPaymentMethods = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pg_payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions from pg_transactions table
  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pg_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  // Add payment method to pg_payment_methods table
  const addPaymentMethod = async (paymentMethodId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      // Get payment method details from Stripe
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_get-payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ paymentMethodId }),
      });

      const { paymentMethod } = await response.json();
      
      // Save to pg_payment_methods table
      const { error } = await supabase
        .from('pg_payment_methods')
        .insert({
          user_id: user.id,
          stripe_payment_method_id: paymentMethodId,
          type: paymentMethod.type,
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          exp_month: paymentMethod.card?.exp_month,
          exp_year: paymentMethod.card?.exp_year,
          is_default: paymentMethods.length === 0, // First payment method is default
        });

      if (error) throw error;
      await fetchPaymentMethods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Remove payment method from Stripe (webhook will handle database cleanup)
  const removePaymentMethod = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      // Get the payment method record to find the Stripe payment method ID
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('pg_payment_methods')
        .select('stripe_payment_method_id')
        .eq('id', id)
        .single();

      if (fetchError || !paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Detach payment method from Stripe via Edge Function
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/pg_detach-payment-method`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paymentMethodId: paymentMethod.stripe_payment_method_id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove payment method');
      }

      // Database cleanup will be handled by the payment_method.detached webhook
      // Real-time subscription will update the UI automatically
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Set default payment method in Stripe (webhook will handle database sync)
  const setDefaultPaymentMethod = async (id: string) => {
    if (!user) return;
    
    console.log('Setting default payment method:', id, 'for user:', user.id);
    
    try {
      setLoading(true);
      
      // Get the payment method record to find the Stripe payment method ID
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('pg_payment_methods')
        .select('stripe_payment_method_id')
        .eq('id', id)
        .single();

      if (fetchError || !paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Update default payment method in Stripe via Edge Function
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/pg_set-default-payment-method`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          paymentMethodId: paymentMethod.stripe_payment_method_id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set default payment method');
      }

      console.log('Default payment method updated in Stripe, webhook will sync database');
      
      // Database sync will be handled by the customer.updated webhook
      // Real-time subscription will update the UI automatically
      
    } catch (err) {
      console.error('setDefaultPaymentMethod error:', err);
      setError(err instanceof Error ? err.message : 'Failed to set default payment method');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Process payment and save to pg_transactions table
  const processPayment = async (amount: number, description?: string, paymentMethodId?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      console.log('Creating payment intent...', { amount, description, paymentMethodId });
      
      // Create payment intent via Supabase Edge Function
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ amount, description, paymentMethodId }),
      });

      console.log('Payment intent response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment intent failed:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const responseData = await response.json();
      console.log('Payment intent response data:', responseData);
      
      const { clientSecret, paymentIntentId } = responseData;

      if (!paymentIntentId) {
        throw new Error('No payment intent ID received from server');
      }

      console.log('Payment intent created successfully:', paymentIntentId);
      
      // Transaction will be recorded by webhook when payment succeeds
      // Real-time subscription will update UI automatically
      
      return paymentIntentId;
    } catch (err) {
      console.error('processPayment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Express checkout using default payment method
  const expressCheckout = async (amount: number, description?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Ensure we have fresh payment methods data
      await fetchPaymentMethods();
      
      if (paymentMethods.length === 0) {
        throw new Error('No payment methods available. Please add a payment method first.');
      }
      
      // Find default payment method
      let defaultPaymentMethod = paymentMethods.find(pm => pm.is_default);
      
      // If no default is set, set the first payment method as default
      if (!defaultPaymentMethod) {
        console.log('No default payment method found, setting first payment method as default');
        await setDefaultPaymentMethod(paymentMethods[0].id);
        
        // Use the first payment method directly instead of waiting for database sync
        defaultPaymentMethod = paymentMethods[0];
      }
      
      console.log('Express checkout using payment method:', defaultPaymentMethod.stripe_payment_method_id);
      
      // Process payment with the payment method
      return await processPayment(amount, description, defaultPaymentMethod.stripe_payment_method_id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Express checkout failed');
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
      fetchTransactions();
    } else {
      setPaymentMethods([]);
      setTransactions([]);
    }
  }, [user]);

  // Set up real-time subscriptions separately
  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for payment methods
    const paymentMethodsSubscription = supabase
      .channel('pg_payment_methods_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_payment_methods',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Payment method change detected:', payload);
          fetchPaymentMethods(); // Refresh payment methods
        }
      )
      .subscribe();

    // Set up real-time subscription for transactions
    const transactionsSubscription = supabase
      .channel('pg_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Transaction change detected:', payload);
          fetchTransactions(); // Refresh transactions
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      paymentMethodsSubscription.unsubscribe();
      transactionsSubscription.unsubscribe();
    };
  }, [user]);

  const value: PaymentContextType = {
    paymentMethods,
    transactions,
    loading,
    error,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    processPayment,
    expressCheckout,
    fetchPaymentMethods,
    fetchTransactions,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
