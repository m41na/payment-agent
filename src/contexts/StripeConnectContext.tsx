import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface StripeConnectAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  onboarding_status: 'pending' | 'in_progress' | 'completed' | 'restricted';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  created_at: string;
  updated_at: string;
}

interface StripeConnectContextType {
  account: StripeConnectAccount | null;
  loading: boolean;
  isOnboardingComplete: boolean;
  canAcceptPayments: boolean;
  hasCompletedOnboarding: boolean;
  createConnectAccount: () => Promise<string | null>; // Returns onboarding URL
  startOnboarding: () => Promise<void>;
  refreshAccountStatus: () => Promise<void>;
  getOnboardingUrl: (accountId: string) => Promise<string | null>;
}

const StripeConnectContext = createContext<StripeConnectContextType | undefined>(undefined);

export const StripeConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [account, setAccount] = useState<StripeConnectAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConnectAccount = async () => {
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pg_stripe_connect_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Connect account:', error);
        setAccount(null);
      } else if (data) {
        setAccount(data);
      } else {
        setAccount(null);
      }
    } catch (error) {
      console.error('Error fetching Connect account:', error);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const createConnectAccount = async (): Promise<string | null> => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const { data, error } = await supabase.functions.invoke('pg_stripe-connect-onboarding', {
        body: {
          action: 'create_connect_account'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create Connect account');

      // Account creation successful, now create onboarding link
      const onboardingUrl = `${supabase.supabaseUrl}/functions/v1/pg_stripe-connect-onboarding?action=create_onboarding_link&return_url=${encodeURIComponent(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_stripe-connect-onboarding?action=handle_onboarding_return`)}&refresh_url=${encodeURIComponent(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_stripe-connect-onboarding?action=refresh_onboarding_link`)}`;
      
      const onboardingResponse = await fetch(onboardingUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const onboardingData = await onboardingResponse.json();
      if (!onboardingResponse.ok) throw new Error(onboardingData.error || 'Failed to create onboarding link');

      // Save account info to our tracking table
      const { data: accountData, error: insertError } = await supabase
        .from('pg_stripe_connect_accounts')
        .insert({
          user_id: user.id,
          stripe_account_id: data.account_id,
          onboarding_status: 'pending',
          charges_enabled: false,
          payouts_enabled: false,
          requirements: {
            currently_due: [],
            eventually_due: [],
            past_due: [],
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setAccount(accountData);
      return onboardingData.onboarding_url;
    } catch (error) {
      console.error('Error creating Connect account:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getOnboardingUrl = async (accountId: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      console.log('Getting onboarding URL for account:', accountId);

      const onboardingUrl = `${supabase.supabaseUrl}/functions/v1/pg_stripe-connect-onboarding?action=create_onboarding_link&return_url=${encodeURIComponent(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_stripe-connect-onboarding?action=handle_onboarding_return`)}&refresh_url=${encodeURIComponent(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_stripe-connect-onboarding?action=refresh_onboarding_link`)}`;
      
      const onboardingResponse = await fetch(onboardingUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const onboardingData = await onboardingResponse.json();
      if (!onboardingResponse.ok) throw new Error(onboardingData.error || 'Failed to get onboarding URL');

      console.log('Onboarding function response:', onboardingData);

      if (!onboardingData.success) {
        console.error('Onboarding function failed:', onboardingData.error);
        throw new Error(onboardingData.error || 'Failed to get onboarding URL');
      }

      return onboardingData.onboarding_url;
    } catch (error) {
      console.error('Error getting onboarding URL:', error);
      return null;
    }
  };

  const startOnboarding = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // If no account exists, create one first
      if (!account) {
        console.log('No Connect account found, creating one...');
        const onboardingUrl = await createConnectAccount();
        if (onboardingUrl) {
          await Linking.openURL(onboardingUrl);
        }
        return;
      }

      // If account exists, get onboarding URL using stripe_account_id
      console.log('Getting onboarding URL for existing account:', account.stripe_account_id);
      const onboardingUrl = await getOnboardingUrl(account.stripe_account_id);
      if (onboardingUrl) {
        await Linking.openURL(onboardingUrl);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountStatus = async (): Promise<void> => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const accountStatusUrl = `${supabase.supabaseUrl}/functions/v1/pg_stripe-connect-onboarding?action=get_account_status`;
      
      const accountStatusResponse = await fetch(accountStatusUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const accountStatusData = await accountStatusResponse.json();
      if (!accountStatusResponse.ok) throw new Error(accountStatusData.error || 'Failed to get account status');

      // Refresh local account state from database
      await fetchConnectAccount();
    } catch (error) {
      console.error('Error refreshing account status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectAccount();
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      console.log('No user ID for realtime subscription');
      return;
    }

    console.log('Setting up realtime subscription for user:', user.id);
    
    const channel: RealtimeChannel = supabase.channel('public:pg_stripe_connect_accounts')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pg_stripe_connect_accounts',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        console.log('Realtime update received:', payload);
        console.log('Fetching updated account data...');
        fetchConnectAccount();
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
      
    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isOnboardingComplete = account?.onboarding_status === 'completed' && 
                              account?.charges_enabled && 
                              account?.payouts_enabled;

  const canAcceptPayments = account?.charges_enabled === true;

  const value: StripeConnectContextType = {
    account,
    loading,
    isOnboardingComplete,
    canAcceptPayments,
    hasCompletedOnboarding: account?.onboarding_status === 'completed',
    createConnectAccount,
    startOnboarding,
    refreshAccountStatus,
    getOnboardingUrl,
  };

  return (
    <StripeConnectContext.Provider value={value}>
      {children}
    </StripeConnectContext.Provider>
  );
};

export const useStripeConnect = (): StripeConnectContextType => {
  const context = useContext(StripeConnectContext);
  if (context === undefined) {
    throw new Error('useStripeConnect must be used within a StripeConnectProvider');
  }
  return context;
};
