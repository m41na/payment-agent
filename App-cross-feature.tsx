import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import CrossFeatureIntegrationTest from './src/test/CrossFeatureIntegrationTest';
import AppProviders from './src/providers/AppProviders';

/**
 * Main App Component - Cross-Feature Integration Test
 * 
 * Using CrossFeatureIntegrationTest to validate business logic workflows
 * and show how all the plumbing works together without requiring full UI.
 */
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppProviders>
          <CrossFeatureIntegrationTest />
        </AppProviders>
      </SafeAreaView>
    </>
  );
}
