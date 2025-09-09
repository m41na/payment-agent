import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StripeProvider } from '@stripe/stripe-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ProfileProvider } from './src/contexts/ProfileContext';
import { PreferencesProvider } from './src/contexts/PreferencesContext';
import { PaymentProvider } from './src/contexts/PaymentContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { OnboardingProvider, useOnboarding } from './src/contexts/OnboardingContext';
import { StripeConnectProvider, useStripeConnect } from './src/contexts/StripeConnectContext';
import { InventoryProvider } from './src/contexts/InventoryContext';
import { TransactionHistoryProvider } from './src/contexts/TransactionHistoryContext';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import StripeConnectOnboardingScreen from './src/screens/StripeConnectOnboardingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ListingScreen from './src/screens/ListingScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import StorefrontScreen from './src/screens/StorefrontScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';
import SellerDashboardScreen from './src/screens/SellerDashboardScreen';
import MessagingScreen from './src/screens/MessagingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    surface: '#ffffff',
    background: '#f5f5f5',
  },
};

const ProfileStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.primary,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}
  >
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
    <Stack.Screen 
      name="PaymentMethods" 
      component={PaymentMethodsScreen}
      options={{ title: 'Payment Methods' }}
    />
  </Stack.Navigator>
);

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            case 'Listing':
              iconName = focused ? 'map-marker' : 'map-marker-outline';
              break;
            case 'Checkout':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Storefront':
              iconName = focused ? 'store' : 'store-outline';
              break;
            case 'Messaging':
              iconName = focused ? 'message' : 'message-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Listing" 
        component={ListingScreen}
        options={{ title: 'Discover' }}
      />
      <Tab.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Cart' }}
      />
      <Tab.Screen 
        name="Storefront" 
        component={StorefrontScreen}
        options={{ title: 'Store' }}
      />
      <Tab.Screen 
        name="Messaging" 
        component={MessagingScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading: authLoading } = useAuth();
  const { hasCompletedOnboarding, completeOnboarding, loading: onboardingLoading } = useOnboarding();

  if (authLoading || onboardingLoading) {
    return null; // You can add a loading screen here
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        hasCompletedOnboarding ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onComplete={completeOnboarding} />}
          </Stack.Screen>
        )
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  const stripePublishableKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <StripeProvider publishableKey={stripePublishableKey!}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <ProfileProvider>
            <PreferencesProvider>
              <OnboardingProvider>
                <StripeConnectProvider>
                  <PaymentProvider>
                    <SubscriptionProvider>
                      <LocationProvider>
                        <InventoryProvider>
                          <TransactionHistoryProvider>
                            <NavigationContainer>
                              <AppNavigator />
                              <StatusBar style="light" />
                            </NavigationContainer>
                          </TransactionHistoryProvider>
                        </InventoryProvider>
                      </LocationProvider>
                    </SubscriptionProvider>
                  </PaymentProvider>
                </StripeConnectProvider>
              </OnboardingProvider>
            </PreferencesProvider>
          </ProfileProvider>
        </AuthProvider>
      </PaperProvider>
    </StripeProvider>
  );
}
