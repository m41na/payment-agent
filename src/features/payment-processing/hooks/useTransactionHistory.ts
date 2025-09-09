import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../user-auth/context/AuthContext';
import { TransactionHistoryService } from '../services/TransactionHistoryService';
import { TransactionHistory } from '../types';

export const useTransactionHistory = () => {
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize service to prevent recreation on every render
  const transactionHistoryService = useMemo(() => {
    return user ? new TransactionHistoryService(user.id) : null;
  }, [user?.id]);

  // Data fetching
  const fetchTransactions = useCallback(async () => {
    if (!transactionHistoryService) return;
    
    try {
      setLoading(true);
      setError(null);
      const txns = await transactionHistoryService.getTransactions();
      setTransactions(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [transactionHistoryService]);

  const fetchTransactionsByDateRange = useCallback(async (startDate: Date, endDate: Date) => {
    if (!transactionHistoryService) return [];
    
    try {
      setLoading(true);
      setError(null);
      const txns = await transactionHistoryService.getTransactionsByDateRange(startDate, endDate);
      return txns;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions by date range');
      return [];
    } finally {
      setLoading(false);
    }
  }, [transactionHistoryService]);

  const fetchSellerTransactions = useCallback(async () => {
    if (!transactionHistoryService) return [];
    
    try {
      setLoading(true);
      setError(null);
      const txns = await transactionHistoryService.getSellerTransactions();
      return txns;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seller transactions');
      return [];
    } finally {
      setLoading(false);
    }
  }, [transactionHistoryService]);

  // Business logic methods
  const getTransactionsByDateRange = useCallback((startDate: Date, endDate: Date): TransactionHistory[] => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }, [transactions]);

  const getTransactionsByType = useCallback((type: 'payment' | 'subscription' | 'payout'): TransactionHistory[] => {
    if (!transactionHistoryService) return [];
    return transactionHistoryService.getTransactionsByType(transactions, type);
  }, [transactionHistoryService, transactions]);

  const getTransactionsByStatus = useCallback((status: string): TransactionHistory[] => {
    if (!transactionHistoryService) return [];
    return transactionHistoryService.getTransactionsByStatus(transactions, status);
  }, [transactionHistoryService, transactions]);

  // Initial data load
  useEffect(() => {
    if (user) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [user, fetchTransactions]);

  // Computed values
  const totalRevenue = useMemo(() => {
    if (!transactionHistoryService) return 0;
    return transactionHistoryService.calculateTotalRevenue(transactions);
  }, [transactionHistoryService, transactions]);

  const monthlyRevenue = useMemo(() => {
    if (!transactionHistoryService) return 0;
    return transactionHistoryService.calculateMonthlyRevenue(transactions);
  }, [transactionHistoryService, transactions]);

  return {
    // Data
    transactions,
    totalRevenue,
    monthlyRevenue,
    
    // State
    loading,
    error,
    
    // Actions
    refreshTransactions: fetchTransactions,
    fetchTransactionsByDateRange,
    fetchSellerTransactions,
    getTransactionsByDateRange,
    getTransactionsByType,
    getTransactionsByStatus,
    
    // Utils
    clearError: () => setError(null),
  };
};
