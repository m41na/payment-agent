# Event-Driven Architecture Documentation

## Overview

This document describes the **event-driven, messaging-oriented architecture** that serves as the nervous system of our React Native marketplace application. This architecture enables **loose coupling** between features while maintaining **seamless integration** and **infinite extensibility**.

## 🎭 The Architecture Philosophy

### Core Principles

1. **Messaging-Oriented Communication**: Features communicate through well-defined events, not direct dependencies
2. **Loose Coupling**: Modules can evolve independently without breaking other features
3. **Event Choreography**: Business logic emerges from the natural flow of events through the system
4. **Horizontal Scalability**: New features integrate by subscribing to existing events
5. **Zero Internal Dependencies**: Features never depend on other modules' internal implementations

### The Event System as "Glue"

The event system acts as the **architectural glue** that binds all marketplace features together while keeping them completely decoupled. This enables:

- **Feature Independence**: Each module can be developed, tested, and deployed separately
- **Easy Extension**: New features plug in by listening to relevant events
- **Natural Business Flows**: Complex workflows emerge from simple event interactions
- **Maintainability**: Changes to one feature don't cascade through the system

## 🧠 Core Components

### 1. EventBus (`src/events/EventBus.ts`)

The central nervous system implementing a sophisticated publish-subscribe pattern:

```typescript
class EventBusImpl {
  // Type-safe event emission with error isolation
  async emit<T>(eventType: string, data: T): Promise<void>
  
  // Subscription management with automatic cleanup
  on<T>(eventType: string, callback: EventCallback<T>): EventSubscription
  once<T>(eventType: string, callback: EventCallback<T>): EventSubscription
}
```

**Key Features:**
- **Asynchronous Processing**: Events are processed in parallel with Promise.all
- **Error Isolation**: Failed listeners don't crash the entire event flow
- **Memory Management**: Automatic subscription cleanup prevents memory leaks
- **Type Safety**: Full TypeScript support with generic event data

### 2. Event Types (`src/events/EventTypes.ts`)

Comprehensive event definitions covering all marketplace domains:

```typescript
// 342 lines of carefully orchestrated event definitions
export const EVENT_TYPES = {
  // Authentication & User Management
  USER_LOGIN: 'user:login',
  USER_PROFILE_UPDATE: 'user:profile_update',
  
  // Location Services
  LOCATION_UPDATE: 'location:update',
  LOCATION_PERMISSION_GRANTED: 'location:permission_granted',
  
  // Shopping & Commerce
  PRODUCT_VIEWED: 'product:viewed',
  CART_ITEM_ADDED: 'cart:item_added',
  CHECKOUT_INITIATED: 'checkout:initiated',
  
  // Payment Processing
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_FAILURE: 'payment:failure',
  
  // Inventory Management
  INVENTORY_UPDATE: 'inventory:update',
  PRODUCT_OUT_OF_STOCK: 'inventory:out_of_stock',
  
  // Messaging & Communication
  MESSAGE_SENT: 'messaging:message_sent',
  CONVERSATION_STARTED: 'messaging:conversation_started',
  
  // Referral System
  REFERRAL_USED: 'referral:used',
  REFERRAL_REWARD_EARNED: 'referral:reward_earned',
  
  // Merchant Operations
  MERCHANT_ONBOARDED: 'merchant:onboarded',
  STOREFRONT_UPDATED: 'storefront:updated',
  
  // Events Management
  EVENT_CREATED: 'events:created',
  EVENT_REGISTRATION: 'events:registration',
  
  // System Events
  SYSTEM_ERROR: 'system:error',
  SYSTEM_MAINTENANCE: 'system:maintenance'
} as const;
```

### 3. React Integration Hooks (`src/events/useEventBus.ts`)

Elegant React hooks that make event-driven programming feel natural:

```typescript
// Core event bus integration
export const useEventBus = (): UseEventBusReturn => {
  const emit = useCallback(async <T>(eventType: EventType, data: T) => {
    await EventBus.emit(eventType, data);
  }, []);
  
  const subscribe = useCallback(<T>(eventType: EventType, callback: EventCallback<T>) => {
    return EventBus.on(eventType, callback);
  }, []);
  
  // Automatic cleanup on component unmount
  useEffect(() => {
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []);
};

// Simplified event listening with automatic cleanup
export const useEventListener = <T>(eventType: EventType, callback: EventCallback<T>) => {
  const { subscribe } = useEventBus();
  
  useEffect(() => {
    const subscription = subscribe(eventType, callback);
    return () => subscription.unsubscribe();
  }, [eventType, callback, subscribe]);
};

// Memoized event emission
export const useEventEmitter = () => {
  const { emit } = useEventBus();
  return useCallback(emit, [emit]);
};
```

## 🌊 Event Flow Patterns

### 1. Complete Shopping Flow

A single product view triggers a cascade of events across multiple features:

```
Product View → Cart Add → Inventory Update → Checkout → Payment → Messaging → Referral Reward
```

**Event Sequence:**
1. `PRODUCT_VIEWED` - User views a product
2. `CART_ITEM_ADDED` - Product added to cart
3. `INVENTORY_UPDATE` - Stock levels adjusted
4. `CHECKOUT_INITIATED` - User starts checkout
5. `PAYMENT_SUCCESS` - Payment processed
6. `CONVERSATION_STARTED` - Merchant communication begins
7. `REFERRAL_REWARD_EARNED` - Referral bonus awarded

### 2. Merchant Onboarding Flow

New merchant registration creates a ripple effect:

```
Merchant Registration → Storefront Setup → Event Creation → Location Indexing
```

**Event Sequence:**
1. `MERCHANT_ONBOARDED` - New merchant registered
2. `STOREFRONT_UPDATED` - Business profile configured
3. `EVENT_CREATED` - Merchant creates first event
4. `LOCATION_UPDATE` - Storefront location indexed

### 3. Location-Based Discovery

GPS updates trigger proximity-based features:

```
GPS Update → Proximity Search → Product Discovery → Event Registration
```

**Event Sequence:**
1. `LOCATION_UPDATE` - User location changes
2. `PRODUCT_VIEWED` - Nearby products discovered
3. `EVENT_REGISTRATION` - Local events joined

## 🏗️ Feature Integration Patterns

### Loose Coupling Through Events

Each feature operates independently but communicates through events:

```typescript
// Payment Processing Feature
class PaymentProcessor {
  async processPayment(paymentData) {
    try {
      const result = await stripe.processPayment(paymentData);
      
      // Emit success event - other features can react
      await EventBus.emit(EVENT_TYPES.PAYMENT_SUCCESS, {
        transactionId: result.id,
        amount: result.amount,
        merchantId: paymentData.merchantId,
        customerId: paymentData.customerId
      });
      
    } catch (error) {
      // Emit failure event - triggers retry flows
      await EventBus.emit(EVENT_TYPES.PAYMENT_FAILURE, {
        errorMessage: error.message,
        paymentData
      });
    }
  }
}

// Messaging Feature - Reacts to payment events
class MessagingService {
  constructor() {
    // Listen for payment success to start merchant conversation
    EventBus.on(EVENT_TYPES.PAYMENT_SUCCESS, this.handlePaymentSuccess);
  }
  
  handlePaymentSuccess = async (paymentData) => {
    // Automatically start conversation between customer and merchant
    await this.startConversation(paymentData.customerId, paymentData.merchantId);
  };
}

// Referral System - Also reacts to payment events
class ReferralService {
  constructor() {
    EventBus.on(EVENT_TYPES.PAYMENT_SUCCESS, this.handlePaymentSuccess);
  }
  
  handlePaymentSuccess = async (paymentData) => {
    // Check if customer was referred and award bonus
    const referralCode = await this.getReferralCode(paymentData.customerId);
    if (referralCode) {
      await this.awardReferralBonus(referralCode, paymentData.amount);
    }
  };
}
```

### Zero Internal Dependencies

Features never import or depend on each other's internal implementations:

```typescript
// ❌ WRONG - Direct dependency
import { PaymentProcessor } from '../payment-processing/PaymentProcessor';

class CheckoutService {
  async processCheckout(cartData) {
    const paymentProcessor = new PaymentProcessor(); // Direct coupling!
    return await paymentProcessor.process(cartData);
  }
}

// ✅ CORRECT - Event-driven communication
class CheckoutService {
  async processCheckout(cartData) {
    // Emit checkout event - payment feature will handle it
    await EventBus.emit(EVENT_TYPES.CHECKOUT_INITIATED, {
      cartTotal: cartData.total,
      items: cartData.items,
      customerId: cartData.customerId
    });
  }
}
```

## 🎪 EventFlowDemo - Live Visualization

The `EventFlowDemo` component (`src/demos/EventFlowDemo.tsx`) provides real-time visualization of the event system:

### Features

1. **Live Event Stream**: Real-time log of all events flowing through the system
2. **Demo Scenarios**: Pre-built workflows that demonstrate event choreography
3. **Feature Context**: Each event shows which feature emitted it and what it triggers
4. **Timestamp Tracking**: Precise timing of event propagation

### Running the Demo

```bash
# Use the dedicated demo app
node_modules/.bin/expo start App-events-demo.tsx

# Or temporarily switch main App.tsx to use EventFlowDemo
```

### Demo Scenarios

- **🛒 Complete Shopping Flow**: Product discovery through referral rewards
- **🏪 Merchant Onboarding**: Registration through event creation
- **📍 Location-Based Flow**: GPS updates through event registration

## 🚀 Extensibility Benefits

### Adding New Features

New features integrate seamlessly by subscribing to existing events:

```typescript
// New Analytics Feature - No changes to existing code needed
class AnalyticsService {
  constructor() {
    // Listen to all relevant events
    EventBus.on(EVENT_TYPES.PRODUCT_VIEWED, this.trackProductView);
    EventBus.on(EVENT_TYPES.CART_ITEM_ADDED, this.trackCartAddition);
    EventBus.on(EVENT_TYPES.PAYMENT_SUCCESS, this.trackPurchase);
    EventBus.on(EVENT_TYPES.EVENT_REGISTRATION, this.trackEventSignup);
  }
  
  trackProductView = async (data) => {
    await this.sendAnalytics('product_view', data);
  };
  
  trackCartAddition = async (data) => {
    await this.sendAnalytics('add_to_cart', data);
  };
  
  // ... more tracking methods
}
```

### Feature Evolution

Existing features can evolve without breaking others:

```typescript
// Payment feature adds new functionality
class PaymentProcessor {
  async processPayment(paymentData) {
    // ... existing payment logic
    
    // NEW: Add fraud detection
    const fraudScore = await this.checkFraud(paymentData);
    
    if (fraudScore > 0.8) {
      // Emit new event - other features can react if needed
      await EventBus.emit(EVENT_TYPES.PAYMENT_FRAUD_DETECTED, {
        transactionId: paymentData.id,
        fraudScore,
        customerId: paymentData.customerId
      });
      return;
    }
    
    // Continue with normal flow
    await EventBus.emit(EVENT_TYPES.PAYMENT_SUCCESS, result);
  }
}
```

## 🔧 Implementation Guidelines

### Event Naming Conventions

```typescript
// Format: [domain]:[action]
'user:login'
'product:viewed'
'payment:success'
'inventory:update'
'messaging:conversation_started'
```

### Event Data Structure

```typescript
interface BaseEvent {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

interface ProductViewedEvent extends BaseEvent {
  productId: string;
  merchantId: string;
  category: string;
}
```

### Error Handling

```typescript
// Events should never throw - always emit error events instead
try {
  await processPayment(data);
} catch (error) {
  await EventBus.emit(EVENT_TYPES.PAYMENT_FAILURE, {
    errorMessage: error.message,
    errorCode: error.code,
    originalData: data
  });
}
```

### Performance Considerations

1. **Async Processing**: All event handlers are async and run in parallel
2. **Error Isolation**: Failed handlers don't affect other listeners
3. **Memory Management**: Automatic subscription cleanup prevents leaks
4. **Batching**: Related events can be batched for efficiency

## 📊 Architecture Benefits

### Development Benefits

- **Parallel Development**: Teams can work on features independently
- **Easy Testing**: Features can be tested in isolation
- **Clear Boundaries**: Well-defined interfaces between modules
- **Reduced Complexity**: No need to understand other features' internals

### Maintenance Benefits

- **Isolated Changes**: Modifications don't cascade through the system
- **Easy Debugging**: Event logs provide clear audit trails
- **Gradual Migration**: Features can be updated incrementally
- **Risk Reduction**: Changes are contained within feature boundaries

### Business Benefits

- **Faster Time-to-Market**: New features integrate quickly
- **Scalable Architecture**: System grows without increasing complexity
- **Future-Proof Design**: Architecture adapts to changing requirements
- **Competitive Advantage**: Rapid feature development and deployment

## 🎯 Conclusion

The event-driven, messaging-oriented architecture transforms our React Native marketplace from a collection of tightly-coupled features into a **living ecosystem** where:

- **Features communicate naturally** through well-defined events
- **Business logic emerges organically** from event choreography  
- **New capabilities integrate seamlessly** by subscribing to existing events
- **The system scales horizontally** without increasing complexity

This architecture is the **secret sauce** that enables infinite extensibility while maintaining clean, maintainable code. It's the difference between building a monolithic application and creating a **platform for continuous innovation**.

The EventFlowDemo provides a window into this invisible architecture, making the abstract concept of event-driven communication tangible and observable. It's the **icing on the cake** that demonstrates how loose coupling and messaging-oriented design create a truly scalable, maintainable system.

---

*"The best architectures are those that enable rather than constrain. Our event-driven system doesn't just connect features—it empowers them to evolve independently while working together harmoniously."*
