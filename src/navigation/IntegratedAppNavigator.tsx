import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useEventListener, EVENT_TYPES } from '../events';

// Import integrated feature components
import DiscoveryListingContainer from '../features/discovery-listing/containers/DiscoveryListingContainer';
import IntegratedCheckoutFlow from '../features/payment-processing/components/IntegratedCheckoutFlow';
import MessagingContainer from '../features/messaging/containers/MessagingContainer';

// Import existing components (would be created/imported from features)
import ProfileManagementContainer from '../features/profile-management/containers/ProfileManagementContainer';
import StorefrontContainer from '../features/storefront/containers/StorefrontContainer';
import EventsManagementScreen from '../features/events-management/screens/EventsManagementScreen';
import ReferralSystemScreen from '../features/referral-system/screens/ReferralSystemScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * Integrated App Navigator
 * 
 * Provides unified navigation that connects all features with:
 * - Event-driven navigation updates
 * - Cross-feature deep linking
 * - Context-aware navigation badges
 * - Seamless feature transitions
 */

// Discovery Stack - Product discovery and shopping
const DiscoveryStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="DiscoveryListing" 
        component={DiscoveryListingContainer}
        options={{ title: 'Discover' }}
      />
      <Stack.Screen 
        name="Checkout" 
        component={IntegratedCheckoutFlow}
        options={{ title: 'Checkout' }}
      />
    </Stack.Navigator>
  );
};

// Commerce Stack - Shopping cart and payments
const CommerceStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="Cart" 
        component={IntegratedCheckoutFlow}
        options={{ title: 'Cart' }}
      />
    </Stack.Navigator>
  );
};

// Messages Stack - Messaging and communication
const MessagesStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="Messages" 
        component={MessagingContainer}
        options={{ title: 'Messages' }}
      />
    </Stack.Navigator>
  );
};

// Storefront Stack - Merchant and storefront management
const StorefrontStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="Storefront" 
        component={StorefrontContainer}
        options={{ title: 'Storefront' }}
      />
    </Stack.Navigator>
  );
};

// Profile Stack - User profile and settings
const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="Profile" 
        component={ProfileManagementContainer}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Referrals" 
        component={ReferralSystemScreen}
        options={{ title: 'Referrals' }}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator with Event Integration
const MainTabNavigator = () => {
  const [messageBadge, setMessageBadge] = React.useState(0);
  const [cartBadge, setCartBadge] = React.useState(0);

  // Listen for new messages to update badge
  useEventListener(EVENT_TYPES.MESSAGE_RECEIVED, () => {
    setMessageBadge(prev => prev + 1);
  });

  // Listen for cart updates to update badge
  useEventListener(EVENT_TYPES.CART_ITEM_ADDED, () => {
    setCartBadge(prev => prev + 1);
  });

  // Listen for checkout completion to clear cart badge
  useEventListener(EVENT_TYPES.PAYMENT_SUCCESS, () => {
    setCartBadge(0);
  });

  // Listen for message read to update badge
  useEventListener(EVENT_TYPES.MESSAGE_SENT, () => {
    // This would typically come from a message read event
    // For demo, we'll just decrement
    setMessageBadge(prev => Math.max(0, prev - 1));
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="DiscoveryTab"
        component={DiscoveryStack}
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🔍</Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="CommerceTab"
        component={CommerceStack}
        options={{
          title: 'Cart',
          tabBarBadge: cartBadge > 0 ? cartBadge : undefined,
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🛒</Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStack}
        options={{
          title: 'Messages',
          tabBarBadge: messageBadge > 0 ? messageBadge : undefined,
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💬</Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="StorefrontTab"
        component={StorefrontStack}
        options={{
          title: 'Storefront',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏪</Text>
          ),
        }}
      />
      
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator with Deep Linking Support
export const IntegratedAppNavigator: React.FC = () => {
  // Listen for navigation events to handle deep linking
  useEventListener(EVENT_TYPES.PRODUCT_VIEWED, (productData) => {
    console.log('Product viewed, could navigate to product details:', productData);
    // navigationRef.current?.navigate('ProductDetails', { productId: productData.productId });
  });

  useEventListener(EVENT_TYPES.PAYMENT_SUCCESS, (paymentData) => {
    console.log('Payment successful, could navigate to success screen:', paymentData);
    // navigationRef.current?.navigate('PaymentSuccess', { transactionId: paymentData.transactionId });
  });

  useEventListener(EVENT_TYPES.MESSAGE_RECEIVED, (messageData) => {
    console.log('Message received, could navigate to conversation:', messageData);
    // navigationRef.current?.navigate('MessagesTab', { 
    //   screen: 'Messages', 
    //   params: { conversationId: messageData.conversationId } 
    // });
  });

  useEventListener(EVENT_TYPES.REFERRAL_REWARD_EARNED, (referralData) => {
    console.log('Referral reward earned, could show celebration:', referralData);
    // Show celebration modal or navigate to referrals screen
  });

  return (
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  );
};

export default IntegratedAppNavigator;
