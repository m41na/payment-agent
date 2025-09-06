import { useState, useCallback } from 'react';
import { useStripeConnect } from './useStripeConnect';
import { useOnboardingFlow } from './useOnboardingFlow';
import { useMerchantSync } from './useMerchantSync';
import {
  CreateAccountRequest,
  StripeConnectAccount,
  OnboardingProgress,
  MerchantCapabilities,
  OnboardingRequirements,
} from '../types';

export const useMerchantOnboarding = () => {
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  // Use specialized hooks
  const stripeConnect = useStripeConnect();
  const onboardingFlow = useOnboardingFlow();
  const merchantSync = useMerchantSync();

  // Combined onboarding workflow
  const startCompleteOnboarding = useCallback(async (request: CreateAccountRequest = {}) => {
    try {
      setOnboardingError(null);
      setOnboardingLoading(true);

      // Step 1: Update onboarding flow to account setup
      await onboardingFlow.updateStep('account_setup');

      // Step 2: Create Stripe Connect account and start onboarding
      await stripeConnect.startOnboarding(request);

      // Step 3: Update onboarding flow to verification step
      await onboardingFlow.updateStep('verification');

      return true;
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to start onboarding');
      throw err;
    } finally {
      setOnboardingLoading(false);
    }
  }, [stripeConnect, onboardingFlow]);

  const completeFullOnboarding = useCallback(async () => {
    try {
      setOnboardingError(null);
      setOnboardingLoading(true);

      // Check if Stripe Connect onboarding is complete
      if (!stripeConnect.isOnboardingComplete) {
        throw new Error('Stripe Connect onboarding must be completed first');
      }

      // Complete the onboarding flow
      await onboardingFlow.completeOnboarding();

      // Update to completed step
      await onboardingFlow.updateStep('completed');

      return true;
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to complete onboarding');
      throw err;
    } finally {
      setOnboardingLoading(false);
    }
  }, [stripeConnect.isOnboardingComplete, onboardingFlow]);

  const resetCompleteOnboarding = useCallback(async () => {
    try {
      setOnboardingError(null);
      setOnboardingLoading(true);

      // Reset onboarding flow
      await onboardingFlow.resetOnboarding();

      // Note: We don't reset Stripe Connect account as that requires manual intervention
      
      return true;
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to reset onboarding');
      throw err;
    } finally {
      setOnboardingLoading(false);
    }
  }, [onboardingFlow]);

  const refreshOnboardingStatus = useCallback(async () => {
    try {
      setOnboardingError(null);
      
      // Refresh both Stripe Connect and onboarding flow status
      await Promise.all([
        stripeConnect.refreshAccountStatus(),
        onboardingFlow.checkOnboardingStatus?.() || Promise.resolve(),
      ]);

      return true;
    } catch (err: any) {
      setOnboardingError(err.message || 'Failed to refresh onboarding status');
      throw err;
    }
  }, [stripeConnect, onboardingFlow]);

  // Combined state and computed values
  const overallLoading = stripeConnect.loading || onboardingFlow.loading || onboardingLoading;
  const overallError = stripeConnect.error || onboardingFlow.error || onboardingError;

  const onboardingStatus = {
    // Stripe Connect status
    hasStripeAccount: stripeConnect.hasAccount(),
    stripeOnboardingComplete: stripeConnect.isOnboardingComplete,
    canAcceptPayments: stripeConnect.canAcceptPayments,
    
    // Flow status
    hasCompletedFlow: onboardingFlow.hasCompletedOnboarding,
    currentStep: onboardingFlow.progress.step,
    completionPercentage: onboardingFlow.completionPercentage,
    
    // Combined status
    isFullyOnboarded: stripeConnect.isOnboardingComplete && onboardingFlow.hasCompletedOnboarding,
    needsOnboarding: !stripeConnect.hasAccount() || !onboardingFlow.hasCompletedOnboarding,
    canStartSelling: stripeConnect.canAcceptPayments && onboardingFlow.hasCompletedOnboarding,
  };

  const nextActions = {
    needsStripeAccount: !stripeConnect.hasAccount(),
    needsStripeOnboarding: stripeConnect.hasAccount() && !stripeConnect.isOnboardingComplete,
    needsFlowCompletion: stripeConnect.isOnboardingComplete && !onboardingFlow.hasCompletedOnboarding,
    canCompleteOnboarding: stripeConnect.isOnboardingComplete && !onboardingFlow.hasCompletedOnboarding,
  };

  return {
    // Combined state
    loading: overallLoading,
    error: overallError,
    
    // Stripe Connect (delegated)
    account: stripeConnect.account,
    capabilities: stripeConnect.capabilities,
    requirements: stripeConnect.requirements,
    accountStatus: stripeConnect.accountStatus,
    
    // Onboarding Flow (delegated)
    progress: onboardingFlow.progress,
    stepInfo: onboardingFlow.stepInfo,
    
    // Real-time sync (delegated)
    connectionState: merchantSync.connectionState,
    isConnected: merchantSync.isConnected,
    lastSyncTime: merchantSync.lastSyncTime,
    
    // Combined actions
    startCompleteOnboarding,
    completeFullOnboarding,
    resetCompleteOnboarding,
    refreshOnboardingStatus,
    
    // Stripe Connect actions (delegated)
    createConnectAccount: stripeConnect.createConnectAccount,
    startOnboarding: stripeConnect.startOnboarding,
    refreshAccountStatus: stripeConnect.refreshAccountStatus,
    
    // Onboarding Flow actions (delegated)
    updateStep: onboardingFlow.updateStep,
    markStepCompleted: onboardingFlow.markStepCompleted,
    goToNextStep: onboardingFlow.goToNextStep,
    goToPreviousStep: onboardingFlow.goToPreviousStep,
    completeOnboarding: onboardingFlow.completeOnboarding,
    resetOnboarding: onboardingFlow.resetOnboarding,
    
    // Real-time sync actions (delegated)
    forceSync: merchantSync.forceSync,
    
    // Combined computed values
    onboardingStatus,
    nextActions,
    
    // Utility methods
    isReadyToSell: () => onboardingStatus.canStartSelling,
    getOnboardingProgress: () => onboardingFlow.completionPercentage,
    hasActiveRestrictions: () => stripeConnect.capabilities.hasActiveRestrictions,
    requiresAction: () => stripeConnect.capabilities.requiresAction,
    
    // Step validation
    canProceedToNextStep: onboardingFlow.canProceedToNextStep,
    isStepCompleted: onboardingFlow.isStepCompleted,
  };
};
