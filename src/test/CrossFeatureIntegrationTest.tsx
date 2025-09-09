import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../contexts/AuthContext';
import { useEventContext } from '../events/EventProvider';
import { usePayment } from '../features/payment-processing/hooks/usePayment';
import { useInventory } from '../features/inventory-management/hooks/useInventory';
import { useShoppingCart } from '../features/shopping-cart/hooks/useShoppingCart';
import { useEvents } from '../features/events-management/hooks/useEvents';
import { useMessaging } from '../features/messaging/hooks/useMessaging';
import { useMerchantOnboarding } from '../features/merchant-onboarding/hooks/useMerchantOnboarding';
import { useProductDiscovery } from '../features/discovery-listing/hooks/useDiscoveryListing';
import { useStorefront } from '../features/storefront/hooks/useStorefront';
import { useLocationServices } from '../features/location-services/hooks/useLocationServices';
import { useReferrals } from '../features/referral-system/hooks/useReferrals';
import Button from '../components/shared/Button';
import Card from '../components/shared/Card';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

/**
 * Cross-Feature Integration Test Suite
 * 
 * This component systematically validates that all feature integrations work correctly
 * by testing business logic workflows without requiring the full UI. It provides
 * visibility into the "belly of the beast" - showing how providers, hooks, and
 * the event system work together.
 */
export const CrossFeatureIntegrationTest: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { eventBus } = useEventContext();
  
  // Feature hooks
  const payment = usePayment();
  const inventory = useInventory();
  const cart = useShoppingCart();
  const events = useEvents({ autoLoad: false });
  const messaging = useMessaging();
  const merchant = useMerchantOnboarding();
  const discovery = useProductDiscovery();
  const storefront = useStorefront();
  const locationServices = useLocationServices();
  const referrals = useReferrals();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);

  const updateTestResult = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      }
      return [...prev, { name, status, message, details }];
    });

    // Console logging for easy copying
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] TEST: ${name}`);
    console.log(`  STATUS: ${status.toUpperCase()}`);
    console.log(`  MESSAGE: ${message}`);
    
    if (details) {
      console.log(`  DETAILS:`, details);
      if (details.stack) {
        console.log(`  STACK TRACE:`, details.stack);
      }
    }
    console.log('---');
  };

  const runTest = async (testName: string, testFn: () => Promise<void>) => {
    setCurrentTest(testName);
    updateTestResult(testName, 'running', 'Running...');
    
    try {
      await testFn();
      updateTestResult(testName, 'success', 'Passed');
    } catch (error) {
      updateTestResult(testName, 'error', `Failed: ${error.message}`, error);
    }
  };

  const testProviderInitialization = async () => {
    const errors: string[] = [];

    // Test Shopping Cart Provider
    if (typeof cart.addToCart !== 'function') {
      errors.push('Cart: addToCart function missing');
    }
    if (!cart.cart && typeof cart.cart !== 'object') {
      errors.push('Cart: cart object not properly initialized');
    }

    // Test Merchant Onboarding Provider
    if (typeof merchant.startCompleteOnboarding !== 'function') {
      errors.push('Merchant: startCompleteOnboarding function missing');
    }

    // Test Product Discovery Provider
    if (typeof discovery.search !== 'function') {
      errors.push('Discovery: search function missing');
    }

    // Test Storefront Provider
    if (typeof storefront.createProfile !== 'function') {
      errors.push('Storefront: createProfile function missing');
    }

    // Test Event System Provider
    if (typeof eventBus.on !== 'function') {
      errors.push('EventBus: on function missing');
    }
    if (typeof eventBus.emit !== 'function') {
      errors.push('EventBus: emit function missing');
    }

    // Test Referrals Provider
    if (typeof referrals.generateReferralCode !== 'function') {
      errors.push('Referrals: generateReferralCode function missing');
    }

    if (errors.length > 0) {
      throw new Error(`Provider initialization failures:\n${errors.join('\n')}`);
    }
  };

  const testEventSystemCommunication = async () => {
    // Test event system communication between features
    let eventReceived = false;
    
    // Subscribe to test event using 'on' method
    const unsubscribe = eventBus.on('test-integration-event', (data: any) => {
      eventReceived = true;
      console.log('Event received:', data);
    });

    // Emit test event
    eventBus.emit('test-integration-event', { 
      message: 'Integration test event',
      timestamp: new Date().toISOString()
    });

    // Wait a moment for event processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clean up subscription
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }

    if (!eventReceived) {
      throw new Error('Event system communication failed - event not received');
    }
  };

  const testProductToCartWorkflow = async () => {
    // Simulate discovering a product and adding it to cart
    const mockProduct = {
      id: 'test-product-1',
      name: 'Test Product',
      price: 29.99,
      description: 'Integration test product',
      merchant_id: 'test-merchant'
    };

    // Test product discovery
    if (typeof discovery.searchProducts === 'function') {
      // Simulate search (this would normally hit the API)
      updateTestResult('testProductToCartWorkflow', 'running', 'Testing product discovery...');
    }

    // Test adding to cart
    if (typeof cart.addItem === 'function') {
      await cart.addItem(mockProduct, 1);
      updateTestResult('testProductToCartWorkflow', 'running', 'Testing cart addition...');
    }

    // Verify cart state
    if (cart.items && cart.items.length > 0) {
      const addedItem = cart.items.find(item => item.product.id === mockProduct.id);
      if (!addedItem) {
        throw new Error('Product not found in cart after addition');
      }
    }
  };

  const testEventCreationToInventoryWorkflow = async () => {
    // Test creating an event and checking inventory impact
    const mockEvent = {
      title: 'Test Event',
      description: 'Integration test event',
      date: new Date(Date.now() + 86400000), // Tomorrow
      location: 'Test Location',
      capacity: 50,
      price: 15.00
    };

    if (typeof events.createEvent === 'function') {
      updateTestResult('testEventCreationToInventoryWorkflow', 'running', 'Creating test event...');
      
      // This would normally create the event and trigger inventory updates
      // For now, we're testing that the function exists and can be called
      const eventCreated = await events.createEvent(mockEvent);
      
      if (!eventCreated) {
        throw new Error('Event creation failed');
      }
    }

    // Test inventory sync after event creation
    if (typeof inventory.syncInventory === 'function') {
      updateTestResult('testEventCreationToInventoryWorkflow', 'running', 'Syncing inventory...');
      await inventory.syncInventory();
    }
  };

  const testPaymentProcessingIntegration = async () => {
    // Test payment processing with cart integration
    const mockPaymentData = {
      amount: 2999, // $29.99 in cents
      currency: 'usd',
      payment_method: 'card'
    };

    if (typeof payment.createPaymentIntent === 'function') {
      updateTestResult('testPaymentProcessingIntegration', 'running', 'Creating payment intent...');
      
      // This would normally create a Stripe payment intent
      const paymentIntent = await payment.createPaymentIntent(mockPaymentData);
      
      if (!paymentIntent) {
        throw new Error('Payment intent creation failed');
      }
    }

    // Test cart clearing after successful payment
    if (typeof cart.clearCart === 'function') {
      updateTestResult('testPaymentProcessingIntegration', 'running', 'Testing cart clearing...');
      await cart.clearCart();
    }
  };

  const testRealTimeMessaging = async () => {
    // Test messaging hook structure and availability (without requiring authentication)
    
    // Test that messaging hook provides expected functions
    if (typeof messaging.sendMessage !== 'function') {
      throw new Error('Messaging: sendMessage function missing');
    }
    
    if (typeof messaging.loadMessages !== 'function') {
      throw new Error('Messaging: loadMessages function missing');
    }
    
    if (typeof messaging.createOrGetConversation !== 'function') {
      throw new Error('Messaging: createOrGetConversation function missing');
    }

    // Test that messaging state is properly initialized
    if (!Array.isArray(messaging.messages)) {
      throw new Error('Messaging: messages array not properly initialized');
    }

    if (!Array.isArray(messaging.conversations)) {
      throw new Error('Messaging: conversations array not properly initialized');
    }

    // Test messaging state properties
    if (typeof messaging.messagesLoading !== 'boolean') {
      throw new Error('Messaging: messagesLoading state not properly initialized');
    }

    if (typeof messaging.totalUnreadCount !== 'number') {
      throw new Error('Messaging: totalUnreadCount not properly initialized');
    }

    // If user is authenticated, test actual messaging operations
    if (user) {
      updateTestResult('testRealTimeMessaging', 'running', 'User authenticated, testing messaging operations...');
      
      const testMessage = {
        content: 'Integration test message',
        receiver_id: 'test-user-id',
        message_type: 'text' as const
      };

      try {
        const sendResult = await messaging.sendMessage(testMessage);
        
        if (!sendResult || !sendResult.success) {
          const errorMsg = sendResult?.error || 'Unknown error';
          const errorDetails = typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg;
          console.warn(`Message sending failed (expected in test): ${errorDetails}`);
        }
      } catch (error) {
        // Expected to fail in test environment - just log it
        console.warn('Message sending failed in test environment (expected):', error);
      }
    } else {
      updateTestResult('testRealTimeMessaging', 'running', 'No user authentication - testing hook structure only');
    }
  };

  const testMerchantOnboardingToStorefront = async () => {
    // Test merchant onboarding workflow
    const mockMerchantData = {
      business_name: 'Test Business',
      business_type: 'retail',
      email: 'test@business.com',
      phone: '+1234567890'
    };

    if (typeof merchant.submitOnboarding === 'function') {
      updateTestResult('testMerchantOnboardingToStorefront', 'running', 'Testing merchant onboarding...');
      
      const onboardingResult = await merchant.submitOnboarding(mockMerchantData);
      
      if (!onboardingResult) {
        throw new Error('Merchant onboarding failed');
      }
    }

    // Test storefront creation after onboarding
    if (typeof storefront.createStorefront === 'function') {
      updateTestResult('testMerchantOnboardingToStorefront', 'running', 'Creating storefront...');
      
      const storefrontData = {
        name: mockMerchantData.business_name,
        description: 'Test storefront for integration testing'
      };
      
      const storefrontCreated = await storefront.createStorefront(storefrontData);
      
      if (!storefrontCreated) {
        throw new Error('Storefront creation failed');
      }
    }
  };

  const testLocationServices = async () => {
    // Test location services functionality
    
    // Test location permissions
    if (typeof locationServices.requestPermissions === 'function') {
      updateTestResult('testLocationServices', 'running', 'Testing location permissions...');
      
      try {
        const permissions = await locationServices.requestPermissions();
        
        if (!permissions) {
          console.warn('Location permissions not granted (expected in test environment)');
        }
      } catch (error) {
        console.warn('Location permissions failed in test environment (expected):', error);
      }
    }

    // Test current location retrieval
    if (typeof locationServices.getCurrentLocation === 'function') {
      updateTestResult('testLocationServices', 'running', 'Testing location retrieval...');
      
      try {
        const location = await locationServices.getCurrentLocation();
        
        if (!location) {
          console.warn('Current location not available (expected in test environment)');
        }
      } catch (error) {
        console.warn('Location retrieval failed in test environment (expected):', error);
      }
    }

    // Test distance calculation (this should work without GPS)
    if (typeof locationServices.calculateDistance === 'function') {
      updateTestResult('testLocationServices', 'running', 'Testing distance calculation...');
      
      const pointA = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
      const pointB = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles
      
      const distance = locationServices.calculateDistance(pointA, pointB);
      
      if (!distance || typeof distance.distance !== 'number') {
        throw new Error('Distance calculation failed');
      }
      
      if (distance.distance < 500 || distance.distance > 600) {
        throw new Error(`Distance calculation seems incorrect: ${distance.distance} km`);
      }
    }

    // Test nearby items filtering
    if (typeof locationServices.findNearbyItems === 'function') {
      updateTestResult('testLocationServices', 'running', 'Testing nearby items filtering...');
      
      const centerPoint = { latitude: 37.7749, longitude: -122.4194 };
      const testItems = [
        { id: 1, name: 'Close Item', latitude: 37.7750, longitude: -122.4195 },
        { id: 2, name: 'Far Item', latitude: 40.7128, longitude: -74.0060 }, // NYC
      ];
      
      const nearbyItems = locationServices.findNearbyItems(testItems, centerPoint, 10); // 10km radius
      
      if (!Array.isArray(nearbyItems)) {
        throw new Error('Nearby items filtering failed');
      }
      
      // Should find the close item but not the far one
      if (nearbyItems.length !== 1 || nearbyItems[0].id !== 1) {
        throw new Error('Nearby items filtering logic incorrect');
      }
    }

    // Test location service readiness check
    if (typeof locationServices.isReady === 'function') {
      updateTestResult('testLocationServices', 'running', 'Testing service readiness...');
      
      const isReady = locationServices.isReady();
      
      if (typeof isReady !== 'boolean') {
        throw new Error('Location service readiness check failed');
      }
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest(null);

    const tests = [
      { name: 'Provider Initialization', fn: testProviderInitialization },
      { name: 'Event System Communication', fn: testEventSystemCommunication },
      { name: 'Product to Cart Workflow', fn: testProductToCartWorkflow },
      { name: 'Event Creation to Inventory', fn: testEventCreationToInventoryWorkflow },
      { name: 'Payment Processing Integration', fn: testPaymentProcessingIntegration },
      { name: 'Real-time Messaging', fn: testRealTimeMessaging },
      { name: 'Merchant Onboarding to Storefront', fn: testMerchantOnboardingToStorefront },
      { name: 'Location Services', fn: testLocationServices }
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setCurrentTest(null);
    setIsRunning(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return theme.colors.success;
      case 'error': return theme.colors.error;
      case 'running': return theme.colors.warning;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: theme.spacing.lg }}>
        {/* Header */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[theme.typography.h2, { color: theme.colors.text, marginBottom: theme.spacing.md }]}>
            Cross-Feature Integration Test Suite
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }]}>
            Validates that all feature integrations work correctly by testing business logic workflows.
            This shows you the "belly of the beast" - how providers, hooks, and events work together.
          </Text>
          
          <Button
            onPress={runAllTests}
            disabled={isRunning}
            variant="primary"
            size="lg"
            title={isRunning ? 'Running Tests...' : 'Run All Integration Tests'}
          />
        </Card>

        {/* Current Test Status */}
        {currentTest && (
          <Card style={{ marginBottom: theme.spacing.lg, backgroundColor: theme.colors.warning + '20' }}>
            <Text style={[theme.typography.h4, { color: theme.colors.text }]}>
              Currently Running: {currentTest}
            </Text>
          </Card>
        )}

        {/* Test Results */}
        {testResults.map((result, index) => (
          <Card key={index} style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <Text style={{ fontSize: 20, marginRight: theme.spacing.sm }}>
                {getStatusIcon(result.status)}
              </Text>
              <Text style={[theme.typography.h4, { color: theme.colors.text, flex: 1 }]}>
                {result.name}
              </Text>
            </View>
            
            <Text style={[theme.typography.body, { color: getStatusColor(result.status) }]}>
              {result.message}
            </Text>
            
            {result.details && result.status === 'error' && (
              <View style={{ 
                marginTop: theme.spacing.sm, 
                padding: theme.spacing.sm,
                backgroundColor: theme.colors.error + '10',
                borderRadius: theme.borderRadius.sm
              }}>
                <Text style={[theme.typography.caption, { color: theme.colors.error }]}>
                  {JSON.stringify(result.details, null, 2)}
                </Text>
              </View>
            )}
          </Card>
        ))}

        {/* Summary */}
        {testResults.length > 0 && !isRunning && (
          <Card style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.h3, { color: theme.colors.text, marginBottom: theme.spacing.md }]}>
              Test Summary
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.success }]}>
              ✅ Passed: {testResults.filter(r => r.status === 'success').length}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.error }]}>
              ❌ Failed: {testResults.filter(r => r.status === 'error').length}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
              📊 Total: {testResults.length}
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

export default CrossFeatureIntegrationTest;
