import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
// import { IntegratedAppNavigator } from './src/navigation/IntegratedAppNavigator';
import { EventFlowDemo } from './src/demos/EventFlowDemo';
import AppProviders from './src/providers/AppProviders';

/**
 * Main App Component - EVENT FLOW DEMO MODE
 * 
 * Temporarily showing EventFlowDemo to visualize the event system.
 * Switch back to IntegratedAppNavigator for full marketplace experience.
 */
export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppProviders>
          <EventFlowDemo />
        </AppProviders>
      </SafeAreaView>
    </>
  );
}
