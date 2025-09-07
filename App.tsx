import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { IntegratedAppNavigator } from './src/navigation/IntegratedAppNavigator';
import AppProviders from './src/providers/AppProviders';

/**
 * Main App Component - Full Marketplace Experience
 * 
 * Using IntegratedAppNavigator to provide complete marketplace UI with:
 * - Product discovery and shopping
 * - Real-time messaging
 * - Event management
 * - Merchant tools
 * - User profile and referrals
 * - Cross-feature event-driven navigation
 */
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppProviders>
          <IntegratedAppNavigator />
        </AppProviders>
      </SafeAreaView>
    </>
  );
}
