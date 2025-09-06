// =============================================================================
// Referral System Feature - Type Definitions
// =============================================================================

// Core Referral Types
export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralRelationship {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: ReferralStatus;
  conversion_events: ReferralConversionEvent[];
  total_points_earned: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralConversionEvent {
  id: string;
  referral_id: string;
  event_type: ReferralEventType;
  points_awarded: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ReferralPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  points_spent: number;
  current_tier: ReferralTier;
  created_at: string;
  updated_at: string;
}

export interface ReferralReward {
  id: string;
  user_id: string;
  referral_id: string;
  reward_type: ReferralRewardType;
  points_value: number;
  description: string;
  is_claimed: boolean;
  claimed_at?: string;
  expires_at?: string;
  created_at: string;
}

// Enums
export enum ReferralStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CONVERTED = 'converted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ReferralEventType {
  SIGNUP = 'signup',
  FIRST_PURCHASE = 'first_purchase',
  SUBSCRIPTION_PURCHASE = 'subscription_purchase',
  PRODUCT_LISTING = 'product_listing',
  SUCCESSFUL_SALE = 'successful_sale',
  MONTHLY_ACTIVITY = 'monthly_activity',
}

export enum ReferralTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

export enum ReferralRewardType {
  POINTS = 'points',
  DISCOUNT = 'discount',
  LISTING_BOOST = 'listing_boost',
  FEATURE_ACCESS = 'feature_access',
  CASH_REWARD = 'cash_reward',
}

// Data Transfer Objects
export interface ReferralCodeRequest {
  custom_code?: string;
  max_uses?: number;
  expires_at?: string;
}

export interface ReferralSignupRequest {
  referral_code: string;
  user_id: string;
}

export interface ReferralConversionRequest {
  referral_id: string;
  event_type: ReferralEventType;
  metadata?: Record<string, any>;
}

// Operation Results
export interface ReferralOperationResult {
  success: boolean;
  data?: any;
  error?: ReferralError;
}

export interface ReferralCodeResult {
  success: boolean;
  referral_code?: ReferralCode;
  error?: ReferralError;
}

export interface ReferralStatsResult {
  success: boolean;
  stats?: ReferralStats;
  error?: ReferralError;
}

// Analytics & Stats
export interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  converted_referrals: number;
  total_points_earned: number;
  current_tier: ReferralTier;
  conversion_rate: number;
  monthly_referrals: number;
  top_performing_codes: ReferralCodePerformance[];
}

export interface ReferralCodePerformance {
  code: string;
  usage_count: number;
  conversion_count: number;
  conversion_rate: number;
  points_generated: number;
}

export interface ReferralLeaderboard {
  user_id: string;
  user_name: string;
  avatar_url?: string;
  total_points: number;
  total_referrals: number;
  current_tier: ReferralTier;
  rank: number;
}

export interface ReferralAnalytics {
  total_users_with_referrals: number;
  total_referral_relationships: number;
  total_points_distributed: number;
  conversion_rates_by_event: Record<ReferralEventType, number>;
  tier_distribution: Record<ReferralTier, number>;
  monthly_growth: {
    month: string;
    new_referrals: number;
    conversions: number;
  }[];
  top_referrers: ReferralLeaderboard[];
}

// Configuration
export interface ReferralConfig {
  points_per_event: Record<ReferralEventType, number>;
  tier_thresholds: Record<ReferralTier, number>;
  code_expiry_days: number;
  max_uses_per_code: number;
  listing_boost_multiplier: number;
  enable_leaderboard: boolean;
}

// Integration Types
export interface ReferralBoostData {
  user_id: string;
  points: number;
  tier: ReferralTier;
  boost_multiplier: number;
}

export interface ReferralUserData {
  referral_code: string;
  total_points: number;
  current_tier: ReferralTier;
  active_referrals: number;
  lifetime_referrals: number;
}

// Error Handling
export interface ReferralError {
  code: 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'CODE_EXISTS' | 'CODE_EXPIRED' | 'MAX_USES_EXCEEDED' | 'SELF_REFERRAL' | 'ALREADY_REFERRED';
  message: string;
  details?: Record<string, any>;
}

// Constants
export const REFERRAL_CONSTANTS = {
  DEFAULT_CODE_LENGTH: 8,
  MAX_CODE_LENGTH: 20,
  MIN_CODE_LENGTH: 4,
  DEFAULT_EXPIRY_DAYS: 365,
  MAX_USES_PER_CODE: 1000,
  MIN_POINTS_FOR_TIER_UP: 10,
  LISTING_BOOST_BASE_MULTIPLIER: 1.2,
} as const;

export const REFERRAL_POINTS_CONFIG = {
  [ReferralEventType.SIGNUP]: 10,
  [ReferralEventType.FIRST_PURCHASE]: 25,
  [ReferralEventType.SUBSCRIPTION_PURCHASE]: 50,
  [ReferralEventType.PRODUCT_LISTING]: 5,
  [ReferralEventType.SUCCESSFUL_SALE]: 15,
  [ReferralEventType.MONTHLY_ACTIVITY]: 5,
} as const;

export const REFERRAL_TIER_THRESHOLDS = {
  [ReferralTier.BRONZE]: 0,
  [ReferralTier.SILVER]: 100,
  [ReferralTier.GOLD]: 500,
  [ReferralTier.PLATINUM]: 1500,
  [ReferralTier.DIAMOND]: 5000,
} as const;

// Type Guards
export const isValidReferralCode = (code: string): boolean => {
  return code.length >= REFERRAL_CONSTANTS.MIN_CODE_LENGTH && 
         code.length <= REFERRAL_CONSTANTS.MAX_CODE_LENGTH &&
         /^[A-Z0-9]+$/.test(code);
};

export const isReferralExpired = (referralCode: ReferralCode): boolean => {
  if (!referralCode.expires_at) return false;
  return new Date(referralCode.expires_at) < new Date();
};

export const canUseReferralCode = (referralCode: ReferralCode): boolean => {
  if (!referralCode.is_active) return false;
  if (isReferralExpired(referralCode)) return false;
  if (referralCode.max_uses && referralCode.usage_count >= referralCode.max_uses) return false;
  return true;
};

export const calculateTierFromPoints = (points: number): ReferralTier => {
  if (points >= REFERRAL_TIER_THRESHOLDS[ReferralTier.DIAMOND]) return ReferralTier.DIAMOND;
  if (points >= REFERRAL_TIER_THRESHOLDS[ReferralTier.PLATINUM]) return ReferralTier.PLATINUM;
  if (points >= REFERRAL_TIER_THRESHOLDS[ReferralTier.GOLD]) return ReferralTier.GOLD;
  if (points >= REFERRAL_TIER_THRESHOLDS[ReferralTier.SILVER]) return ReferralTier.SILVER;
  return ReferralTier.BRONZE;
};

export const getListingBoostMultiplier = (tier: ReferralTier, basePoints: number): number => {
  const tierMultipliers = {
    [ReferralTier.BRONZE]: 1.0,
    [ReferralTier.SILVER]: 1.1,
    [ReferralTier.GOLD]: 1.2,
    [ReferralTier.PLATINUM]: 1.3,
    [ReferralTier.DIAMOND]: 1.5,
  };
  
  const tierBoost = tierMultipliers[tier];
  const pointsBoost = Math.min(basePoints / 1000, 0.5); // Max 50% boost from points
  
  return tierBoost + pointsBoost;
};
