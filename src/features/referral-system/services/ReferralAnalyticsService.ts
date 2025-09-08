import { supabase } from '../../../services/supabase';
import {
  ReferralAnalytics,
  ReferralLeaderboard,
  ReferralEventType,
  ReferralTier,
  ReferralOperationResult,
  ReferralError,
} from '../types';

/**
 * Referral Analytics Service
 * Provides comprehensive analytics and reporting for the referral system
 */
export class ReferralAnalyticsService {
  /**
   * Get comprehensive referral analytics
   */
  async getReferralAnalytics(): Promise<ReferralOperationResult> {
    try {
      const [
        totalUsersResult,
        totalRelationshipsResult,
        totalPointsResult,
        conversionRatesResult,
        tierDistributionResult,
        monthlyGrowthResult,
        topReferrersResult,
      ] = await Promise.all([
        this.getTotalUsersWithReferrals(),
        this.getTotalReferralRelationships(),
        this.getTotalPointsDistributed(),
        this.getConversionRatesByEvent(),
        this.getTierDistribution(),
        this.getMonthlyGrowth(),
        this.getTopReferrers(10),
      ]);

      const analytics: ReferralAnalytics = {
        total_users_with_referrals: totalUsersResult.data || 0,
        total_referral_relationships: totalRelationshipsResult.data || 0,
        total_points_distributed: totalPointsResult.data || 0,
        conversion_rates_by_event: conversionRatesResult.data || {},
        tier_distribution: tierDistributionResult.data || {},
        monthly_growth: monthlyGrowthResult.data || [],
        top_referrers: topReferrersResult.data || [],
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(limit: number = 50): Promise<ReferralOperationResult> {
    try {
      const { data: leaderboard, error } = await supabase
        .from('pg_referral_points')
        .select(`
          user_id,
          total_points,
          current_tier,
          user:pg_profiles!user_id(
            full_name,
            avatar_url
          )
        `)
        .order('total_points', { ascending: false })
        .limit(limit);

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      // Get referral counts for each user
      const userIds = (leaderboard || []).map(item => item.user_id);
      const { data: referralCounts } = await supabase
        .from('pg_referral_relationships')
        .select('referrer_id')
        .in('referrer_id', userIds);

      const referralCountMap = new Map<string, number>();
      (referralCounts || []).forEach(ref => {
        const count = referralCountMap.get(ref.referrer_id) || 0;
        referralCountMap.set(ref.referrer_id, count + 1);
      });

      const formattedLeaderboard: ReferralLeaderboard[] = (leaderboard || []).map((item, index) => ({
        user_id: item.user_id,
        user_name: item.user?.full_name || 'Anonymous',
        avatar_url: item.user?.avatar_url,
        total_points: item.total_points,
        total_referrals: referralCountMap.get(item.user_id) || 0,
        current_tier: item.current_tier,
        rank: index + 1,
      }));

      return {
        success: true,
        data: formattedLeaderboard,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get total users with referrals
   */
  private async getTotalUsersWithReferrals(): Promise<ReferralOperationResult> {
    try {
      const { count, error } = await supabase
        .from('pg_referral_points')
        .select('user_id', { count: 'exact' });

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      return {
        success: true,
        data: count || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get total referral relationships
   */
  private async getTotalReferralRelationships(): Promise<ReferralOperationResult> {
    try {
      const { count, error } = await supabase
        .from('pg_referral_relationships')
        .select('id', { count: 'exact' });

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      return {
        success: true,
        data: count || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get total points distributed
   */
  private async getTotalPointsDistributed(): Promise<ReferralOperationResult> {
    try {
      const { data, error } = await supabase
        .from('pg_referral_points')
        .select('lifetime_points');

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      const totalPoints = (data || []).reduce((sum, item) => sum + item.lifetime_points, 0);

      return {
        success: true,
        data: totalPoints,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get conversion rates by event type
   */
  private async getConversionRatesByEvent(): Promise<ReferralOperationResult> {
    try {
      const { data: events, error } = await supabase
        .from('pg_referral_conversion_events')
        .select('event_type');

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      const { data: totalRelationships } = await supabase
        .from('pg_referral_relationships')
        .select('id', { count: 'exact' });

      const totalCount = totalRelationships || 0;
      const eventCounts: Record<ReferralEventType, number> = {} as any;

      // Initialize all event types
      Object.values(ReferralEventType).forEach(eventType => {
        eventCounts[eventType] = 0;
      });

      // Count events
      (events || []).forEach(event => {
        eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
      });

      // Calculate conversion rates
      const conversionRates: Record<ReferralEventType, number> = {} as any;
      Object.entries(eventCounts).forEach(([eventType, count]) => {
        conversionRates[eventType as ReferralEventType] = totalCount > 0 ? count / totalCount : 0;
      });

      return {
        success: true,
        data: conversionRates,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get tier distribution
   */
  private async getTierDistribution(): Promise<ReferralOperationResult> {
    try {
      const { data: tiers, error } = await supabase
        .from('pg_referral_points')
        .select('current_tier');

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      const tierDistribution: Record<ReferralTier, number> = {} as any;

      // Initialize all tiers
      Object.values(ReferralTier).forEach(tier => {
        tierDistribution[tier] = 0;
      });

      // Count tiers
      (tiers || []).forEach(item => {
        tierDistribution[item.current_tier] = (tierDistribution[item.current_tier] || 0) + 1;
      });

      return {
        success: true,
        data: tierDistribution,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get monthly growth data
   */
  private async getMonthlyGrowth(): Promise<ReferralOperationResult> {
    try {
      // Get last 12 months of data
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        months.push({
          month: startOfMonth.toISOString().slice(0, 7), // YYYY-MM format
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
        });
      }

      const monthlyData = await Promise.all(
        months.map(async ({ month, start, end }) => {
          const [referralsResult, conversionsResult] = await Promise.all([
            supabase
              .from('pg_referral_relationships')
              .select('id', { count: 'exact' })
              .gte('created_at', start)
              .lte('created_at', end),
            supabase
              .from('pg_referral_conversion_events')
              .select('id', { count: 'exact' })
              .gte('created_at', start)
              .lte('created_at', end),
          ]);

          return {
            month,
            new_referrals: referralsResult.count || 0,
            conversions: conversionsResult.count || 0,
          };
        })
      );

      return {
        success: true,
        data: monthlyData,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get top referrers
   */
  private async getTopReferrers(limit: number): Promise<ReferralOperationResult> {
    try {
      const leaderboardResult = await this.getReferralLeaderboard(limit);
      return leaderboardResult;
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Create standardized error
   */
  private createError(
    code: ReferralError['code'],
    message: string,
    details?: Record<string, any>
  ): ReferralError {
    return {
      code,
      message,
      details,
    };
  }
}
