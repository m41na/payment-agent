import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { AppIcons } from '../types/icons';

// Screen imports
import { ProductDiscoveryScreen } from './screens/ProductDiscoveryScreen';
import { MessagingScreen } from './screens/MessagingScreen';
import { UserProfileScreen } from './screens/UserProfileScreen';
import { StorefrontScreen } from './screens/StorefrontScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';

// Feature-specific stack screens
import { ProductDetailsScreen } from './features/discovery-listing/screens/ProductDetailsScreen';
import { ConversationScreen } from './features/messaging/screens/ConversationScreen';
import { PaymentMethodsScreen } from './features/payment-processing/screens/PaymentMethodsScreen';
import { TransactionHistoryScreen } from './features/storefront/screens/TransactionHistoryScreen';
import { ReferralDashboardScreen } from './features/referral-system/screens/ReferralDashboardScreen';
import { LocationSettingsScreen } from './features/location-services/screens/LocationSettingsScreen';

// Navigation types
export type RootTabParamList = {
  Discover: undefined;
  Messages: undefined;
  Profile: undefined;
  Storefront: undefined;
};

export type DiscoverStackParamList = {
  ProductDiscovery: undefined;
  ProductDetails: { productId: string };
  SellerProfile: { sellerId: string };
  Checkout: { productId: string };
};

export type MessagesStackParamList = {
  MessagesList: undefined;
  Conversation: { conversationId: string };
};

export type ProfileStackParamList = {
  UserProfile: undefined;
  PaymentMethods: undefined;
  ReferralDashboard: undefined;
  LocationSettings: undefined;
};

export type StorefrontStackParamList = {
  StorefrontDashboard: undefined;
  TransactionHistory: undefined;
  BusinessSettings: undefined;
};

// Stack navigators
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const StorefrontStack = createNativeStackNavigator<StorefrontStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * Product Discovery Stack Navigator
 * Handles product browsing, details, and purchase flows
 */
const DiscoverStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <DiscoverStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <DiscoverStack.Screen 
        name="ProductDiscovery" 
        component={ProductDiscoveryScreen}
        options={{ title: 'Discover' }}
      />
      <DiscoverStack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen}
        options={{ title: 'Product Details' }}
      />
      <DiscoverStack.Screen 
        name="SellerProfile" 
        component={StorefrontScreen}
        options={{ title: 'Seller Profile' }}
      />
      <DiscoverStack.Screen 
        name="Checkout" 
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
    </DiscoverStack.Navigator>
  );
};

/**
 * Messages Stack Navigator
 * Handles messaging and conversations
 */
const MessagesStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <MessagesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <MessagesStack.Screen 
        name="MessagesList" 
        component={MessagingScreen}
        options={{ title: 'Messages' }}
      />
      <MessagesStack.Screen 
        name="Conversation" 
        component={ConversationScreen}
        options={{ title: 'Chat' }}
      />
    </MessagesStack.Navigator>
  );
};

/**
 * Profile Stack Navigator
 * Handles user profile, settings, and account management
 */
const ProfileStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <ProfileStack.Screen 
        name="UserProfile" 
        component={UserProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen 
        name="PaymentMethods" 
        component={PaymentMethodsScreen}
        options={{ title: 'Payment Methods' }}
      />
      <ProfileStack.Screen 
        name="ReferralDashboard" 
        component={ReferralDashboardScreen}
        options={{ title: 'Referrals' }}
      />
      <ProfileStack.Screen 
        name="LocationSettings" 
        component={LocationSettingsScreen}
        options={{ title: 'Location Settings' }}
      />
    </ProfileStack.Navigator>
  );
};

/**
 * Storefront Stack Navigator
 * Handles merchant storefront management and business operations
 */
const StorefrontStackNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <StorefrontStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <StorefrontStack.Screen 
        name="StorefrontDashboard" 
        component={StorefrontScreen}
        options={{ title: 'My Storefront' }}
      />
      <StorefrontStack.Screen 
        name="TransactionHistory" 
        component={TransactionHistoryScreen}
        options={{ title: 'Transactions' }}
      />
    </StorefrontStack.Navigator>
  );
};

/**
 * Main Tab Navigator
 * Primary navigation structure for the application
 */
const TabNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Discover':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Storefront':
              iconName = focused ? 'business' : 'business-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Discover" 
        component={DiscoverStackNavigator}
        options={{ title: 'Discover' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesStackNavigator}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
      <Tab.Screen 
        name="Storefront" 
        component={StorefrontStackNavigator}
        options={{ title: 'Storefront' }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root App Navigator
 * Main navigation container with deep linking support
 */
export const AppNavigator = () => {
  const { theme } = useTheme();

  const linking = {
    prefixes: ['paymentagent://', 'https://paymentagent.app'],
    config: {
      screens: {
        Discover: {
          screens: {
            ProductDiscovery: 'discover',
            ProductDetails: 'product/:productId',
            SellerProfile: 'seller/:sellerId',
            Checkout: 'checkout/:productId',
          },
        },
        Messages: {
          screens: {
            MessagesList: 'messages',
            Conversation: 'conversation/:conversationId',
          },
        },
        Profile: {
          screens: {
            UserProfile: 'profile',
            PaymentMethods: 'profile/payments',
            ReferralDashboard: 'profile/referrals',
            LocationSettings: 'profile/location',
          },
        },
        Storefront: {
          screens: {
            StorefrontDashboard: 'storefront',
            TransactionHistory: 'storefront/transactions',
          },
        },
      },
    },
  };

  return (
    <NavigationContainer
      linking={linking}
      theme={{
        dark: theme.colors.background === '#111827',
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      }}
    >
      <TabNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;
