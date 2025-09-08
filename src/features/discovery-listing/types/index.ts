// =============================================================================
// Product Discovery & Listing Feature - Type Definitions
// =============================================================================

// Core Domain Types
export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: ProductCondition;
  images: string[];
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  tags: string[];
  is_available: boolean;
  inventory_count?: number;
  created_at: string;
  updated_at: string;
  seller?: ProductSeller;
  distance?: number;
  view_count?: number;
}

export interface ProductSeller {
  id: string;
  full_name: string;
  avatar_url?: string;
  rating?: number;
  total_sales?: number;
  member_since: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parent_id?: string;
  subcategories?: ProductCategory[];
  product_count?: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  order_index: number;
  is_primary: boolean;
}

export interface ProductView {
  id: string;
  product_id: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  viewed_at: string;
}

// Enums
export enum ProductCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum ProductSortBy {
  RELEVANCE = 'relevance',
  PRICE_LOW_TO_HIGH = 'price_asc',
  PRICE_HIGH_TO_LOW = 'price_desc',
  DISTANCE = 'distance',
  NEWEST = 'created_at_desc',
  OLDEST = 'created_at_asc',
  MOST_VIEWED = 'view_count_desc',
  SMART_RANKING = 'smart_ranking',
}

export enum ViewMode {
  LIST = 'list',
  GRID = 'grid',
  MAP = 'map',
}

export enum ProductAvailability {
  ALL = 'all',
  AVAILABLE = 'available',
  SOLD = 'sold',
}

// Data Transfer Objects
export interface ProductSearchQuery {
  query?: string;
  category_id?: string;
  condition?: ProductCondition[];
  price_min?: number;
  price_max?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius_km: number;
  };
  tags?: string[];
  seller_id?: string;
  availability?: ProductAvailability;
  sort_by?: ProductSortBy;
  limit?: number;
  offset?: number;
}

export interface ProductFilters {
  categories?: string[];
  conditions?: ProductCondition[];
  priceRange?: {
    min: number;
    max: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  tags?: string[];
  availability?: ProductAvailability;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Operation Results
export interface ProductSearchResult {
  products: Product[];
  total_count: number;
  has_more: boolean;
  search_metadata: {
    query: string;
    filters_applied: ProductFilters;
    search_time_ms: number;
    result_count: number;
  };
}

export interface ProductOperationResult {
  success: boolean;
  product?: Product;
  error?: ProductError;
}

// Error Handling
export interface ProductError {
  code: 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'SEARCH_ERROR' | 'LOCATION_ERROR' | 'CONNECTION_ERROR';
  message: string;
  details?: Record<string, any>;
}

// Map Integration Types
export interface ProductMapMarker {
  id: string;
  product: Product;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
  price: number;
  image?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapCluster {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  product_count: number;
  products: Product[];
  average_price: number;
}

// Search and Discovery Types
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'category' | 'tag' | 'location';
  popularity_score: number;
  metadata?: Record<string, any>;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  filters: ProductFilters;
  result_count: number;
  searched_at: string;
}

// View State Types
export interface ProductListViewState {
  products: Product[];
  loading: boolean;
  refreshing: boolean;
  error: ProductError | null;
  hasMore: boolean;
  searchQuery: string;
  filters: ProductFilters;
  sortBy: ProductSortBy;
  viewMode: ViewMode;
  selectedProduct: Product | null;
}

export interface ProductMapViewState {
  products: Product[];
  markers: ProductMapMarker[];
  clusters: MapCluster[];
  region: MapRegion;
  selectedMarker: ProductMapMarker | null;
  loading: boolean;
  error: ProductError | null;
}

// Constants
export const PRODUCT_CONSTANTS = {
  MAX_SEARCH_RADIUS_KM: 100,
  DEFAULT_SEARCH_RADIUS_KM: 25,
  MAX_PRICE: 1000000, // $10,000
  MIN_PRICE: 0,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_IMAGES_PER_PRODUCT: 10,
  MAX_TAGS_PER_PRODUCT: 20,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 2000,
  SEARCH_DEBOUNCE_MS: 300,
  VIEW_TRACKING_DEBOUNCE_MS: 1000,
} as const;

export const DISCOVERY_CONSTANTS = {
  MAX_SEARCH_HISTORY: 50,
  TRENDING_SEARCHES_LIMIT: 20,
  POPULAR_PRODUCTS_LIMIT: 10,
  MAP_CLUSTER_RADIUS: 50, // pixels
  MAP_MIN_ZOOM_FOR_MARKERS: 12,
} as const;
