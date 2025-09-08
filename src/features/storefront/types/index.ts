// ============================================================================
// STOREFRONT FEATURE TYPES - Business Profile & Transaction Management
// ============================================================================

// ============================================================================
// BUSINESS PROFILE TYPES
// ============================================================================

export interface BusinessLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

export interface BusinessContactInfo {
  phone?: string;
  email?: string;
  website?: string;
}

export interface StorefrontBranding {
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  banner_url?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface StorefrontSettings {
  is_published: boolean;
  accepts_online_orders: boolean;
  delivery_available: boolean;
  pickup_available: boolean;
  delivery_radius_miles?: number;
  minimum_order_amount?: number;
  auto_accept_orders: boolean;
  order_preparation_time_minutes?: number;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: BusinessType;
  description?: string;
  location?: BusinessLocation;
  business_hours?: BusinessHours;
  contact_info?: BusinessContactInfo;
  branding?: StorefrontBranding;
  settings?: StorefrontSettings;
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

export interface TransactionRecord {
  id: string;
  user_id: string;
  customer_id?: string;
  order_id?: string;
  product_id?: string;
  product_name?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  payment_method?: string;
  payment_intent_id?: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilter {
  status?: TransactionStatus;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  customer_id?: string;
  product_id?: string;
  payment_method?: string;
  search_query?: string;
  page?: number;
  limit?: number;
}

export interface TransactionAnalytics {
  period: string;
  total_revenue: number;
  transaction_count: number;
  average_order_value: number;
  revenue_growth_percentage?: number;
  transaction_growth_percentage?: number;
  top_payment_methods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
  daily_revenue: Array<{
    date: string;
    revenue: number;
    transaction_count: number;
  }>;
}

export interface RevenueSummary {
  current_period: {
    revenue: number;
    transactions: number;
    average_order_value: number;
  };
  previous_period: {
    revenue: number;
    transactions: number;
    average_order_value: number;
  };
  growth: {
    revenue_percentage: number;
    transactions_percentage: number;
    aov_percentage: number;
  };
}

export interface TopProduct {
  product_id: string;
  name: string;
  revenue: number;
  quantity_sold: number;
  average_price: number;
}

export interface CustomerSegment {
  segment: 'new' | 'returning' | 'vip';
  count: number;
  revenue: number;
  average_order_value: number;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum BusinessType {
  RESTAURANT = 'restaurant',
  RETAIL = 'retail',
  SERVICE = 'service',
  ENTERTAINMENT = 'entertainment',
  HEALTH = 'health',
  EDUCATION = 'education',
  OTHER = 'other'
}

export enum StorefrontStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum TransactionExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'excel'
}

export enum StorefrontErrorCode {
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  INVALID_PROFILE_DATA = 'INVALID_PROFILE_DATA',
  PROFILE_CREATION_FAILED = 'PROFILE_CREATION_FAILED',
  PROFILE_UPDATE_FAILED = 'PROFILE_UPDATE_FAILED',
  PROFILE_DELETE_FAILED = 'PROFILE_DELETE_FAILED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR'
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface StorefrontError {
  code: StorefrontErrorCode;
  message: string;
  field?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const STOREFRONT_CONSTANTS = {
  VALIDATION: {
    MAX_BUSINESS_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MIN_DELIVERY_RADIUS: 0.5,
    MAX_DELIVERY_RADIUS: 50,
    MIN_ORDER_AMOUNT: 0,
    MAX_ORDER_AMOUNT: 10000
  },
  
  COMPLETION_THRESHOLDS: {
    MINIMUM_FOR_PUBLICATION: 80,
    BASIC_INFO: 20,
    LOCATION: 20,
    CONTACT: 20,
    HOURS: 20,
    BRANDING: 20
  },
  
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    TRANSACTION_PAGE_SIZE: 50
  },
  
  CACHE: {
    PROFILE_TTL: 15 * 60 * 1000, // 15 minutes
    TRANSACTION_TTL: 5 * 60 * 1000, // 5 minutes
    ANALYTICS_TTL: 30 * 60 * 1000 // 30 minutes
  },
  
  ANALYTICS: {
    DEFAULT_PERIOD: 'month',
    SUPPORTED_PERIODS: ['day', 'week', 'month', 'quarter', 'year'],
    MAX_TOP_PRODUCTS: 20
  }
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isBusinessProfile(obj: any): obj is BusinessProfile {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.business_name === 'string' &&
    Object.values(BusinessType).includes(obj.business_type);
}

export function isTransactionRecord(obj: any): obj is TransactionRecord {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.amount === 'number' &&
    Object.values(TransactionStatus).includes(obj.status);
}

export function isStorefrontError(obj: any): obj is StorefrontError {
  return obj && 
    typeof obj === 'object' &&
    Object.values(StorefrontErrorCode).includes(obj.code) &&
    typeof obj.message === 'string';
}
