import React from 'react';
import { SafeAreaView, StatusBar, View, ActivityIndicator } from 'react-native';
import { IntegratedAppNavigator } from './src/navigation/IntegratedAppNavigator';
import AuthScreen from './src/screens/AuthScreenContainer';
import { useAuth } from './src/contexts/AuthContext';
import { PaperProvider } from 'react-native-paper';

// Import providers individually for incremental testing
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { ErrorBoundaryProvider } from './src/providers/ErrorBoundaryProvider';
import { ThemeProvider } from './src/providers/ThemeProvider';
import { LoadingProvider } from './src/providers/LoadingProvider';
import { EventProvider } from './src/events/EventProvider';
import { ProductDiscoveryProvider } from './src/providers/DiscoveryListingProvider';
import { ReferralSystemProvider } from './src/providers/ReferralSystemProvider';

// Add core context providers that are likely needed
import { PaymentProvider } from './src/contexts/PaymentContext';
import { InventoryProvider } from './src/contexts/InventoryContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';

// Add essential feature providers
import { UserProfileProvider } from './src/providers/UserProfileProvider';
import { PaymentProcessingProvider } from './src/providers/PaymentProcessingProvider';
import { ShoppingCartProvider } from './src/providers/ShoppingCartProvider';
import { MessagingProvider } from './src/providers/MessagingProvider';
import { StorefrontProvider } from './src/providers/StorefrontProvider';
import { LocationServicesProvider } from './src/providers/LocationServicesProvider';
import { InventoryManagementProvider } from './src/providers/InventoryManagementProvider';
import { MerchantOnboardingProvider } from './src/providers/MerchantOnboardingProvider';
import { EventsManagementProvider } from './src/providers/EventsManagementProvider';

/**
 * Incremental Provider Stack - Adding providers systematically
 * We know these work, now adding more functionality step by step
 */
const MinimalProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundaryProvider>
      <ThemeProvider>
        <LoadingProvider>
          <EventProvider>
            <AuthProvider>
              <UserProfileProvider>
                <LocationProvider>
                  <LocationServicesProvider>
                    <PaymentProvider>
                      <SubscriptionProvider>
                        <InventoryProvider>
                          <InventoryManagementProvider>
                            <PaymentProcessingProvider>
                              <ProductDiscoveryProvider>
                                <ReferralSystemProvider>
                                  <ShoppingCartProvider>
                                    <MerchantOnboardingProvider>
                                      <StorefrontProvider>
                                        <MessagingProvider>
                                          <EventsManagementProvider>
                                            {children}
                                          </EventsManagementProvider>
                                        </MessagingProvider>
                                      </StorefrontProvider>
                                    </MerchantOnboardingProvider>
                                  </ShoppingCartProvider>
                                </ReferralSystemProvider>
                              </ProductDiscoveryProvider>
                            </PaymentProcessingProvider>
                          </InventoryManagementProvider>
                        </InventoryProvider>
                      </SubscriptionProvider>
                    </PaymentProvider>
                  </LocationServicesProvider>
                </LocationProvider>
              </UserProfileProvider>
            </AuthProvider>
          </EventProvider>
        </LoadingProvider>
      </ThemeProvider>
    </ErrorBoundaryProvider>
  );
};

/**
 * Authentication Gate Component
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
 * Main App Component - Minimal Provider Testing
 */
export default function App() {
  return (
    <PaperProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <MinimalProviders>
          <AuthenticatedApp />
        </MinimalProviders>
      </SafeAreaView>
    </PaperProvider>
  );
}
