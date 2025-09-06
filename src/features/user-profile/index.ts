// Feature metadata
export const USER_PROFILE_FEATURE = {
  name: 'user-profile',
  version: '1.0.0',
  description: 'Personal User Profile Management feature',
  dependencies: ['shared/auth', 'shared/data'],
} as const;

// Hooks - React integration layer
export { usePersonalProfile } from './hooks/usePersonalProfile';

// Services - Business logic layer (for advanced usage)
export { PersonalProfileService } from './services/PersonalProfileService';

// Types - Domain models and interfaces
export type {
  PersonalProfile,
  NotificationPreferences,
  PrivacySettings,
  ProfileUpdateResult,
  ProfileError,
} from './types';

// Convenience hook that combines both profiles
export const useUserProfile = () => {
  const personalProfile = usePersonalProfile();

  return {
    personal: personalProfile,
    loading: personalProfile.loading,
    hasAnyProfile: personalProfile.hasProfile,
  };
};
