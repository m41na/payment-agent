import { useState, useEffect, useCallback } from 'react';
import {
  ReferralAnalytics,
  ReferralLeaderboard,
  ReferralOperationResult,
  ReferralError,
} from '../types';
import { ReferralAnalyticsService } from '../services/ReferralAnalyticsService';

interface UseReferralAnalyticsState {
  // Analytics State
  analytics: ReferralAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: ReferralError | null;

  // Leaderboard State
  leaderboard: ReferralLeaderboard[] | null;
  leaderboardLoading: boolean;
  leaderboardError: ReferralError | null;
}

interface UseReferralAnalyticsActions {
  // Analytics Actions
  refreshAnalytics: () => Promise<void>;
  
  // Leaderboard Actions
  refreshLeaderboard: (limit?: number) => Promise<void>;
  
  // Utility Actions
  clearErrors: () => void;
}

interface UseReferralAnalyticsReturn extends UseReferralAnalyticsState, UseReferralAnalyticsActions {}

/**
 * React hook for managing referral analytics and leaderboard data
 */
export function useReferralAnalytics(autoLoad: boolean = true): UseReferralAnalyticsReturn {
  const [state, setState] = useState<UseReferralAnalyticsState>({
    analytics: null,
    analyticsLoading: false,
    analyticsError: null,
    leaderboard: null,
    leaderboardLoading: false,
    leaderboardError: null,
  });

  const analyticsService = new ReferralAnalyticsService();

  /**
   * Refresh analytics data
   */
  const refreshAnalytics = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, analyticsLoading: true, analyticsError: null }));

    try {
      const result = await analyticsService.getReferralAnalytics();
      
      setState(prev => ({
        ...prev,
        analyticsLoading: false,
        analytics: result.success ? result.data as ReferralAnalytics : prev.analytics,
        analyticsError: result.error || null,
      }));
    } catch (error: any) {
      const referralError: ReferralError = {
        code: 'NETWORK_ERROR',
        message: error.message,
      };
      
      setState(prev => ({
        ...prev,
        analyticsLoading: false,
        analyticsError: referralError,
      }));
    }
  }, [analyticsService]);

  /**
   * Refresh leaderboard data
   */
  const refreshLeaderboard = useCallback(async (limit: number = 50): Promise<void> => {
    setState(prev => ({ ...prev, leaderboardLoading: true, leaderboardError: null }));

    try {
      const result = await analyticsService.getReferralLeaderboard(limit);
      
      setState(prev => ({
        ...prev,
        leaderboardLoading: false,
        leaderboard: result.success ? result.data as ReferralLeaderboard[] : prev.leaderboard,
        leaderboardError: result.error || null,
      }));
    } catch (error: any) {
      const referralError: ReferralError = {
        code: 'NETWORK_ERROR',
        message: error.message,
      };
      
      setState(prev => ({
        ...prev,
        leaderboardLoading: false,
        leaderboardError: referralError,
      }));
    }
  }, [analyticsService]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback((): void => {
    setState(prev => ({
      ...prev,
      analyticsError: null,
      leaderboardError: null,
    }));
  }, []);

  // Load initial data if autoLoad is enabled
  useEffect(() => {
    if (autoLoad) {
      refreshAnalytics();
      refreshLeaderboard();
    }
  }, [autoLoad, refreshAnalytics, refreshLeaderboard]);

  return {
    // State
    ...state,
    
    // Actions
    refreshAnalytics,
    refreshLeaderboard,
    clearErrors,
  };
}
