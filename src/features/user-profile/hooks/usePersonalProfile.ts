import { useState, useEffect, useCallback } from 'react';
import { PersonalProfileService } from '../services/PersonalProfileService';
import { PersonalProfile, ProfileError } from '../types';
import { useAuth } from '../../user-auth/context/AuthContext';

const personalProfileService = new PersonalProfileService();

export const usePersonalProfile = () => {
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const profileData = await personalProfileService.fetchProfile(user.id);
      setProfile(profileData);
    } catch (err: any) {
      console.error('Error fetching personal profile:', err);
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const createProfile = useCallback(async (profileData: Partial<PersonalProfile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const newProfile = await personalProfileService.createProfile(
        user.id,
        user.email,
        profileData
      );
      setProfile(newProfile);
      return newProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
      throw err;
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<PersonalProfile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      
      if (!profile) {
        // Create new profile if none exists
        return await createProfile(updates);
      }

      const updatedProfile = await personalProfileService.updateProfile(user.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  }, [user, profile, createProfile]);

  const updateNotificationPreferences = useCallback(async (preferences: Partial<PersonalProfile['notification_preferences']>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const updatedProfile = await personalProfileService.updateNotificationPreferences(user.id, preferences);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update notification preferences');
      throw err;
    }
  }, [user]);

  const updatePrivacySettings = useCallback(async (settings: Partial<PersonalProfile['privacy_settings']>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      const updatedProfile = await personalProfileService.updatePrivacySettings(user.id, settings);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update privacy settings');
      throw err;
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Computed values
  const hasProfile = profile !== null;
  const isNotificationsEnabled = profile?.notification_preferences.email || 
                                 profile?.notification_preferences.sms || 
                                 profile?.notification_preferences.push;
  const isProfileVisible = profile?.privacy_settings.profile_visible ?? true;

  return {
    // State
    profile,
    loading,
    error,
    
    // Actions
    createProfile,
    updateProfile,
    updateNotificationPreferences,
    updatePrivacySettings,
    refreshProfile,
    
    // Computed values
    hasProfile,
    isNotificationsEnabled,
    isProfileVisible,
  };
};
