/**
 * Cross-Feature Event Type Definitions
 * 
 * Centralized type definitions for all cross-feature events.
 * Provides type safety and documentation for event payloads.
 */

// ============================================================================
// USER & AUTHENTICATION EVENTS
// ============================================================================

export interface UserLoginEvent {
  userId: string;
  email: string;
  timestamp: Date;
}

export interface UserLogoutEvent {
  userId: string;
  timestamp: Date;
}

export interface UserProfileUpdateEvent {
  userId: string;
  updatedFields: string[];
  timestamp: Date;
}

// ============================================================================
// LOCATION EVENTS
// ============================================================================

export interface LocationUpdateEvent {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface LocationPermissionChangeEvent {
  granted: boolean;
  timestamp: Date;
}

// ============================================================================
// PAYMENT & TRANSACTION EVENTS
// ============================================================================

export interface PaymentSuccessEvent {
  transactionId: string;
  amount: number;
  currency: string;
  merchantId: string;
  customerId: string;
  timestamp: Date;
}

export interface PaymentFailureEvent {
  transactionId: string;
  amount: number;
  currency: string;
  merchantId: string;
  customerId: string;
  errorCode: string;
  errorMessage: string;
  timestamp: Date;
}

export interface RefundProcessedEvent {
  refundId: string;
  originalTransactionId: string;
  amount: number;
  currency: string;
  merchantId: string;
  customerId: string;
  timestamp: Date;
}

// ============================================================================
// SHOPPING CART EVENTS
// ============================================================================

export interface CartItemAddedEvent {
  userId: string;
  productId: string;
  quantity: number;
  price: number;
  merchantId: string;
  timestamp: Date;
}

export interface CartItemRemovedEvent {
  userId: string;
  productId: string;
  timestamp: Date;
}

export interface CartClearedEvent {
  userId: string;
  timestamp: Date;
}

export interface CheckoutInitiatedEvent {
  userId: string;
  cartTotal: number;
  itemCount: number;
  merchantIds: string[];
  timestamp: Date;
}

// ============================================================================
// PRODUCT & INVENTORY EVENTS
// ============================================================================

export interface ProductViewedEvent {
  userId: string;
  productId: string;
  merchantId: string;
  category: string;
  timestamp: Date;
}

export interface ProductPurchasedEvent {
  userId: string;
  productId: string;
  merchantId: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

export interface InventoryUpdateEvent {
  productId: string;
  merchantId: string;
  previousStock: number;
  newStock: number;
  timestamp: Date;
}

export interface ProductOutOfStockEvent {
  productId: string;
  merchantId: string;
  timestamp: Date;
}

// ============================================================================
// REFERRAL SYSTEM EVENTS
// ============================================================================

export interface ReferralGeneratedEvent {
  referrerId: string;
  referralCode: string;
  timestamp: Date;
}

export interface ReferralUsedEvent {
  referrerId: string;
  refereeId: string;
  referralCode: string;
  transactionId?: string;
  rewardAmount?: number;
  timestamp: Date;
}

export interface ReferralRewardEarnedEvent {
  userId: string;
  referralCode: string;
  rewardAmount: number;
  rewardType: 'discount' | 'cashback' | 'points';
  timestamp: Date;
}

// ============================================================================
// MERCHANT & STOREFRONT EVENTS
// ============================================================================

export interface MerchantOnboardedEvent {
  merchantId: string;
  businessName: string;
  stripeAccountId: string;
  timestamp: Date;
}

export interface StorefrontUpdatedEvent {
  merchantId: string;
  updatedFields: string[];
  timestamp: Date;
}

export interface MerchantStatusChangeEvent {
  merchantId: string;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
}

// ============================================================================
// MESSAGING EVENTS
// ============================================================================

export interface MessageSentEvent {
  messageId: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  messageType: 'text' | 'image' | 'file';
  timestamp: Date;
}

export interface MessageReceivedEvent {
  messageId: string;
  senderId: string;
  recipientId: string;
  conversationId: string;
  timestamp: Date;
}

export interface ConversationStartedEvent {
  conversationId: string;
  participants: string[];
  initiatorId: string;
  timestamp: Date;
}

// ============================================================================
// EVENTS MANAGEMENT EVENTS
// ============================================================================

export interface EventCreatedEvent {
  eventId: string;
  organizerId: string;
  title: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  startDate: Date;
  timestamp: Date;
}

export interface EventRegistrationEvent {
  eventId: string;
  userId: string;
  registrationType: 'free' | 'paid';
  amount?: number;
  timestamp: Date;
}

export interface EventCancelledEvent {
  eventId: string;
  organizerId: string;
  reason?: string;
  timestamp: Date;
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export interface AppStateChangeEvent {
  previousState: string;
  newState: string;
  timestamp: Date;
}

export interface ErrorEvent {
  errorId: string;
  errorType: string;
  errorMessage: string;
  feature: string;
  userId?: string;
  timestamp: Date;
}

export interface PerformanceEvent {
  metric: string;
  value: number;
  feature: string;
  timestamp: Date;
}

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const EVENT_TYPES = {
  // User & Auth
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_PROFILE_UPDATE: 'user:profile:update',

  // Location
  LOCATION_UPDATE: 'location:update',
  LOCATION_PERMISSION_CHANGE: 'location:permission:change',

  // Payment & Transactions
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_FAILURE: 'payment:failure',
  REFUND_PROCESSED: 'payment:refund:processed',

  // Shopping Cart
  CART_ITEM_ADDED: 'cart:item:added',
  CART_ITEM_REMOVED: 'cart:item:removed',
  CART_CLEARED: 'cart:cleared',
  CHECKOUT_INITIATED: 'cart:checkout:initiated',

  // Product & Inventory
  PRODUCT_VIEWED: 'product:viewed',
  PRODUCT_PURCHASED: 'product:purchased',
  INVENTORY_UPDATE: 'inventory:update',
  PRODUCT_OUT_OF_STOCK: 'inventory:out_of_stock',

  // Referral System
  REFERRAL_GENERATED: 'referral:generated',
  REFERRAL_USED: 'referral:used',
  REFERRAL_REWARD_EARNED: 'referral:reward:earned',

  // Merchant & Storefront
  MERCHANT_ONBOARDED: 'merchant:onboarded',
  STOREFRONT_UPDATED: 'storefront:updated',
  MERCHANT_STATUS_CHANGE: 'merchant:status:change',

  // Messaging
  MESSAGE_SENT: 'message:sent',
  MESSAGE_RECEIVED: 'message:received',
  CONVERSATION_STARTED: 'conversation:started',

  // Events Management
  EVENT_CREATED: 'event:created',
  EVENT_REGISTRATION: 'event:registration',
  EVENT_CANCELLED: 'event:cancelled',

  // System
  APP_STATE_CHANGE: 'system:app_state:change',
  ERROR: 'system:error',
  PERFORMANCE: 'system:performance',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
