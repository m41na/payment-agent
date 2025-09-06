import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import MinimalFoundationTest from './src/test/MinimalFoundationTest';

/**
 * Main App Component - Minimal Foundation Test
 * 
 * Using MinimalFoundationTest to avoid external dependency issues
 * and get the app running with basic functionality.
 */
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <MinimalFoundationTest />
      </SafeAreaView>
    </>
  );
}
