// ============================================================================
// TRANSACTION HISTORY HOOK - Transaction Analytics & Management
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { TransactionHistoryService } from '../services/TransactionHistoryService';
import { 
  TransactionRecord,
  TransactionFilter,
  TransactionAnalytics,
  RevenueSummary,
  TopProduct,
  CustomerSegment,
  TransactionExportFormat,
  StorefrontError,
  STOREFRONT_CONSTANTS
} from '../types';

interface TransactionHistoryState {
  transactions: TransactionRecord[];
  analytics: TransactionAnalytics | null;
  revenueSummary: RevenueSummary | null;
  topProducts: TopProduct[];
  customerSegments: CustomerSegment[];
  isLoading: boolean;
  isLoadingAnalytics: boolean;
  error: StorefrontError | null;
  hasMore: boolean;
  totalCount: number;
}

interface TransactionHistoryActions {
  // Transaction Management
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  
  // Analytics
  fetchAnalytics: (period?: string) => Promise<void>;
  fetchRevenueSummary: (period?: string) => Promise<void>;
  fetchTopProducts: (period?: string, limit?: number) => Promise<void>;
  fetchCustomerSegments: () => Promise<void>;
  
  // Export
  exportTransactions: (format: TransactionExportFormat, filter?: TransactionFilter) => Promise<string>;
  
  // Utility
  clearError: () => void;
  resetPagination: () => void;
}

export interface UseTransactionHistoryReturn extends TransactionHistoryState, TransactionHistoryActions {
  // Computed Values
  totalRevenue: number;
  averageOrderValue: number;
  transactionCount: number;
  
  // Helper Functions
  getTransactionsByStatus: (status: string) => TransactionRecord[];
  getRecentTransactions: (days?: number) => TransactionRecord[];
  getTransactionTrends: () => {
    dailyRevenue: { date: string; amount: number }[];
    weeklyGrowth: number;
    monthlyGrowth: number;
  };
}

export function useTransactionHistory(userId?: string): UseTransactionHistoryReturn {
  const [state, setState] = useState<TransactionHistoryState>({
    transactions: [],
    analytics: null,
    revenueSummary: null,
    topProducts: [],
    customerSegments: [],
    isLoading: false,
    isLoadingAnalytics: false,
    error: null,
    hasMore: true,
    totalCount: 0
  });

  const [currentFilter, setCurrentFilter] = useState<TransactionFilter>({});
  const [currentPage, setCurrentPage] = useState(1);

  const transactionService = TransactionHistoryService.getInstance();

  // ============================================================================
  // TRANSACTION MANAGEMENT ACTIONS
  // ============================================================================

  const fetchTransactions = useCallback(async (filter: TransactionFilter = {}) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setCurrentFilter(filter);
    setCurrentPage(1);

    try {
      const result = await transactionService.getTransactions(userId, {
        ...filter,
        page: 1,
        limit: STOREFRONT_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE
      });

      setState(prev => ({
        ...prev,
        transactions: result.transactions,
        totalCount: result.total,
        hasMore: result.hasMore,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoading: false
      }));
    }
  }, [userId, transactionService]);

  const loadMoreTransactions = useCallback(async () => {
    if (!userId || !state.hasMore || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const nextPage = currentPage + 1;
      const result = await transactionService.getTransactions(userId, {
        ...currentFilter,
        page: nextPage,
        limit: STOREFRONT_CONSTANTS.PAGINATION.DEFAULT_PAGE_SIZE
      });

      setState(prev => ({
        ...prev,
        transactions: [...prev.transactions, ...result.transactions],
        hasMore: result.hasMore,
        isLoading: false
      }));

      setCurrentPage(nextPage);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoading: false
      }));
    }
  }, [userId, state.hasMore, state.isLoading, currentPage, currentFilter, transactionService]);

  const refreshTransactions = useCallback(async () => {
    await fetchTransactions(currentFilter);
  }, [fetchTransactions, currentFilter]);

  // ============================================================================
  // ANALYTICS ACTIONS
  // ============================================================================

  const fetchAnalytics = useCallback(async (period: string = 'month') => {
    if (!userId) return;

    setState(prev => ({ ...prev, isLoadingAnalytics: true, error: null }));

    try {
      const analytics = await transactionService.getAnalytics(userId, period);
      setState(prev => ({
        ...prev,
        analytics,
        isLoadingAnalytics: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoadingAnalytics: false
      }));
    }
  }, [userId, transactionService]);

  const fetchRevenueSummary = useCallback(async (period: string = 'month') => {
    if (!userId) return;

    try {
      const revenueSummary = await transactionService.getRevenueSummary(userId, period);
      setState(prev => ({ ...prev, revenueSummary }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error as StorefrontError }));
    }
  }, [userId, transactionService]);

  const fetchTopProducts = useCallback(async (period: string = 'month', limit: number = 10) => {
    if (!userId) return;

    try {
      const topProducts = await transactionService.getTopProducts(userId, period, limit);
      setState(prev => ({ ...prev, topProducts }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error as StorefrontError }));
    }
  }, [userId, transactionService]);

  const fetchCustomerSegments = useCallback(async () => {
    if (!userId) return;

    try {
      const customerSegments = await transactionService.getCustomerSegments(userId);
      setState(prev => ({ ...prev, customerSegments }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error as StorefrontError }));
    }
  }, [userId, transactionService]);

  // ============================================================================
  // EXPORT ACTIONS
  // ============================================================================

  const exportTransactions = useCallback(async (
    format: TransactionExportFormat, 
    filter: TransactionFilter = {}
  ): Promise<string> => {
    if (!userId) throw new Error('User ID required for export');

    try {
      return await transactionService.exportTransactions(userId, format, filter);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error as StorefrontError }));
      throw error;
    }
  }, [userId, transactionService]);

  // ============================================================================
  // UTILITY ACTIONS
  // ============================================================================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setState(prev => ({ ...prev, hasMore: true }));
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const totalRevenue = state.transactions.reduce((sum, transaction) => 
    sum + (transaction.amount || 0), 0
  );

  const averageOrderValue = state.transactions.length > 0 ? 
    totalRevenue / state.transactions.length : 0;

  const transactionCount = state.transactions.length;

  const getTransactionsByStatus = useCallback((status: string) => {
    return state.transactions.filter(transaction => transaction.status === status);
  }, [state.transactions]);

  const getRecentTransactions = useCallback((days: number = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return state.transactions.filter(transaction => 
      new Date(transaction.created_at) >= cutoffDate
    );
  }, [state.transactions]);

  const getTransactionTrends = useCallback(() => {
    // Group transactions by date
    const dailyRevenue = state.transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (transaction.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const dailyRevenueArray = Object.entries(dailyRevenue)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate growth rates
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const thisWeekRevenue = state.transactions
      .filter(t => new Date(t.created_at) >= oneWeekAgo)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const lastWeekRevenue = state.transactions
      .filter(t => new Date(t.created_at) >= twoWeeksAgo && new Date(t.created_at) < oneWeekAgo)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const thisMonthRevenue = state.transactions
      .filter(t => new Date(t.created_at) >= oneMonthAgo)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const lastMonthRevenue = state.transactions
      .filter(t => new Date(t.created_at) >= twoMonthsAgo && new Date(t.created_at) < oneMonthAgo)
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const weeklyGrowth = lastWeekRevenue > 0 ? 
      ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;

    const monthlyGrowth = lastMonthRevenue > 0 ? 
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      dailyRevenue: dailyRevenueArray,
      weeklyGrowth,
      monthlyGrowth
    };
  }, [state.transactions]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (userId) {
      fetchTransactions();
      fetchAnalytics();
      fetchRevenueSummary();
      fetchTopProducts();
      fetchCustomerSegments();
    }
  }, [userId, fetchTransactions, fetchAnalytics, fetchRevenueSummary, fetchTopProducts, fetchCustomerSegments]);

  return {
    // State
    transactions: state.transactions,
    analytics: state.analytics,
    revenueSummary: state.revenueSummary,
    topProducts: state.topProducts,
    customerSegments: state.customerSegments,
    isLoading: state.isLoading,
    isLoadingAnalytics: state.isLoadingAnalytics,
    error: state.error,
    hasMore: state.hasMore,
    totalCount: state.totalCount,

    // Actions
    fetchTransactions,
    loadMoreTransactions,
    refreshTransactions,
    fetchAnalytics,
    fetchRevenueSummary,
    fetchTopProducts,
    fetchCustomerSegments,
    exportTransactions,
    clearError,
    resetPagination,

    // Computed Values
    totalRevenue,
    averageOrderValue,
    transactionCount,
    getTransactionsByStatus,
    getRecentTransactions,
    getTransactionTrends
  };
}
