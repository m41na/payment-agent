// Core domain types
export interface CartItem {
  id: string;
  product_id: string;
  user_id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  image_url?: string;
  merchant_name: string;
  product_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  availability_status: 'available' | 'limited' | 'out_of_stock';
  added_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  total_items: number;
  subtotal: number;
  tax_amount?: number;
  shipping_amount?: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

// Order management types
export interface Order {
  id: string;
  user_id: string;
  seller_id?: string; // For single-merchant orders
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  items: OrderItem[];
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  payment_intent_id?: string;
  shipping_address?: ShippingAddress;
  billing_address?: BillingAddress;
  notes?: string;
  created_at: string;
  updated_at: string;
  estimated_delivery?: string;
  tracking_number?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
  product_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  fulfillment_status: FulfillmentStatus;
}

export interface ShippingAddress {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface BillingAddress extends ShippingAddress {}

// Status enums
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum FulfillmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

// Cart operation types
export interface AddToCartData {
  product_id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  image_url?: string;
  merchant_name: string;
  product_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
}

export interface UpdateCartItemData {
  quantity?: number;
  notes?: string;
}

export interface CreateOrderData {
  items: CartItem[];
  shipping_address?: ShippingAddress;
  billing_address?: BillingAddress;
  notes?: string;
  payment_method_id?: string;
}

// Cart analytics and computed types
export interface CartSummary {
  total_items: number;
  unique_products: number;
  unique_merchants: number;
  subtotal: number;
  estimated_tax: number;
  estimated_shipping: number;
  estimated_total: number;
  currency: string;
}

export interface MerchantCartGroup {
  seller_id: string;
  merchant_name: string;
  items: CartItem[];
  subtotal: number;
  item_count: number;
}

export interface OrderFilters {
  status?: OrderStatus[];
  payment_status?: PaymentStatus[];
  date_from?: string;
  date_to?: string;
  seller_id?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface OrderSearchResult {
  orders: Order[];
  total_count: number;
  has_more: boolean;
}

// Error types
export interface CartError {
  code: 'ITEM_NOT_FOUND' | 'INVALID_QUANTITY' | 'OUT_OF_STOCK' | 'CART_LIMIT_EXCEEDED' | 'NETWORK_ERROR' | 'AUTHENTICATION_ERROR';
  message: string;
  details?: Record<string, any>;
}

export interface OrderError {
  code: 'ORDER_NOT_FOUND' | 'INVALID_ORDER_DATA' | 'PAYMENT_FAILED' | 'INSUFFICIENT_INVENTORY' | 'NETWORK_ERROR';
  message: string;
  details?: Record<string, any>;
}

// Service operation results
export interface CartOperationResult {
  success: boolean;
  cart?: Cart;
  error?: CartError;
}

export interface OrderOperationResult {
  success: boolean;
  order?: Order;
  error?: OrderError;
}

// Real-time event types
export interface CartUpdateEvent {
  type: 'item_added' | 'item_updated' | 'item_removed' | 'cart_cleared';
  user_id: string;
  cart_id: string;
  item_id?: string;
  changes?: Partial<CartItem>;
  timestamp: string;
}

export interface OrderUpdateEvent {
  type: 'order_created' | 'order_updated' | 'status_changed' | 'payment_updated';
  order_id: string;
  user_id: string;
  changes?: Partial<Order>;
  timestamp: string;
}

// Subscription event types
export type CartSubscriptionEvent = CartUpdateEvent;
export type OrderSubscriptionEvent = OrderUpdateEvent;

// Constants
export const CART_ITEM_LIMIT = 100;
export const CART_STORAGE_KEY = '@shopping_cart_cache';
export const ORDER_STORAGE_KEY = '@order_history_cache';
