import React from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator } from 'react-native';
import { IntegratedAppNavigator } from './src/navigation/IntegratedAppNavigator';
import AuthenticationScreen from './src/features/user-auth/screens/AuthenticationScreen';
import AppProviders from './src/providers/AppProviders';
import { useAuth } from './src/features/user-auth/context/AuthContext';
import { PaperProvider } from 'react-native-paper';
import { paperTheme } from './src/features/theme';

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: paperTheme.colors.primary }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!user) {
    return <AuthenticationScreen />;
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
    <PaperProvider theme={paperTheme}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <AppProviders>
          <AuthenticatedApp />
        </AppProviders>
      </SafeAreaView>
    </PaperProvider>
  );
}
