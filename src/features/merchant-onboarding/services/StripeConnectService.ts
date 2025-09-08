import { supabase } from '../../../services/supabase';
import {
  StripeConnectAccount,
  CreateAccountRequest,
  CreateAccountResponse,
  OnboardingUrlRequest,
  OnboardingUrlResponse,
  AccountStatusResponse,
  AccountOperationResult,
  OnboardingOperationResult,
  MerchantOnboardingError,
  OnboardingStatus,
} from '../types';

export class StripeConnectService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${supabase.supabaseUrl}/functions/v1/pg_stripe-connect-onboarding`;
  }

  /**
   * Create a new Stripe Connect account for the user
   */
  async createConnectAccount(
    userId: string,
    request: CreateAccountRequest = {}
  ): Promise<AccountOperationResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw this.createError('AUTHENTICATION_ERROR', 'No session found');
      }

      // Call Stripe Connect edge function to create account
      const { data, error } = await supabase.functions.invoke('pg_stripe-connect-onboarding', {
        body: {
          action: 'create_connect_account',
          ...request,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw this.createError('ACCOUNT_CREATION_FAILED', error.message, { error });
      }

      if (!data.success) {
        throw this.createError('ACCOUNT_CREATION_FAILED', data.error || 'Failed to create Connect account');
      }

      // Save account info to our tracking table
      const accountData = {
        user_id: userId,
        stripe_account_id: data.account_id,
        onboarding_status: OnboardingStatus.PENDING,
        charges_enabled: false,
        payouts_enabled: false,
        requirements: {
          currently_due: [],
          eventually_due: [],
          past_due: [],
        },
      };

      const { data: insertedAccount, error: insertError } = await supabase
        .from('pg_stripe_connect_accounts')
        .insert(accountData)
        .select()
        .single();

      if (insertError) {
        throw this.createError('ACCOUNT_CREATION_FAILED', insertError.message, { insertError });
      }

      return {
        success: true,
        account: insertedAccount,
      };
    } catch (error: any) {
      console.error('Error creating Connect account:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('ACCOUNT_CREATION_FAILED', error.message) : error,
      };
    }
  }

  /**
   * Get onboarding URL for a Stripe Connect account
   */
  async getOnboardingUrl(
    accountId: string,
    returnUrl?: string,
    refreshUrl?: string
  ): Promise<OnboardingOperationResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw this.createError('AUTHENTICATION_ERROR', 'No session found');
      }

      const defaultReturnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_stripe-connect-onboarding?action=handle_onboarding_return`;
      const defaultRefreshUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/pg_stripe-connect-onboarding?action=refresh_onboarding_link`;

      const onboardingUrl = `${this.baseUrl}?action=create_onboarding_link&return_url=${encodeURIComponent(returnUrl || defaultReturnUrl)}&refresh_url=${encodeURIComponent(refreshUrl || defaultRefreshUrl)}`;
      
      const response = await fetch(onboardingUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw this.createError('ONBOARDING_URL_FAILED', data.error || 'Failed to create onboarding link');
      }

      if (!data.success) {
        throw this.createError('ONBOARDING_URL_FAILED', data.error || 'Failed to get onboarding URL');
      }

      return {
        success: true,
        url: data.onboarding_url,
      };
    } catch (error: any) {
      console.error('Error getting onboarding URL:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('ONBOARDING_URL_FAILED', error.message) : error,
      };
    }
  }

  /**
   * Create account and get onboarding URL in one operation
   */
  async createAccountAndGetOnboardingUrl(
    userId: string,
    request: CreateAccountRequest = {}
  ): Promise<AccountOperationResult> {
    try {
      // First create the account
      const accountResult = await this.createConnectAccount(userId, request);
      if (!accountResult.success || !accountResult.account) {
        return accountResult;
      }

      // Then get the onboarding URL
      const onboardingResult = await this.getOnboardingUrl(accountResult.account.stripe_account_id);
      if (!onboardingResult.success) {
        return {
          success: false,
          account: accountResult.account,
          error: onboardingResult.error,
        };
      }

      return {
        success: true,
        account: accountResult.account,
        onboarding_url: onboardingResult.url,
      };
    } catch (error: any) {
      console.error('Error creating account and onboarding URL:', error);
      return {
        success: false,
        error: this.createError('ACCOUNT_CREATION_FAILED', error.message),
      };
    }
  }

  /**
   * Fetch Connect account from database
   */
  async fetchConnectAccount(userId: string): Promise<StripeConnectAccount | null> {
    try {
      const { data, error } = await supabase
        .from('pg_stripe_connect_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching Connect account:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching Connect account:', error);
      return null;
    }
  }

  /**
   * Refresh account status from Stripe
   */
  async refreshAccountStatus(userId: string): Promise<AccountOperationResult> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw this.createError('AUTHENTICATION_ERROR', 'No session found');
      }

      const statusUrl = `${this.baseUrl}?action=get_account_status`;
      
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw this.createError('STATUS_FETCH_FAILED', data.error || 'Failed to get account status');
      }

      // Fetch updated account from database
      const account = await this.fetchConnectAccount(userId);
      
      return {
        success: true,
        account: account || undefined,
      };
    } catch (error: any) {
      console.error('Error refreshing account status:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('STATUS_FETCH_FAILED', error.message) : error,
      };
    }
  }

  /**
   * Check if account can accept payments
   */
  canAcceptPayments(account: StripeConnectAccount | null): boolean {
    return account?.charges_enabled === true;
  }

  /**
   * Check if account can receive payouts
   */
  canReceivePayouts(account: StripeConnectAccount | null): boolean {
    return account?.payouts_enabled === true;
  }

  /**
   * Check if onboarding is complete
   */
  isOnboardingComplete(account: StripeConnectAccount | null): boolean {
    return account?.onboarding_status === OnboardingStatus.COMPLETED &&
           account?.charges_enabled === true &&
           account?.payouts_enabled === true;
  }

  /**
   * Check if account has restrictions
   */
  hasActiveRestrictions(account: StripeConnectAccount | null): boolean {
    return account?.onboarding_status === OnboardingStatus.RESTRICTED;
  }

  /**
   * Check if account requires action
   */
  requiresAction(account: StripeConnectAccount | null): boolean {
    if (!account) return false;
    
    const { requirements } = account;
    return requirements.currently_due.length > 0 || requirements.past_due.length > 0;
  }

  /**
   * Get account requirements summary
   */
  getRequirements(account: StripeConnectAccount | null) {
    if (!account) {
      return {
        currentlyDue: [],
        eventuallyDue: [],
        pastDue: [],
        hasRequirements: false,
        isBlocked: false,
      };
    }

    const { requirements } = account;
    return {
      currentlyDue: requirements.currently_due,
      eventuallyDue: requirements.eventually_due,
      pastDue: requirements.past_due,
      hasRequirements: requirements.currently_due.length > 0 || requirements.eventually_due.length > 0,
      isBlocked: requirements.past_due.length > 0,
    };
  }

  /**
   * Validate account data
   */
  validateAccount(account: any): account is StripeConnectAccount {
    return account &&
           typeof account.id === 'string' &&
           typeof account.user_id === 'string' &&
           typeof account.stripe_account_id === 'string' &&
           typeof account.onboarding_status === 'string' &&
           typeof account.charges_enabled === 'boolean' &&
           typeof account.payouts_enabled === 'boolean' &&
           account.requirements &&
           Array.isArray(account.requirements.currently_due);
  }

  /**
   * Create standardized error
   */
  private createError(
    code: MerchantOnboardingError['code'],
    message: string,
    details?: Record<string, any>
  ): MerchantOnboardingError {
    return {
      code,
      message,
      details,
    };
  }
}
