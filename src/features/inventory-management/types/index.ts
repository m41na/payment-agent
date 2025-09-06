// Product Domain Types
export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images: string[];
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  tags: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  title: string;
  description?: string;
  price: number;
  category?: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images?: string[];
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  tags?: string[];
}

export interface UpdateProductData extends Partial<CreateProductData> {
  is_available?: boolean;
}

// Location Types
export interface ProductLocation {
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
}

export interface LocationSearchParams {
  latitude: number;
  longitude: number;
  radius_miles?: number;
  category?: string;
  condition?: Product['condition'];
  price_min?: number;
  price_max?: number;
}

// Inventory Status Types
export type InventoryStatus = 'available' | 'unavailable' | 'sold' | 'archived';

export interface InventoryItem {
  product_id: string;
  status: InventoryStatus;
  quantity?: number;
  last_updated: string;
}

// Service Results
export interface ProductOperationResult {
  success: boolean;
  product?: Product;
  error?: string;
}

export interface InventoryUpdateResult {
  success: boolean;
  updated_count: number;
  error?: string;
}

// Real-time Subscription Types
export interface ProductSubscriptionEvent {
  event_type: 'INSERT' | 'UPDATE' | 'DELETE';
  product: Product;
  timestamp: string;
}

// Error Types
export interface InventoryError {
  code: 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'LOCATION_ERROR';
  message: string;
  field?: string;
  product_id?: string;
}

// Search and Filter Types
export interface ProductFilters {
  category?: string;
  condition?: Product['condition'][];
  price_range?: {
    min: number;
    max: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius_miles: number;
  };
  tags?: string[];
  availability?: boolean;
}

export interface ProductSearchResult {
  products: Product[];
  total_count: number;
  has_more: boolean;
}
