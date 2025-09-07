import { useState, useEffect, useCallback } from 'react';
import {
  ReferralCode,
  ReferralStats,
  ReferralCodeRequest,
  ReferralSignupRequest,
  ReferralConversionRequest,
  ReferralOperationResult,
  ReferralCodeResult,
  ReferralStatsResult,
  ReferralEventType,
  ReferralUserData,
  ReferralError,
  ReferralBoostData,
} from '../types';
import { ReferralService } from '../services/ReferralService';

interface UseReferralsState {
  // Referral Code State
  referralCode: ReferralCode | null;
  referralCodeLoading: boolean;
  referralCodeError: ReferralError | null;

  // Referral Stats State
  referralStats: ReferralStats | null;
  referralStatsLoading: boolean;
  referralStatsError: ReferralError | null;

  // Operation State
  operationLoading: boolean;
  operationError: ReferralError | null;
}

interface UseReferralsActions {
  // Referral Code Actions
  generateReferralCode: (request?: ReferralCodeRequest) => Promise<ReferralCodeResult>;
  refreshReferralCode: () => Promise<void>;

  // Referral Operations
  processReferralSignup: (request: ReferralSignupRequest) => Promise<ReferralOperationResult>;
  awardConversionPoints: (
    referralId: string,
    eventType: ReferralEventType,
    metadata?: Record<string, any>
  ) => Promise<ReferralOperationResult>;

  // Stats Actions
  refreshReferralStats: () => Promise<void>;

  // Utility Actions
  clearErrors: () => void;
  getUserReferralData: () => ReferralUserData | null;
  getUserReferralBoosts: () => Promise<ReferralBoostData[]>;
}

interface UseReferralsReturn extends UseReferralsState, UseReferralsActions {}

/**
 * React hook for managing referral operations
 */
export function useReferrals(userId?: string): UseReferralsReturn {
  const [state, setState] = useState<UseReferralsState>({
    referralCode: null,
    referralCodeLoading: false,
    referralCodeError: null,
    referralStats: null,
    referralStatsLoading: false,
    referralStatsError: null,
    operationLoading: false,
    operationError: null,
  });

  const referralService = new ReferralService();

  /**
   * Generate or get existing referral code
   */
  const generateReferralCode = useCallback(
    async (request?: ReferralCodeRequest): Promise<ReferralCodeResult> => {
      if (!userId) {
        const error: ReferralError = {
          code: 'UNAUTHORIZED',
          message: 'User ID is required',
        };
        setState(prev => ({ ...prev, referralCodeError: error }));
        return { success: false, error };
      }

      setState(prev => ({ ...prev, referralCodeLoading: true, referralCodeError: null }));

      try {
        const result = await referralService.generateReferralCode(userId, request);
        
        setState(prev => ({
          ...prev,
          referralCodeLoading: false,
          referralCode: result.success ? result.referral_code! : prev.referralCode,
          referralCodeError: result.error || null,
        }));

        return result;
      } catch (error: any) {
        const referralError: ReferralError = {
          code: 'NETWORK_ERROR',
          message: error.message,
        };
        
        setState(prev => ({
          ...prev,
          referralCodeLoading: false,
          referralCodeError: referralError,
        }));

        return { success: false, error: referralError };
      }
    },
    [userId, referralService]
  );

  /**
   * Refresh referral code
   */
  const refreshReferralCode = useCallback(async (): Promise<void> => {
    await generateReferralCode();
  }, [generateReferralCode]);

  /**
   * Process referral signup
   */
  const processReferralSignup = useCallback(
    async (request: ReferralSignupRequest): Promise<ReferralOperationResult> => {
      setState(prev => ({ ...prev, operationLoading: true, operationError: null }));

      try {
        const result = await referralService.processReferralSignup(request);
        
        setState(prev => ({
          ...prev,
          operationLoading: false,
          operationError: result.error || null,
        }));

        return result;
      } catch (error: any) {
        const referralError: ReferralError = {
          code: 'NETWORK_ERROR',
          message: error.message,
        };
        
        setState(prev => ({
          ...prev,
          operationLoading: false,
          operationError: referralError,
        }));

        return { success: false, error: referralError };
      }
    },
    [referralService]
  );

  /**
   * Award conversion points
   */
  const awardConversionPoints = useCallback(
    async (
      referralId: string,
      eventType: ReferralEventType,
      metadata?: Record<string, any>
    ): Promise<ReferralOperationResult> => {
      setState(prev => ({ ...prev, operationLoading: true, operationError: null }));

      try {
        const result = await referralService.awardConversionPoints(referralId, eventType, metadata);
        
        setState(prev => ({
          ...prev,
          operationLoading: false,
          operationError: result.error || null,
        }));

        // Refresh stats after awarding points
        if (result.success && userId) {
          refreshReferralStats();
        }

        return result;
      } catch (error: any) {
        const referralError: ReferralError = {
          code: 'NETWORK_ERROR',
          message: error.message,
        };
        
        setState(prev => ({
          ...prev,
          operationLoading: false,
          operationError: referralError,
        }));

        return { success: false, error: referralError };
      }
    },
    [referralService, userId]
  );

  /**
   * Refresh referral stats
   */
  const refreshReferralStats = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setState(prev => ({ ...prev, referralStatsLoading: true, referralStatsError: null }));

    try {
      const result = await referralService.getReferralStats(userId);
      
      setState(prev => ({
        ...prev,
        referralStatsLoading: false,
        referralStats: result.success ? result.stats! : prev.referralStats,
        referralStatsError: result.error || null,
      }));
    } catch (error: any) {
      const referralError: ReferralError = {
        code: 'NETWORK_ERROR',
        message: error.message,
      };
      
      setState(prev => ({
        ...prev,
        referralStatsLoading: false,
        referralStatsError: referralError,
      }));
    }
  }, [userId, referralService]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback((): void => {
    setState(prev => ({
      ...prev,
      referralCodeError: null,
      referralStatsError: null,
      operationError: null,
    }));
  }, []);

  /**
   * Get user referral data for external use
   */
  const getUserReferralData = useCallback((): ReferralUserData | null => {
    if (!state.referralCode || !state.referralStats) {
      return null;
    }

    return {
      referral_code: state.referralCode.code,
      total_points: state.referralStats.total_points_earned,
      current_tier: state.referralStats.current_tier,
      active_referrals: state.referralStats.active_referrals,
      lifetime_referrals: state.referralStats.total_referrals,
    };
  }, [state.referralCode, state.referralStats]);

  /**
   * Get user referral boosts for product discovery
   */
  const getUserReferralBoosts = useCallback(async (): Promise<ReferralBoostData[]> => {
    if (!userId || !state.referralStats) {
      return [];
    }

    try {
      // Calculate boost multiplier based on tier and points
      const boostMultiplier = getListingBoostMultiplier(
        state.referralStats.current_tier,
        state.referralStats.total_points_earned
      );

      const boostData: ReferralBoostData = {
        user_id: userId,
        points: state.referralStats.total_points_earned,
        tier: state.referralStats.current_tier,
        boost_multiplier: boostMultiplier,
      };

      return [boostData];
    } catch (error: any) {
      console.error('Error getting referral boosts:', error);
      return [];
    }
  }, [userId, state.referralStats]);

  // Load initial data when userId changes
  useEffect(() => {
    if (userId) {
      generateReferralCode();
      refreshReferralStats();
    }
  }, [userId, generateReferralCode, refreshReferralStats]);

  return {
    // State
    ...state,
    
    // Actions
    generateReferralCode,
    refreshReferralCode,
    processReferralSignup,
    awardConversionPoints,
    refreshReferralStats,
    clearErrors,
    getUserReferralData,
    getUserReferralBoosts,
  };
}
