import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface Preferences {
  id?: string;
  user_id?: string;
  // Storefront
  storefront_name?: string;
  storefront_logo_svg?: string;
  storefront_description?: string;
  primary_color: string;
  accent_color: string;
  storefront_latitude?: number;
  storefront_longitude?: number;
  // Business
  business_hours: BusinessHours;
  business_street?: string;
  business_city?: string;
  business_state?: string;
  business_zip?: string;
  business_country: string;
  // Contact
  business_contact_name?: string;
  business_phone?: string;
  business_email?: string;
  business_website?: string;
  // Settings
  tax_rate: number;
  currency: string;
  timezone: string;
  auto_accept_orders: boolean;
  delivery_radius_miles: number;
  minimum_order_amount: number;
  // Notifications
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

interface PreferencesContextType {
  preferences: Preferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
  createPreferences: (prefs: Partial<Preferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const defaultPreferences: Preferences = {
  primary_color: '#6200ee',
  accent_color: '#03dac6',
  business_hours: {},
  business_country: 'US',
  tax_rate: 0.0000,
  currency: 'USD',
  timezone: 'America/New_York',
  auto_accept_orders: false,
  delivery_radius_miles: 10,
  minimum_order_amount: 0.00,
  email_notifications: true,
  sms_notifications: false,
  push_notifications: true,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setPreferences(null);
      setLoading(false);
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pg_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setPreferences(data || null);
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPreferences = async (prefs: Partial<Preferences>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      
      const newPreferences = {
        ...defaultPreferences,
        ...prefs,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('pg_preferences')
        .insert([newPreferences])
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
    } catch (err: any) {
      console.error('Error creating preferences:', err);
      setError(err.message);
      throw err;
    }
  };

  const updatePreferences = async (updates: Partial<Preferences>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);

      if (!preferences) {
        // Create new preferences if none exist
        await createPreferences(updates);
        return;
      }

      const { data, error } = await supabase
        .from('pg_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError(err.message);
      throw err;
    }
  };

  const refreshPreferences = async () => {
    await fetchPreferences();
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        error,
        updatePreferences,
        createPreferences,
        refreshPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
