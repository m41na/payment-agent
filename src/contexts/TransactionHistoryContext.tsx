import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id?: string;
  stripe_connect_account_id?: string;
  amount: number;
  currency: string;
  status: string;
  transaction_type: 'payment' | 'subscription' | 'payout';
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  buyer_profile?: {
    full_name: string;
    email: string;
  };
  product_info?: {
    title: string;
    category: string;
  };
}

interface TransactionHistoryContextType {
  transactions: Transaction[];
  loading: boolean;
  totalRevenue: number;
  monthlyRevenue: number;
  refreshTransactions: () => Promise<void>;
  getTransactionsByDateRange: (startDate: Date, endDate: Date) => Transaction[];
}

const TransactionHistoryContext = createContext<TransactionHistoryContextType | undefined>(undefined);

export const useTransactionHistory = () => {
  const context = useContext(TransactionHistoryContext);
  if (!context) {
    throw new Error('useTransactionHistory must be used within a TransactionHistoryProvider');
  }
  return context;
};

export const TransactionHistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async (): Promise<void> => {
    if (!user) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshTransactions = async (): Promise<void> => {
    await fetchTransactions();
  };

  const getTransactionsByDateRange = (startDate: Date, endDate: Date): Transaction[] => {
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.created_at);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  };

  // Calculate total revenue
  const totalRevenue = transactions
    .filter(t => t.status === 'succeeded' && t.transaction_type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0) / 100; // Convert from cents

  // Calculate monthly revenue (current month)
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  
  const monthlyRevenue = getTransactionsByDateRange(monthStart, monthEnd)
    .filter(t => t.status === 'succeeded' && t.transaction_type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0) / 100; // Convert from cents

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // Set up realtime subscription for transaction updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pg_transactions',
        filter: `seller_id=eq.${user.id}`,
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value: TransactionHistoryContextType = {
    transactions,
    loading,
    totalRevenue,
    monthlyRevenue,
    refreshTransactions,
    getTransactionsByDateRange,
  };

  return (
    <TransactionHistoryContext.Provider value={value}>
      {children}
    </TransactionHistoryContext.Provider>
  );
};
