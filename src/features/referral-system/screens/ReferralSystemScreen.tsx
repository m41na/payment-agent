import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { appTheme } from '../../theme';

const ReferralSystemScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Referrals</Text>
      <Text style={styles.subtitle}>Earn rewards by referring friends</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <Text style={styles.code}>COFFEE2024</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Referral Stats</Text>
        <Text>Total referrals: 5</Text>
        <Text>Rewards earned: $25.00</Text>
        <Text>Pending rewards: $10.00</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: appTheme.colors.textSecondary,
    marginBottom: 24,
  },
  section: {
    backgroundColor: appTheme.colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  code: {
    fontSize: 20,
    fontWeight: 'bold',
    color: appTheme.colors.primary,
    textAlign: 'center',
    padding: 12,
    backgroundColor: appTheme.colors.surfaceElevated,
    borderRadius: 8,
  },
});

export default ReferralSystemScreen;
