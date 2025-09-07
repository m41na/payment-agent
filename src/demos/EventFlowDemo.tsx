import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useEventListener, useEventEmitter, EVENT_TYPES } from '../events/index';

/**
 * EVENT FLOW DEMONSTRATION
 * 
 * This component demonstrates the complete event choreography across
 * all marketplace features. Watch how a single user action triggers
 * a cascade of events that flow through the entire system.
 */

interface EventLog {
  id: string;
  eventType: string;
  feature: string;
  data: any;
  timestamp: Date;
  description: string;
}

export const EventFlowDemo: React.FC = () => {
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const emitEvent = useEventEmitter();

  // Clear log
  const clearLog = () => setEventLog([]);

  // Add event to log
  const logEvent = (eventType: string, feature: string, data: any, description: string) => {
    const newEvent: EventLog = {
      id: `${Date.now()}_${Math.random()}`,
      eventType,
      feature,
      data,
      timestamp: new Date(),
      description,
    };
    setEventLog(prev => [newEvent, ...prev].slice(0, 20)); // Keep last 20 events
  };

  // ============================================================================
  // EVENT LISTENERS - The Nervous System in Action
  // ============================================================================

  // 🔍 Product Discovery Events
  useEventListener(EVENT_TYPES.PRODUCT_VIEWED, (data) => {
    logEvent(EVENT_TYPES.PRODUCT_VIEWED, 'Product Discovery', data, 
      `User viewed ${data.productId} - triggers recommendation engine`);
  });

  // 🛒 Shopping Cart Events
  useEventListener(EVENT_TYPES.CART_ITEM_ADDED, (data) => {
    logEvent(EVENT_TYPES.CART_ITEM_ADDED, 'Shopping Cart', data,
      `Added ${data.productId} to cart - updates inventory, triggers recommendations`);
  });

  useEventListener(EVENT_TYPES.CHECKOUT_INITIATED, (data) => {
    logEvent(EVENT_TYPES.CHECKOUT_INITIATED, 'Shopping Cart', data,
      `Checkout started for ${data.itemCount} items - prepares payment flow`);
  });

  // 💳 Payment Events
  useEventListener(EVENT_TYPES.PAYMENT_SUCCESS, (data) => {
    logEvent(EVENT_TYPES.PAYMENT_SUCCESS, 'Payment Processing', data,
      `Payment successful: $${data.amount} - triggers fulfillment, messaging, referrals`);
  });

  useEventListener(EVENT_TYPES.PAYMENT_FAILURE, (data) => {
    logEvent(EVENT_TYPES.PAYMENT_FAILURE, 'Payment Processing', data,
      `Payment failed: ${data.errorMessage} - triggers retry flow, support notification`);
  });

  // 📦 Inventory Events
  useEventListener(EVENT_TYPES.INVENTORY_UPDATE, (data) => {
    logEvent(EVENT_TYPES.INVENTORY_UPDATE, 'Inventory Management', data,
      `Stock updated: ${data.productId} (${data.previousStock} → ${data.newStock})`);
  });

  useEventListener(EVENT_TYPES.PRODUCT_OUT_OF_STOCK, (data) => {
    logEvent(EVENT_TYPES.PRODUCT_OUT_OF_STOCK, 'Inventory Management', data,
      `Out of stock: ${data.productId} - triggers restock alerts, removes from recommendations`);
  });

  // 💬 Messaging Events
  useEventListener(EVENT_TYPES.MESSAGE_SENT, (data) => {
    logEvent(EVENT_TYPES.MESSAGE_SENT, 'Messaging', data,
      `Message sent in conversation ${data.conversationId} - triggers push notifications`);
  });

  useEventListener(EVENT_TYPES.CONVERSATION_STARTED, (data) => {
    logEvent(EVENT_TYPES.CONVERSATION_STARTED, 'Messaging', data,
      `New conversation started with ${data.participants.length} participants`);
  });

  // 🎯 Referral Events
  useEventListener(EVENT_TYPES.REFERRAL_USED, (data) => {
    logEvent(EVENT_TYPES.REFERRAL_USED, 'Referral System', data,
      `Referral code ${data.referralCode} used - triggers reward calculation`);
  });

  useEventListener(EVENT_TYPES.REFERRAL_REWARD_EARNED, (data) => {
    logEvent(EVENT_TYPES.REFERRAL_REWARD_EARNED, 'Referral System', data,
      `Reward earned: $${data.rewardAmount} (${data.rewardType}) - updates user balance`);
  });

  // 🏪 Merchant Events
  useEventListener(EVENT_TYPES.MERCHANT_ONBOARDED, (data) => {
    logEvent(EVENT_TYPES.MERCHANT_ONBOARDED, 'Merchant Onboarding', data,
      `New merchant: ${data.businessName} - triggers welcome flow, setup guidance`);
  });

  useEventListener(EVENT_TYPES.STOREFRONT_UPDATED, (data) => {
    logEvent(EVENT_TYPES.STOREFRONT_UPDATED, 'Storefront Management', data,
      `Storefront updated: ${data.updatedFields.join(', ')} - triggers search reindexing`);
  });

  // 📍 Location Events
  useEventListener(EVENT_TYPES.LOCATION_UPDATE, (data) => {
    logEvent(EVENT_TYPES.LOCATION_UPDATE, 'Location Services', data,
      `Location updated: (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}) - triggers proximity search`);
  });

  // 🎪 Events Management
  useEventListener(EVENT_TYPES.EVENT_CREATED, (data) => {
    logEvent(EVENT_TYPES.EVENT_CREATED, 'Events Management', data,
      `Event created: ${data.title} - triggers location-based notifications`);
  });

  useEventListener(EVENT_TYPES.EVENT_REGISTRATION, (data) => {
    logEvent(EVENT_TYPES.EVENT_REGISTRATION, 'Events Management', data,
      `User registered for event ${data.eventId} - triggers calendar sync, reminders`);
  });

  // 👤 User Profile Events
  useEventListener(EVENT_TYPES.USER_PROFILE_UPDATE, (data) => {
    logEvent(EVENT_TYPES.USER_PROFILE_UPDATE, 'User Profile', data,
      `Profile updated: ${data.updatedFields.join(', ')} - triggers personalization refresh`);
  });

  // ============================================================================
  // DEMO SCENARIOS - Orchestrated Event Cascades
  // ============================================================================

  const runCompleteShoppingFlow = async () => {
    setIsRecording(true);
    clearLog();

    // 1. User views a product
    await emitEvent(EVENT_TYPES.PRODUCT_VIEWED, {
      userId: 'user_123',
      productId: 'coffee_beans_premium',
      merchantId: 'merchant_coffee_shop',
      category: 'beverages',
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. User adds product to cart
    await emitEvent(EVENT_TYPES.CART_ITEM_ADDED, {
      userId: 'user_123',
      productId: 'coffee_beans_premium',
      quantity: 2,
      price: 24.99,
      merchantId: 'merchant_coffee_shop',
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Inventory gets updated
    await emitEvent(EVENT_TYPES.INVENTORY_UPDATE, {
      productId: 'coffee_beans_premium',
      merchantId: 'merchant_coffee_shop',
      previousStock: 50,
      newStock: 48,
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. User initiates checkout
    await emitEvent(EVENT_TYPES.CHECKOUT_INITIATED, {
      userId: 'user_123',
      cartTotal: 49.98,
      itemCount: 2,
      merchantIds: ['merchant_coffee_shop'],
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Payment succeeds
    await emitEvent(EVENT_TYPES.PAYMENT_SUCCESS, {
      transactionId: 'txn_' + Date.now(),
      amount: 49.98,
      currency: 'USD',
      merchantId: 'merchant_coffee_shop',
      customerId: 'user_123',
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 6. Conversation starts with merchant
    await emitEvent(EVENT_TYPES.CONVERSATION_STARTED, {
      conversationId: 'conv_' + Date.now(),
      participants: ['user_123', 'merchant_coffee_shop'],
      initiatorId: 'user_123',
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 7. Referral reward earned (if user was referred)
    await emitEvent(EVENT_TYPES.REFERRAL_REWARD_EARNED, {
      userId: 'user_123',
      referralCode: 'COFFEE2024',
      rewardAmount: 5.00,
      rewardType: 'cashback' as const,
      timestamp: new Date(),
    });

    setIsRecording(false);
  };

  const runMerchantOnboardingFlow = async () => {
    setIsRecording(true);
    clearLog();

    // 1. Merchant gets onboarded
    await emitEvent(EVENT_TYPES.MERCHANT_ONBOARDED, {
      merchantId: 'merchant_new_bakery',
      businessName: 'Artisan Bakery',
      stripeAccountId: 'acct_' + Date.now(),
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Storefront gets updated
    await emitEvent(EVENT_TYPES.STOREFRONT_UPDATED, {
      merchantId: 'merchant_new_bakery',
      updatedFields: ['business_hours', 'location', 'branding'],
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Event gets created by merchant
    await emitEvent(EVENT_TYPES.EVENT_CREATED, {
      eventId: 'event_baking_class',
      organizerId: 'merchant_new_bakery',
      title: 'Sourdough Baking Workshop',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Baker Street, San Francisco, CA',
      },
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      timestamp: new Date(),
    });

    setIsRecording(false);
  };

  const runLocationBasedFlow = async () => {
    setIsRecording(true);
    clearLog();

    // 1. User location updates
    await emitEvent(EVENT_TYPES.LOCATION_UPDATE, {
      userId: 'user_123',
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. User views nearby products
    await emitEvent(EVENT_TYPES.PRODUCT_VIEWED, {
      userId: 'user_123',
      productId: 'local_honey',
      merchantId: 'merchant_farmers_market',
      category: 'local_goods',
      timestamp: new Date(),
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. User registers for nearby event
    await emitEvent(EVENT_TYPES.EVENT_REGISTRATION, {
      eventId: 'event_farmers_market',
      userId: 'user_123',
      registrationType: 'free' as const,
      timestamp: new Date(),
    });

    setIsRecording(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎭 Event System Deep Dive</Text>
      <Text style={styles.subtitle}>
        Watch the event choreography in real-time as features communicate
      </Text>

      {/* Demo Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runCompleteShoppingFlow}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>🛒 Complete Shopping Flow</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={runMerchantOnboardingFlow}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>🏪 Merchant Onboarding</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={runLocationBasedFlow}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>📍 Location-Based Flow</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearLog}
          disabled={isRecording}
        >
          <Text style={styles.buttonText}>🗑️ Clear Log</Text>
        </TouchableOpacity>
      </View>

      {/* Event Log */}
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>
          📡 Live Event Stream {isRecording && '(Recording...)'}
        </Text>
        
        <ScrollView style={styles.logScroll}>
          {eventLog.length === 0 ? (
            <Text style={styles.emptyLog}>
              No events yet. Run a demo scenario to see the magic! ✨
            </Text>
          ) : (
            eventLog.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventFeature}>{event.feature}</Text>
                  <Text style={styles.eventTime}>
                    {event.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.eventType}>{event.eventType}</Text>
                <Text style={styles.eventDescription}>{event.description}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 24,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: '48%',
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#e74c3c',
  },
  tertiaryButton: {
    backgroundColor: '#f39c12',
  },
  clearButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
  logContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  logScroll: {
    flex: 1,
  },
  emptyLog: {
    textAlign: 'center',
    color: '#bdc3c7',
    fontStyle: 'italic',
    marginTop: 40,
  },
  eventItem: {
    backgroundColor: '#ecf0f1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventFeature: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e74c3c',
    textTransform: 'uppercase',
  },
  eventTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 13,
    color: '#34495e',
    lineHeight: 18,
  },
});

export default EventFlowDemo;
