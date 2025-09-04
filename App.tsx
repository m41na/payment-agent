import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { PaymentProvider } from './src/contexts/PaymentContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import PaymentMethodsScreen from './src/screens/PaymentMethodsScreen';

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

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // You can add a loading screen here
  }

  return (
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
      {user ? (
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ title: 'Payment Agent' }}
          />
          <Stack.Screen 
            name="PaymentMethods" 
            component={PaymentMethodsScreen}
            options={{ title: 'Payment Methods' }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ headerShown: false }}
        />
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
          <PaymentProvider>
            <NavigationContainer>
              <AppNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
          </PaymentProvider>
        </AuthProvider>
      </PaperProvider>
    </StripeProvider>
  );
}
