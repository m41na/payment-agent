import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppProviders from './src/providers/AppProviders';
import AppNavigator from './src/navigation/AppNavigator';
import { useTheme } from './src/providers/ThemeProvider';

/**
 * Root App Component with integrated provider architecture
 */
const AppContent = () => {
  const { isDark } = useTheme();
  
  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

/**
 * Main App Component
 * 
 * This is the entry point for the integrated marketplace application.
 * It sets up the complete provider architecture and navigation system
 * that enables all features to work together cohesively.
 */
export default function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
