// ============================================================================
// STOREFRONT MANAGEMENT HOOK - Unified Business Profile & Transaction Interface
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useStorefront, UseStorefrontReturn } from './useStorefront';
import { useTransactionHistory, UseTransactionHistoryReturn } from './useTransactionHistory';
import { 
  BusinessProfile,
  BusinessLocation,
  TransactionFilter,
  TransactionExportFormat,
  StorefrontError
} from '../types';

interface StorefrontManagementState {
  isInitialized: boolean;
  globalError: StorefrontError | null;
  isAnyLoading: boolean;
}

interface StorefrontManagementActions {
  // Initialization
  initializeStorefront: (userId: string) => Promise<void>;
  refreshAllData: () => Promise<void>;
  
  // Cross-Feature Operations
  publishStorefront: () => Promise<void>;
  unpublishStorefront: () => Promise<void>;
  
  // Quick Actions
  quickUpdateLocation: (location: BusinessLocation) => Promise<void>;
  quickToggleDelivery: (enabled: boolean) => Promise<void>;
  quickExportData: (format: TransactionExportFormat) => Promise<string>;
  
  // Global Error Handling
  clearAllErrors: () => void;
}

export interface UseStorefrontManagementReturn extends StorefrontManagementState, StorefrontManagementActions {
  // Sub-hooks
  storefront: UseStorefrontReturn;
  transactions: UseTransactionHistoryReturn;
  
  // Computed Cross-Feature Values
  dashboardSummary: {
    profileCompletion: number;
    totalRevenue: number;
    transactionCount: number;
    averageOrderValue: number;
    isPublished: boolean;
  };
  
  // Helper Functions
  getBusinessInsights: () => {
    topPerformingProducts: string[];
    peakBusinessHours: string[];
    customerRetentionRate: number;
    revenueGrowth: number;
  };
}

export function useStorefrontManagement(userId?: string): UseStorefrontManagementReturn {
  const [state, setState] = useState<StorefrontManagementState>({
    isInitialized: false,
    globalError: null,
    isAnyLoading: false
  });

  // Initialize sub-hooks
  const storefront = useStorefront(userId);
  const transactions = useTransactionHistory(userId);

  // ============================================================================
  // INITIALIZATION ACTIONS
  // ============================================================================

  const initializeStorefront = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, isAnyLoading: true, globalError: null }));

    try {
      // Initialize both profile and transaction data
      await Promise.all([
        storefront.fetchProfile(),
        transactions.fetchTransactions(),
        transactions.fetchAnalytics()
      ]);

      setState(prev => ({ 
        ...prev, 
        isInitialized: true, 
        isAnyLoading: false 
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        globalError: error as StorefrontError,
        isAnyLoading: false
      }));
    }
  }, [storefront, transactions]);

  const refreshAllData = useCallback(async () => {
    setState(prev => ({ ...prev, isAnyLoading: true, globalError: null }));

    try {
      await Promise.all([
        storefront.refreshProfile(),
        transactions.refreshTransactions()
      ]);

      setState(prev => ({ ...prev, isAnyLoading: false }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        globalError: error as StorefrontError,
        isAnyLoading: false
      }));
    }
  }, [storefront, transactions]);

  // ============================================================================
  // CROSS-FEATURE OPERATIONS
  // ============================================================================

  const publishStorefront = useCallback(async () => {
    if (!storefront.profile || !storefront.isProfileComplete) {
      setState(prev => ({
        ...prev,
        globalError: {
          code: 'VALIDATION_ERROR' as any,
          message: 'Profile must be complete before publishing',
          field: 'profile_completion'
        }
      }));
      return;
    }

    try {
      await storefront.updateSettings({
        is_published: true,
        accepts_online_orders: true
      });
    } catch (error: any) {
      setState(prev => ({ ...prev, globalError: error as StorefrontError }));
    }
  }, [storefront]);

  const unpublishStorefront = useCallback(async () => {
    try {
      await storefront.updateSettings({
        is_published: false,
        accepts_online_orders: false
      });
    } catch (error: any) {
      setState(prev => ({ ...prev, globalError: error as StorefrontError }));
    }
  }, [storefront]);

  // ============================================================================
  // QUICK ACTIONS
  // ============================================================================

  const quickUpdateLocation = useCallback(async (location: BusinessLocation) => {
    try {
      await storefront.updateLocation(location);
    } catch (error: any) {
      setState(prev => ({ ...prev, globalError: error as StorefrontError }));
    }
  }, [storefront]);

  const quickToggleDelivery = useCallback(async (enabled: boolean) => {
    if (!storefront.profile) return;

    try {
      await storefront.updateSettings({
        ...storefront.profile.settings,
        delivery_available: enabled,
        delivery_radius_miles: enabled ? 
          storefront.profile.settings?.delivery_radius_miles || 5 : 0
      });
    } catch (error: any) {
      setState(prev => ({ ...prev, globalError: error as StorefrontError }));
    }
  }, [storefront]);

  const quickExportData = useCallback(async (format: TransactionExportFormat): Promise<string> => {
    try {
      return await transactions.exportTransactions(format);
    } catch (error: any) {
      setState(prev => ({ ...prev, globalError: error as StorefrontError }));
      throw error;
    }
  }, [transactions]);

  // ============================================================================
  // GLOBAL ERROR HANDLING
  // ============================================================================

  const clearAllErrors = useCallback(() => {
    setState(prev => ({ ...prev, globalError: null }));
    storefront.clearError();
    transactions.clearError();
  }, [storefront, transactions]);

  // ============================================================================
  // COMPUTED CROSS-FEATURE VALUES
  // ============================================================================

  const dashboardSummary = {
    profileCompletion: storefront.completionPercentage,
    totalRevenue: transactions.totalRevenue,
    transactionCount: transactions.transactionCount,
    averageOrderValue: transactions.averageOrderValue,
    isPublished: storefront.profile?.settings?.is_published || false
  };

  const getBusinessInsights = useCallback(() => {
    // Top performing products from transaction data
    const topPerformingProducts = transactions.topProducts
      .slice(0, 3)
      .map(product => product.name);

    // Peak business hours analysis (simplified)
    const peakBusinessHours = storefront.profile?.business_hours ? 
      Object.entries(storefront.profile.business_hours)
        .filter(([_, hours]: [string, any]) => !hours.closed)
        .map(([day, _]) => day)
        .slice(0, 3) : [];

    // Customer retention rate (simplified calculation)
    const customerRetentionRate = transactions.customerSegments.length > 0 ?
      transactions.customerSegments
        .filter(segment => segment.segment === 'returning')
        .reduce((sum, segment) => sum + segment.count, 0) / 
      transactions.customerSegments
        .reduce((sum, segment) => sum + segment.count, 0) * 100 : 0;

    // Revenue growth from transaction trends
    const trends = transactions.getTransactionTrends();
    const revenueGrowth = trends.monthlyGrowth;

    return {
      topPerformingProducts,
      peakBusinessHours,
      customerRetentionRate,
      revenueGrowth
    };
  }, [storefront.profile, transactions.topProducts, transactions.customerSegments, transactions.getTransactionTrends]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (userId && !state.isInitialized) {
      initializeStorefront(userId);
    }
  }, [userId, state.isInitialized, initializeStorefront]);

  useEffect(() => {
    // Track loading state across all sub-hooks
    const isAnyLoading = storefront.isLoading || 
                        storefront.isUpdating || 
                        transactions.isLoading || 
                        transactions.isLoadingAnalytics;

    setState(prev => ({ ...prev, isAnyLoading }));
  }, [
    storefront.isLoading, 
    storefront.isUpdating, 
    transactions.isLoading, 
    transactions.isLoadingAnalytics
  ]);

  return {
    // State
    isInitialized: state.isInitialized,
    globalError: state.globalError,
    isAnyLoading: state.isAnyLoading,

    // Actions
    initializeStorefront,
    refreshAllData,
    publishStorefront,
    unpublishStorefront,
    quickUpdateLocation,
    quickToggleDelivery,
    quickExportData,
    clearAllErrors,

    // Sub-hooks
    storefront,
    transactions,

    // Computed Values
    dashboardSummary,
    getBusinessInsights
  };
}
