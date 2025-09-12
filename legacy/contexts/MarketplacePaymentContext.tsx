import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../../src/services/supabase';
import { useAuth } from './AuthContext';

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  platform_fee: number;
}

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  amount: number;
  platform_fee: number;
  seller_amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id: string;
  created_at: string;
  updated_at: string;
  product?: {
    title: string;
    price: number;
  };
  seller?: {
    display_name: string;
  };
  buyer?: {
    display_name: string;
  };
}

interface MarketplacePaymentContextType {
  loading: boolean;
  createPaymentIntent: (productId: string, quantity?: number) => Promise<{
    paymentIntent: PaymentIntent;
    product: any;
  } | null>;
  confirmPayment: (paymentIntentId: string) => Promise<boolean>;
  getPaymentStatus: (paymentIntentId: string) => Promise<Transaction | null>;
  getUserTransactions: () => Promise<Transaction[]>;
}

const MarketplacePaymentContext = createContext<MarketplacePaymentContextType | undefined>(undefined);

export const MarketplacePaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(false);

  const createPaymentIntent = async (productId: string, quantity: number = 1) => {
    if (!user || !session) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pg_marketplace-payments', {
        body: {
          action: 'create_payment_intent',
          productId,
          quantity,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentIntentId: string): Promise<boolean> => {
    if (!user || !session) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pg_marketplace-payments', {
        body: {
          action: 'confirm_payment',
          paymentIntentId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data.status === 'succeeded';
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = async (paymentIntentId: string): Promise<Transaction | null> => {
    if (!user || !session) {
      throw new Error('User must be authenticated');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pg_marketplace-payments', {
        body: {
          action: 'get_payment_status',
          paymentIntentId,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data.transaction;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getUserTransactions = async (): Promise<Transaction[]> => {
    if (!user) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select(`
          *,
          product:pg_products(title, price),
          seller:pg_profiles!seller_id(display_name),
          buyer:pg_profiles!buyer_id(display_name)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      return [];
    }
  };

  const value: MarketplacePaymentContextType = {
    loading,
    createPaymentIntent,
    confirmPayment,
    getPaymentStatus,
    getUserTransactions,
  };

  return (
    <MarketplacePaymentContext.Provider value={value}>
      {children}
    </MarketplacePaymentContext.Provider>
  );
};

export const useMarketplacePayment = () => {
  const context = useContext(MarketplacePaymentContext);
  if (context === undefined) {
    throw new Error('useMarketplacePayment must be used within a MarketplacePaymentProvider');
  }
  return context;
};
