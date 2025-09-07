import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import FoundationTest from './src/test/FoundationTest';

/**
 * Main App Component - Full Foundation Test
 * 
 * Using FoundationTest with complete provider hierarchy to test
 * all features and external service integrations.
 */
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <FoundationTest />
      </SafeAreaView>
    </>
  );
}
