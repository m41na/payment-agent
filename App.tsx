import React from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator } from 'react-native';
import { IntegratedAppNavigator } from './src/navigation/IntegratedAppNavigator';
import AuthScreen from './src/screens/AuthScreen.container';
import AppProviders from './src/providers/AppProviders';
import { useAuth } from './src/contexts/AuthContext';
import { PaperProvider } from 'react-native-paper';

/**
 * Authentication Gate Component
 * 
 * Determines app entry based on authentication status:
 * - Unauthenticated: Shows AuthScreen
 * - Authenticated: Shows full marketplace experience
 * - Loading: Shows loading indicator
 */
const AuthenticatedApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6366f1' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <IntegratedAppNavigator />;
};

/**
 * Main App Component - Production Ready with Authentication
 * 
 * Features:
 * - Real Supabase authentication gate
 * - Modern UI/UX design system
 * - Event-driven marketplace architecture
 * - Production-grade error handling
 */
export default function App() {
  return (
    <PaperProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppProviders>
          <AuthenticatedApp />
        </AppProviders>
      </SafeAreaView>
    </PaperProvider>
  );
}
