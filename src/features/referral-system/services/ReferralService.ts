import { supabase } from '../../../services/supabase';
import {
  ReferralCode,
  ReferralRelationship,
  ReferralPoints,
  ReferralConversionEvent,
  ReferralCodeRequest,
  ReferralSignupRequest,
  ReferralConversionRequest,
  ReferralOperationResult,
  ReferralCodeResult,
  ReferralStatsResult,
  ReferralStats,
  ReferralError,
  ReferralStatus,
  ReferralEventType,
  ReferralTier,
  REFERRAL_CONSTANTS,
  REFERRAL_POINTS_CONFIG,
  isValidReferralCode,
  canUseReferralCode,
  calculateTierFromPoints,
} from '../types';

/**
 * Core Referral Service
 * Manages referral codes, relationships, and point tracking
 */
export class ReferralService {
  /**
   * Generate a new referral code for a user
   */
  async generateReferralCode(
    userId: string,
    request?: ReferralCodeRequest
  ): Promise<ReferralCodeResult> {
    try {
      // Check if user already has an active referral code
      const { data: existingCode } = await supabase
        .from('pg_referral_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (existingCode) {
        return {
          success: true,
          referral_code: existingCode,
        };
      }

      // Generate or validate custom code
      let code = request?.custom_code;
      if (code) {
        if (!isValidReferralCode(code)) {
          return {
            success: false,
            error: this.createError('VALIDATION_ERROR', 'Invalid referral code format'),
          };
        }

        // Check if code already exists
        const { data: codeExists } = await supabase
          .from('pg_referral_codes')
          .select('id')
          .eq('code', code)
          .single();

        if (codeExists) {
          return {
            success: false,
            error: this.createError('CODE_EXISTS', 'Referral code already exists'),
          };
        }
      } else {
        // Generate unique code
        code = await this.generateUniqueCode();
      }

      // Create referral code
      const expiresAt = request?.expires_at || 
        new Date(Date.now() + REFERRAL_CONSTANTS.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const { data: newCode, error } = await supabase
        .from('pg_referral_codes')
        .insert({
          user_id: userId,
          code,
          is_active: true,
          usage_count: 0,
          max_uses: request?.max_uses,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', error.message),
        };
      }

      return {
        success: true,
        referral_code: newCode,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Process referral signup when a new user uses a referral code
   */
  async processReferralSignup(request: ReferralSignupRequest): Promise<ReferralOperationResult> {
    try {
      // Get referral code details
      const { data: referralCode, error: codeError } = await supabase
        .from('pg_referral_codes')
        .select('*')
        .eq('code', request.referral_code)
        .single();

      if (codeError || !referralCode) {
        return {
          success: false,
          error: this.createError('NOT_FOUND', 'Referral code not found'),
        };
      }

      // Validate referral code
      if (!canUseReferralCode(referralCode)) {
        const reason = !referralCode.is_active ? 'inactive' :
                      referralCode.expires_at && new Date(referralCode.expires_at) < new Date() ? 'expired' :
                      'max uses exceeded';
        return {
          success: false,
          error: this.createError('CODE_EXPIRED', `Referral code is ${reason}`),
        };
      }

      // Prevent self-referral
      if (referralCode.user_id === request.user_id) {
        return {
          success: false,
          error: this.createError('SELF_REFERRAL', 'Cannot use your own referral code'),
        };
      }

      // Check if user was already referred
      const { data: existingReferral } = await supabase
        .from('pg_referral_relationships')
        .select('id')
        .eq('referred_id', request.user_id)
        .single();

      if (existingReferral) {
        return {
          success: false,
          error: this.createError('ALREADY_REFERRED', 'User was already referred'),
        };
      }

      // Create referral relationship
      const { data: relationship, error: relationshipError } = await supabase
        .from('pg_referral_relationships')
        .insert({
          referrer_id: referralCode.user_id,
          referred_id: request.user_id,
          referral_code: request.referral_code,
          status: ReferralStatus.ACTIVE,
          total_points_earned: 0,
        })
        .select()
        .single();

      if (relationshipError) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', relationshipError.message),
        };
      }

      // Update referral code usage count
      await supabase
        .from('pg_referral_codes')
        .update({ usage_count: referralCode.usage_count + 1 })
        .eq('id', referralCode.id);

      // Award signup points
      await this.awardConversionPoints(relationship.id, ReferralEventType.SIGNUP);

      return {
        success: true,
        data: relationship,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Award points for referral conversion events
   */
  async awardConversionPoints(
    referralId: string,
    eventType: ReferralEventType,
    metadata?: Record<string, any>
  ): Promise<ReferralOperationResult> {
    try {
      // Get referral relationship
      const { data: referral, error: referralError } = await supabase
        .from('pg_referral_relationships')
        .select('*')
        .eq('id', referralId)
        .single();

      if (referralError || !referral) {
        return {
          success: false,
          error: this.createError('NOT_FOUND', 'Referral relationship not found'),
        };
      }

      // Check if this event type was already awarded
      const { data: existingEvent } = await supabase
        .from('pg_referral_conversion_events')
        .select('id')
        .eq('referral_id', referralId)
        .eq('event_type', eventType)
        .single();

      if (existingEvent && eventType !== ReferralEventType.MONTHLY_ACTIVITY) {
        // Allow multiple monthly activity events, but not others
        return {
          success: true,
          data: existingEvent,
        };
      }

      const pointsAwarded = REFERRAL_POINTS_CONFIG[eventType];

      // Create conversion event
      const { data: conversionEvent, error: eventError } = await supabase
        .from('pg_referral_conversion_events')
        .insert({
          referral_id: referralId,
          event_type: eventType,
          points_awarded: pointsAwarded,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (eventError) {
        return {
          success: false,
          error: this.createError('NETWORK_ERROR', eventError.message),
        };
      }

      // Update referral relationship points
      await supabase
        .from('pg_referral_relationships')
        .update({
          total_points_earned: referral.total_points_earned + pointsAwarded,
          status: ReferralStatus.CONVERTED,
        })
        .eq('id', referralId);

      // Update referrer's total points
      await this.updateUserPoints(referral.referrer_id, pointsAwarded);

      return {
        success: true,
        data: conversionEvent,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string): Promise<ReferralStatsResult> {
    try {
      const [
        { data: userPoints },
        { data: referralRelationships },
        { data: referralCodes },
      ] = await Promise.all([
        supabase
          .from('pg_referral_points')
          .select('*')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('pg_referral_relationships')
          .select(`
            *,
            conversion_events:pg_referral_conversion_events(*)
          `)
          .eq('referrer_id', userId),
        supabase
          .from('pg_referral_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true),
      ]);

      const totalReferrals = referralRelationships?.length || 0;
      const activeReferrals = referralRelationships?.filter(r => r.status === ReferralStatus.ACTIVE).length || 0;
      const convertedReferrals = referralRelationships?.filter(r => r.status === ReferralStatus.CONVERTED).length || 0;
      const conversionRate = totalReferrals > 0 ? convertedReferrals / totalReferrals : 0;

      // Calculate monthly referrals (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const monthlyReferrals = referralRelationships?.filter(r => r.created_at >= thirtyDaysAgo).length || 0;

      // Calculate code performance
      const codePerformance = (referralCodes || []).map(code => {
        const codeReferrals = referralRelationships?.filter(r => r.referral_code === code.code) || [];
        const codeConversions = codeReferrals.filter(r => r.status === ReferralStatus.CONVERTED);
        
        return {
          code: code.code,
          usage_count: code.usage_count,
          conversion_count: codeConversions.length,
          conversion_rate: code.usage_count > 0 ? codeConversions.length / code.usage_count : 0,
          points_generated: codeReferrals.reduce((sum, r) => sum + r.total_points_earned, 0),
        };
      });

      const stats: ReferralStats = {
        total_referrals: totalReferrals,
        active_referrals: activeReferrals,
        converted_referrals: convertedReferrals,
        total_points_earned: userPoints?.total_points || 0,
        current_tier: userPoints?.current_tier || ReferralTier.BRONZE,
        conversion_rate: conversionRate,
        monthly_referrals: monthlyReferrals,
        top_performing_codes: codePerformance.sort((a, b) => b.points_generated - a.points_generated),
      };

      return {
        success: true,
        stats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error.message),
      };
    }
  }

  /**
   * Get referral data for users (used by sorting service)
   */
  async getReferralDataForUsers(userIds: string[]): Promise<Map<string, number>> {
    try {
      const { data: userPoints, error } = await supabase
        .from('pg_referral_points')
        .select('user_id, total_points')
        .in('user_id', userIds);

      if (error) {
        console.error('Error fetching referral data:', error);
        return new Map();
      }

      const referralMap = new Map<string, number>();
      (userPoints || []).forEach(point => {
        referralMap.set(point.user_id, point.total_points);
      });

      return referralMap;
    } catch (error) {
      console.error('Error fetching referral data:', error);
      return new Map();
    }
  }

  /**
   * Update user's total referral points and tier
   */
  private async updateUserPoints(userId: string, pointsToAdd: number): Promise<void> {
    try {
      // Get current points or create new record
      const { data: currentPoints } = await supabase
        .from('pg_referral_points')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (currentPoints) {
        const newTotalPoints = currentPoints.total_points + pointsToAdd;
        const newTier = calculateTierFromPoints(newTotalPoints);

        await supabase
          .from('pg_referral_points')
          .update({
            total_points: newTotalPoints,
            lifetime_points: currentPoints.lifetime_points + pointsToAdd,
            current_tier: newTier,
          })
          .eq('user_id', userId);
      } else {
        const newTier = calculateTierFromPoints(pointsToAdd);

        await supabase
          .from('pg_referral_points')
          .insert({
            user_id: userId,
            total_points: pointsToAdd,
            lifetime_points: pointsToAdd,
            points_spent: 0,
            current_tier: newTier,
          });
      }
    } catch (error) {
      console.error('Error updating user points:', error);
    }
  }

  /**
   * Generate a unique referral code
   */
  private async generateUniqueCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < REFERRAL_CONSTANTS.DEFAULT_CODE_LENGTH; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code exists
      const { data: existingCode } = await supabase
        .from('pg_referral_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (!existingCode) {
        return code;
      }

      attempts++;
    }

    // Fallback: use timestamp-based code
    return `REF${Date.now().toString(36).toUpperCase()}`;
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
