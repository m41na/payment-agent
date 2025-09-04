import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Card, Button, ProgressBar, Chip, List } from 'react-native-paper';
import { useStripeConnect } from '../contexts/StripeConnectContext';
import { useAuth } from '../contexts/AuthContext';

interface StripeConnectOnboardingScreenProps {
  onComplete: () => void;
}

const StripeConnectOnboardingScreen: React.FC<StripeConnectOnboardingScreenProps> = ({ onComplete }) => {
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
  
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    if (isOnboardingComplete) {
      onComplete();
    }
  }, [isOnboardingComplete, onComplete]);

  const handleCreateAccount = async () => {
    setCreatingAccount(true);
    
    try {
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
    } catch (error) {
      Alert.alert('Error', 'Failed to create merchant account. Please try again.');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleContinueOnboarding = async () => {
    if (!account) return;
    
    try {
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
    } catch (error) {
      Alert.alert('Error', 'Failed to get onboarding URL. Please try again.');
    }
  };

  const getOnboardingProgress = () => {
    if (!account) return 0;
    
    switch (account.onboarding_status) {
      case 'pending': return 0.2;
      case 'in_progress': return 0.6;
      case 'completed': return 1.0;
      case 'restricted': return 0.8;
      default: return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'in_progress': return '#ff9800';
      case 'restricted': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const renderRequirements = () => {
    if (!account?.requirements) return null;

    const { currently_due, eventually_due, past_due } = account.requirements;
    const allRequirements = [...currently_due, ...eventually_due, ...past_due];

    if (allRequirements.length === 0) return null;

    return (
      <Card style={styles.requirementsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.requirementsTitle}>
            Outstanding Requirements
          </Text>
          
          {past_due.length > 0 && (
            <View style={styles.requirementSection}>
              <Text style={[styles.requirementLabel, { color: '#f44336' }]}>
                Past Due (Urgent)
              </Text>
              {past_due.map((req, index) => (
                <List.Item
                  key={index}
                  title={req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  left={() => <List.Icon icon="alert-circle" color="#f44336" />}
                />
              ))}
            </View>
          )}

          {currently_due.length > 0 && (
            <View style={styles.requirementSection}>
              <Text style={[styles.requirementLabel, { color: '#ff9800' }]}>
                Currently Due
              </Text>
              {currently_due.map((req, index) => (
                <List.Item
                  key={index}
                  title={req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  left={() => <List.Icon icon="clock-outline" color="#ff9800" />}
                />
              ))}
            </View>
          )}

          {eventually_due.length > 0 && (
            <View style={styles.requirementSection}>
              <Text style={[styles.requirementLabel, { color: '#2196f3' }]}>
                Eventually Due
              </Text>
              {eventually_due.map((req, index) => (
                <List.Item
                  key={index}
                  title={req.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  left={() => <List.Icon icon="information-outline" color="#2196f3" />}
                />
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (!account) {
    return (
      <View style={styles.container}>
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Set Up Your Merchant Account
            </Text>
            
            <Text variant="bodyLarge" style={styles.description}>
              To start accepting payments and selling on the platform, you'll need to create a Stripe Connect merchant account.
            </Text>

            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>✓ Accept credit card payments</Text>
              <Text style={styles.benefitItem}>✓ Automatic payouts to your bank account</Text>
              <Text style={styles.benefitItem}>✓ Transaction history and reporting</Text>
              <Text style={styles.benefitItem}>✓ Secure payment processing</Text>
            </View>

            <Button
              mode="contained"
              onPress={handleCreateAccount}
              loading={creatingAccount}
              disabled={creatingAccount}
              style={styles.createButton}
            >
              Create Merchant Account
            </Button>

            <Text variant="bodySmall" style={styles.disclaimer}>
              You'll be redirected to Stripe to complete the secure onboarding process.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Text variant="headlineSmall" style={styles.title}>
              Merchant Account Setup
            </Text>
            <Chip 
              mode="flat" 
              style={[styles.statusChip, { backgroundColor: getStatusColor(account.onboarding_status) + '20' }]}
              textStyle={{ color: getStatusColor(account.onboarding_status) }}
            >
              {account.onboarding_status.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>

          <Text variant="bodyLarge" style={styles.statusDescription}>
            {account.onboarding_status === 'completed' 
              ? 'Your merchant account is fully set up and ready to accept payments!'
              : 'Complete your merchant account setup to start accepting payments.'
            }
          </Text>

          <View style={styles.progressSection}>
            <Text variant="bodyMedium" style={styles.progressLabel}>
              Setup Progress
            </Text>
            <ProgressBar 
              progress={getOnboardingProgress()} 
              color="#6200ee" 
              style={styles.progressBar}
            />
            <Text variant="bodySmall" style={styles.progressText}>
              {Math.round(getOnboardingProgress() * 100)}% Complete
            </Text>
          </View>

          <View style={styles.capabilitiesSection}>
            <Text variant="titleMedium" style={styles.capabilitiesTitle}>
              Account Capabilities
            </Text>
            
            <View style={styles.capabilityRow}>
              <Text style={styles.capabilityLabel}>Accept Payments:</Text>
              <Chip 
                mode="flat" 
                style={[styles.capabilityChip, { 
                  backgroundColor: account.charges_enabled ? '#e8f5e8' : '#ffebee' 
                }]}
                textStyle={{ 
                  color: account.charges_enabled ? '#2e7d32' : '#c62828' 
                }}
              >
                {account.charges_enabled ? 'Enabled' : 'Disabled'}
              </Chip>
            </View>

            <View style={styles.capabilityRow}>
              <Text style={styles.capabilityLabel}>Receive Payouts:</Text>
              <Chip 
                mode="flat" 
                style={[styles.capabilityChip, { 
                  backgroundColor: account.payouts_enabled ? '#e8f5e8' : '#ffebee' 
                }]}
                textStyle={{ 
                  color: account.payouts_enabled ? '#2e7d32' : '#c62828' 
                }}
              >
                {account.payouts_enabled ? 'Enabled' : 'Disabled'}
              </Chip>
            </View>
          </View>

          {!isOnboardingComplete && (
            <Button
              mode="contained"
              onPress={handleContinueOnboarding}
              style={styles.continueButton}
            >
              Continue Setup
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={refreshAccountStatus}
            loading={loading}
            disabled={loading}
            style={styles.refreshButton}
          >
            Refresh Status
          </Button>
        </Card.Content>
      </Card>

      {renderRequirements()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  welcomeCard: {
    marginBottom: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  requirementsCard: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  benefitsList: {
    marginBottom: 24,
  },
  benefitItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  createButton: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  disclaimer: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'right',
    color: '#666',
  },
  capabilitiesSection: {
    marginBottom: 24,
  },
  capabilitiesTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  capabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capabilityLabel: {
    fontSize: 16,
  },
  capabilityChip: {
    alignSelf: 'flex-end',
  },
  continueButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  refreshButton: {
    paddingVertical: 8,
  },
  requirementsTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  requirementSection: {
    marginBottom: 16,
  },
  requirementLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default StripeConnectOnboardingScreen;
