import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { useAuth } from '../../../shared/auth/AuthContext';
import { useStripeConnect } from '../hooks/useStripeConnect';
import MerchantOnboardingScreen from '../components/MerchantOnboardingScreen';

interface MerchantOnboardingContainerProps {
  onComplete: () => void;
}

const MerchantOnboardingContainer: React.FC<MerchantOnboardingContainerProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { 
    account, 
    loading, 
    isOnboardingComplete, 
    canAcceptPayments,
    createConnectAccount, 
    refreshAccountStatus,
    getOnboardingUrl 
  } = useStripeConnect();

  const handleCreateAccount = useCallback(async () => {
    const onboardingUrl = await createConnectAccount();
    
    if (onboardingUrl) {
      // Open Stripe Connect onboarding in browser
      const canOpen = await Linking.canOpenURL(onboardingUrl);
      if (canOpen) {
        await Linking.openURL(onboardingUrl);
        Alert.alert(
          'Complete Onboarding',
          'Please complete your merchant account setup in the browser, then return to the app.',
          [
            { text: 'I\'ve Completed Setup', onPress: refreshAccountStatus },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', 'Unable to open onboarding URL');
      }
    } else {
      Alert.alert('Error', 'Failed to create merchant account. Please try again.');
    }
  }, [createConnectAccount, refreshAccountStatus]);

  const handleContinueOnboarding = useCallback(async () => {
    if (!account) return;
    
    const onboardingUrl = await getOnboardingUrl(account.stripe_account_id);
    
    if (onboardingUrl) {
      const canOpen = await Linking.canOpenURL(onboardingUrl);
      if (canOpen) {
        await Linking.openURL(onboardingUrl);
        Alert.alert(
          'Complete Onboarding',
          'Please complete your merchant account setup in the browser, then return to the app.',
          [
            { text: 'I\'ve Completed Setup', onPress: refreshAccountStatus },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    }
  }, [account, getOnboardingUrl, refreshAccountStatus]);

  const handleRefreshAccountStatus = useCallback(async () => {
    await refreshAccountStatus();
  }, [refreshAccountStatus]);

  return (
    <MerchantOnboardingScreen
      account={account}
      loading={loading}
      isOnboardingComplete={isOnboardingComplete}
      canAcceptPayments={canAcceptPayments}
      onCreateAccount={handleCreateAccount}
      onContinueOnboarding={handleContinueOnboarding}
      onRefreshAccountStatus={handleRefreshAccountStatus}
      onComplete={onComplete}
    />
  );
};

export default MerchantOnboardingContainer;
