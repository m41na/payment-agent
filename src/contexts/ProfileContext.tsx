import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

interface PrivacySettings {
  profile_visible: boolean;
  show_phone: boolean;
  show_email: boolean;
}

interface Profile {
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

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  createProfile: (profileData: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const defaultProfile: Partial<Profile> = {
  notification_preferences: {
    email: true,
    sms: false,
    push: true,
  },
  privacy_settings: {
    profile_visible: true,
    show_phone: false,
    show_email: false,
  },
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pg_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setProfile(data || null);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (profileData: Partial<Profile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      
      const newProfile = {
        ...defaultProfile,
        ...profileData,
        id: user.id,
        email: user.email,
      };

      const { data, error } = await supabase
        .from('pg_profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);

      if (!profile) {
        // Create new profile if none exists
        await createProfile(updates);
        return;
      }

      const { data, error } = await supabase
        .from('pg_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
      throw err;
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        updateProfile,
        createProfile,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
