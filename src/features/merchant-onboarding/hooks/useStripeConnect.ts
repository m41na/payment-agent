import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { StripeConnectService } from '../services/StripeConnectService';
import {
  StripeConnectAccount,
  CreateAccountRequest,
  MerchantCapabilities,
  OnboardingRequirements,
  MerchantOnboardingError,
} from '../types';
import { useAuth } from '../../user-auth/context/AuthContext';
import { supabase } from '../../../services/supabase';

const stripeConnectService = new StripeConnectService();

export const useStripeConnect = () => {
  const [account, setAccount] = useState<StripeConnectAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAccount = useCallback(async () => {
    if (!user) {
      setAccount(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const accountData = await stripeConnectService.fetchConnectAccount(user.id);
      setAccount(accountData);
    } catch (err: any) {
      console.error('Error fetching Connect account:', err);
      setError(err.message || 'Failed to fetch account');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  // Realtime subscription to account updates (keeps UI in sync with DB updates)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('public:pg_stripe_connect_accounts')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'pg_stripe_connect_accounts',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        // When account row updates, refetch local account
        fetchAccount();
      })
      .subscribe((status) => {
        // Subscription lifecycle events are logged for debugging
        console.log('StripeConnect realtime subscription status:', status);
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn('Failed to remove StripeConnect realtime channel', err);
      }
    };
  }, [user, fetchAccount]);

  const createConnectAccount = useCallback(async (request: CreateAccountRequest = {}) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      setLoading(true);
      
      const result = await stripeConnectService.createConnectAccount(user.id, request);
      
      if (result.success && result.account) {
        setAccount(result.account);
        return result.account;
      } else {
        throw new Error(result.error?.message || 'Failed to create account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create Connect account');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getOnboardingUrl = useCallback(async (returnUrl?: string, refreshUrl?: string) => {
    if (!account) throw new Error('No Connect account found');

    try {
      setError(null);
      const result = await stripeConnectService.getOnboardingUrl(
        account.stripe_account_id,
        returnUrl,
        refreshUrl
      );
      
      if (result.success && result.url) {
        return result.url;
      } else {
        throw new Error(result.error?.message || 'Failed to get onboarding URL');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get onboarding URL');
      throw err;
    }
  }, [account]);

  const createAccountAndGetOnboardingUrl = useCallback(async (request: CreateAccountRequest = {}) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      setLoading(true);
      
      const result = await stripeConnectService.createAccountAndGetOnboardingUrl(user.id, request);
      
      if (result.success && result.account) {
        setAccount(result.account);
        return {
          account: result.account,
          onboarding_url: result.onboarding_url,
        };
      } else {
        throw new Error(result.error?.message || 'Failed to create account and onboarding URL');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account and onboarding URL');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const startOnboarding = useCallback(async (request: CreateAccountRequest = {}) => {
    try {
      setLoading(true);
      
      let onboardingUrl: string;
      
      // If no account exists, create one first
      if (!account) {
        console.log('No Connect account found, creating one...');
        const result = await createAccountAndGetOnboardingUrl(request);
        if (!result.onboarding_url) {
          throw new Error('Failed to get onboarding URL');
        }
        onboardingUrl = result.onboarding_url;
      } else {
        // If account exists, get onboarding URL
        console.log('Getting onboarding URL for existing account:', account.stripe_account_id);
        onboardingUrl = await getOnboardingUrl();
      }
      
      // Open the onboarding URL
      await Linking.openURL(onboardingUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to start onboarding');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, createAccountAndGetOnboardingUrl, getOnboardingUrl]);

  const refreshAccountStatus = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const result = await stripeConnectService.refreshAccountStatus(user.id);

      if (result.success) {
        // Refresh local account state from database
        await fetchAccount();
      } else {
        throw new Error(result.error?.message || 'Failed to refresh account status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh account status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchAccount]);

  // Keep account state in sync with database updates triggered by webhooks or edge functions
  // This complements the above realtime subscription and ensures the UI reflects latest Stripe state.

  // Computed values using service methods
  const capabilities: MerchantCapabilities = {
    canAcceptPayments: stripeConnectService.canAcceptPayments(account),
    canReceivePayouts: stripeConnectService.canReceivePayouts(account),
    isOnboardingComplete: stripeConnectService.isOnboardingComplete(account),
    hasActiveRestrictions: stripeConnectService.hasActiveRestrictions(account),
    requiresAction: stripeConnectService.requiresAction(account),
  };

  const requirements: OnboardingRequirements = stripeConnectService.getRequirements(account);

  const accountStatus = {
    hasAccount: account !== null,
    accountId: account?.stripe_account_id || null,
    onboardingStatus: account?.onboarding_status || null,
    chargesEnabled: account?.charges_enabled || false,
    payoutsEnabled: account?.payouts_enabled || false,
  };

  return {
    // State
    account,
    loading,
    error,
    
    // Actions
    createConnectAccount,
    getOnboardingUrl,
    createAccountAndGetOnboardingUrl,
    startOnboarding,
    refreshAccountStatus,
    
    // Computed values
    capabilities,
    requirements,
    accountStatus,
    
    // Legacy compatibility (matching original context interface)
    isOnboardingComplete: capabilities.isOnboardingComplete,
    canAcceptPayments: capabilities.canAcceptPayments,
    hasCompletedOnboarding: account?.onboarding_status === 'completed',
    
    // Utility methods
    hasAccount: () => account !== null,
    needsOnboarding: () => !account || account.onboarding_status !== 'completed',
    hasRequirements: () => requirements.hasRequirements,
    isBlocked: () => requirements.isBlocked,
  };
};
