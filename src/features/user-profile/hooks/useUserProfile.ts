import { useState, useEffect } from 'react';
import { UserProfile, UserProfileContextType } from '../types';

/**
 * Hook for managing user profile data
 */
export const useUserProfile = (): UserProfileContextType => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (profile) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock profile data
      const mockProfile: UserProfile = {
        id: userId,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        avatar: null,
        preferences: {
          notifications: true,
          darkMode: false,
          language: 'en',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setProfile(mockProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    loadProfile,
  };
};
