// Personal Profile Types
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface PrivacySettings {
  profile_visible: boolean;
  show_phone: boolean;
  show_email: boolean;
}

export interface PersonalProfile {
  id?: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  social_1?: string;
  social_2?: string;
  bio?: string;
  avatar_url?: string;
  stripe_customer_id?: string;
  notification_preferences: NotificationPreferences;
  privacy_settings: PrivacySettings;
  created_at?: string;
  updated_at?: string;
}

// Context Types
export interface UserProfileContextType {
  // State
  profile: PersonalProfile | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  createProfile: (profileData: Partial<PersonalProfile>) => Promise<PersonalProfile>;
  updateProfile: (updates: Partial<PersonalProfile>) => Promise<PersonalProfile>;
  updateNotificationPreferences: (preferences: Partial<PersonalProfile['notification_preferences']>) => Promise<PersonalProfile>;
  updatePrivacySettings: (settings: Partial<PersonalProfile['privacy_settings']>) => Promise<PersonalProfile>;
  refreshProfile: () => Promise<void>;
  
  // Computed values
  hasProfile: boolean;
  isNotificationsEnabled: boolean;
  isProfileVisible: boolean;
}

// Service Results
export interface ProfileUpdateResult {
  success: boolean;
  profile?: PersonalProfile;
  error?: string;
}

// Error Types
export interface ProfileError {
  code: 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND';
  message: string;
  field?: string;
}
