// Referral System Feature - Public API Interface
// Exports all public types, services, and hooks for the referral system

// Types
export * from './types';

// Services
export { ReferralService } from './services/ReferralService';
export { ReferralAnalyticsService } from './services/ReferralAnalyticsService';

// Hooks
export { useReferrals } from './hooks/useReferrals';
export { useReferralAnalytics } from './hooks/useReferralAnalytics';

// Re-export specific types for convenience
export type {
  ReferralCode,
  ReferralStats,
  ReferralAnalytics,
  ReferralLeaderboard,
  ReferralUserData,
  ReferralEventType,
  ReferralTier,
  ReferralOperationResult,
  ReferralCodeResult,
  ReferralStatsResult,
  ReferralError,
} from './types';
