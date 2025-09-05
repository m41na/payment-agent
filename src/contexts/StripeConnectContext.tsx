import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

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
      } else {
        setAccount(data);
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
      const onboardingData = await supabase.functions.invoke('pg_stripe-connect-onboarding', {
        body: {
          action: 'create_onboarding_link',
          accountData: {
            return_url: 'paymentagent://merchant/onboarding/complete',
            refresh_url: 'paymentagent://merchant/onboarding/refresh',
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (onboardingData.error) throw onboardingData.error;
      if (!onboardingData.data.success) throw new Error(onboardingData.data.error || 'Failed to create onboarding link');

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
      return onboardingData.data.onboarding_url;
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

      const { data, error } = await supabase.functions.invoke('pg_stripe-connect-onboarding', {
        body: {
          action: 'create_onboarding_link',
          accountData: {
            return_url: 'paymentagent://merchant/onboarding/complete',
            refresh_url: 'paymentagent://merchant/onboarding/refresh',
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error invoking onboarding function:', error);
        console.error('Error details:', {
          message: error.message,
          context: error.context,
          details: error.details
        });
        throw error;
      }

      console.log('Onboarding function response:', data);

      if (!data.success) {
        console.error('Onboarding function failed:', data.error);
        throw new Error(data.error || 'Failed to get onboarding URL');
      }

      return data.onboarding_url;
    } catch (error) {
      console.error('Error getting onboarding URL:', error);
      return null;
    }
  };

  const startOnboarding = async (): Promise<void> => {
    try {
      const onboardingUrl = await getOnboardingUrl(account?.id as string);
      if (onboardingUrl) {
        await Linking.openURL(onboardingUrl);
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
    }
  };

  const refreshAccountStatus = async (): Promise<void> => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const { data, error } = await supabase.functions.invoke('pg_stripe-connect-onboarding', {
        body: {
          action: 'get_account_status'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to get account status');

      // Update local account state
      if (data.account_status && data.account_status !== 'not_created') {
        const { data: accountData, error: fetchError } = await supabase
          .from('pg_stripe_connect_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!fetchError && accountData) {
          // Update the account with fresh Stripe data
          const { data: updatedAccount, error: updateError } = await supabase
            .from('pg_stripe_connect_accounts')
            .update({
              onboarding_status: data.onboarding_complete ? 'completed' : 'pending',
              charges_enabled: data.account_status.charges_enabled,
              payouts_enabled: data.account_status.payouts_enabled,
              requirements: data.account_status.requirements,
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountData.id)
            .select()
            .single();

          if (!updateError) {
            setAccount(updatedAccount);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing account status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectAccount();
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
