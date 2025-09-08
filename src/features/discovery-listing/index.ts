// Product Discovery & Listing Feature
// Public API Interface

// ============================================================================
// SERVICES
// ============================================================================
export { DiscoveryListingService } from './services/DiscoveryListingService';
export { SortingService } from './services/SortingService';
export type { ProductSyncCallback } from './services/ProductSyncService';

// ============================================================================
// HOOKS
// ============================================================================
export { useDiscoveryListing } from './hooks/useDiscoveryListing';
export { useDiscoveryListingManagement } from './hooks/useDiscoveryListingManagement';

// ============================================================================
// TYPES
// ============================================================================
export type {
  // Core Product Types
  Product,
  ProductSeller,
  ProductImage,
  ProductCategory,
  
  // Product Operations
  ProductSearchQuery,
  ProductSearchResult,
  ProductOperationResult,
  ProductFilters,
  ProductView,
  ProductFavorite,
  ProductFavoriteOperationResult,
  
  // Analytics & Insights
  ProductAnalytics,
  ProductPriceDistribution,
  ProductGeographicData,
  
  // Search & Discovery
  SearchSuggestion,
  SearchHistory,
  SavedSearch,
  SearchMetadata,
  
  // Real-time Sync
  ProductSyncEvent,
  ProductSyncState,
  
  // Map Integration
  ProductMapMarker,
  ProductMapCluster,
  ProductMapBounds,
  
  // Error Handling
  ProductError,
} from './types';

// ============================================================================
// ENUMS
// ============================================================================
export {
  ProductCondition,
  ProductAvailability,
  ProductSortBy,
  ProductSyncEventType,
  ProductSyncState,
  SearchSuggestionType,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================
export {
  PRODUCT_CONSTANTS,
  DISCOVERY_CONSTANTS,
} from './types';

// ============================================================================
// FEATURE METADATA
// ============================================================================
export const PRODUCT_DISCOVERY_FEATURE = {
  name: 'Product Discovery & Listing',
  version: '1.0.0',
  description: 'Comprehensive product search, discovery, favorites management, and real-time synchronization',
  
  // Dependencies
  dependencies: {
    required: [
      '@supabase/supabase-js',
      '@react-native-async-storage/async-storage',
      'react',
      'react-native',
    ],
    optional: [
      'expo-location', // For location-based search
      'react-native-paper', // For UI components
    ],
    internal: [
      '../../../services/supabase',
    ],
  },
  
  // Feature Capabilities
  capabilities: {
    search: {
      text_search: true,
      category_filtering: true,
      price_filtering: true,
      condition_filtering: true,
      location_filtering: true,
      tag_filtering: true,
      sorting: true,
      pagination: true,
      suggestions: true,
      history: true,
    },
    
    discovery: {
      trending_products: true,
      nearby_products: true,
      category_browsing: true,
      personalized_recommendations: false, // Future enhancement
      similar_products: false, // Future enhancement
    },
    
    favorites: {
      add_remove: true,
      bulk_operations: true,
      offline_support: true,
      sync: true,
      wishlist_management: true,
    },
    
    real_time: {
      product_updates: true,
      favorite_sync: true,
      view_tracking: true,
      connection_management: true,
      offline_queue: true,
    },
    
    analytics: {
      search_analytics: true,
      product_analytics: true,
      user_behavior: true,
      geographic_insights: true,
    },
    
    map_integration: {
      location_search: true,
      map_markers: true,
      clustering: true,
      distance_calculation: true,
    },
  },
  
  // Integration Points
  integrations: {
    database: {
      tables: [
        'pg_products',
        'pg_product_categories',
        'pg_product_favorites',
        'pg_product_views',
        'pg_product_search_history',
        'pg_profiles',
      ],
      functions: [
        'products_within_radius',
        'increment_product_view_count',
        'increment_product_favorite_count',
        'decrement_product_favorite_count',
        'get_product_total_stats',
        'get_product_category_distribution',
        'get_product_condition_distribution',
        'get_product_price_distribution',
        'get_trending_product_searches',
      ],
      realtime_channels: [
        'products_changes',
        'product_favorites_changes',
        'product_views_changes',
      ],
    },
    
    storage: {
      local_storage_keys: [
        '@product_search_history',
        '@product_discovery_preferences',
        '@product_categories_cache',
        '@product_favorites_cache',
        '@product_favorites_sync_queue',
        '@product_sync_offline_queue',
        '@product_sync_last_timestamp',
      ],
    },
    
    external_apis: {
      location_services: 'expo-location',
      maps: 'react-native-maps (optional)',
    },
    
    other_features: {
      user_profile: 'User authentication and profile data',
      payment_processing: 'Product purchase integration',
      inventory_management: 'Product availability sync',
      messaging: 'Seller communication',
    },
  },
  
  // Configuration Options
  configuration: {
    search: {
      default_page_size: PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
      max_page_size: PRODUCT_CONSTANTS.MAX_PAGE_SIZE,
      search_debounce_ms: DISCOVERY_CONSTANTS.SEARCH_DEBOUNCE_MS,
      max_suggestions: DISCOVERY_CONSTANTS.MAX_SUGGESTIONS,
      max_search_history: DISCOVERY_CONSTANTS.MAX_SEARCH_HISTORY,
    },
    
    location: {
      default_search_radius_km: PRODUCT_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM,
      max_search_radius_km: PRODUCT_CONSTANTS.MAX_SEARCH_RADIUS_KM,
    },
    
    sync: {
      max_offline_events: DISCOVERY_CONSTANTS.MAX_OFFLINE_SYNC_EVENTS,
      reconnect_attempts: 5,
      reconnect_delay_base_ms: 1000,
    },
    
    performance: {
      trending_products_limit: DISCOVERY_CONSTANTS.POPULAR_PRODUCTS_LIMIT,
      trending_searches_limit: DISCOVERY_CONSTANTS.TRENDING_SEARCHES_LIMIT,
    },
  },
  
  // Performance Characteristics
  performance: {
    search_response_time: '< 500ms (typical)',
    pagination_load_time: '< 300ms',
    favorite_toggle_time: '< 200ms',
    sync_connection_time: '< 2s',
    offline_queue_size: DISCOVERY_CONSTANTS.MAX_OFFLINE_SYNC_EVENTS,
    
    caching: {
      search_history: 'Local storage',
      favorites: 'Local storage + optimistic updates',
      categories: 'Local storage',
      sync_events: 'Local storage (offline queue)',
    },
    
    optimization: {
      debounced_search: true,
      pagination: true,
      lazy_loading: true,
      optimistic_updates: true,
      connection_pooling: true,
    },
  },
  
  // Security Model
  security: {
    authentication: {
      required: true,
      scope: 'User must be authenticated for favorites and personalized features',
    },
    
    authorization: {
      row_level_security: true,
      user_scoped_data: [
        'favorites',
        'search_history',
        'view_tracking',
      ],
    },
    
    data_protection: {
      sensitive_fields: [
        'user_id',
        'search_history',
        'view_history',
      ],
      encryption: 'Database level',
      anonymization: 'Search analytics can be anonymized',
    },
    
    api_security: {
      rate_limiting: 'Recommended for search endpoints',
      input_validation: 'All search parameters validated',
      sql_injection_protection: 'Parameterized queries',
    },
  },
  
  // Error Handling Strategy
  error_handling: {
    network_errors: {
      retry_logic: true,
      offline_fallback: true,
      user_feedback: true,
    },
    
    validation_errors: {
      client_side_validation: true,
      server_side_validation: true,
      user_friendly_messages: true,
    },
    
    sync_errors: {
      exponential_backoff: true,
      offline_queue: true,
      connection_recovery: true,
    },
    
    graceful_degradation: {
      offline_mode: 'Cached data and queued operations',
      partial_failures: 'Continue with available data',
      fallback_ui: 'Show appropriate loading/error states',
    },
  },
  
  // Testing Strategy
  testing: {
    unit_tests: {
      services: 'All service methods',
      hooks: 'All hook functionality',
      utilities: 'Helper functions',
    },
    
    integration_tests: {
      database_operations: 'CRUD operations',
      real_time_sync: 'WebSocket connections',
      offline_scenarios: 'Network disconnection',
    },
    
    e2e_tests: {
      search_flow: 'Complete search journey',
      favorites_flow: 'Add/remove favorites',
      sync_scenarios: 'Real-time updates',
    },
    
    performance_tests: {
      search_performance: 'Response time benchmarks',
      pagination_performance: 'Large dataset handling',
      memory_usage: 'Hook memory leaks',
    },
  },
  
  // Migration & Deployment
  deployment: {
    database_migrations: [
      'Create product tables',
      'Create indexes for search performance',
      'Set up RLS policies',
      'Create stored functions',
      'Enable realtime on tables',
    ],
    
    feature_flags: {
      real_time_sync: 'Can be disabled for performance',
      location_search: 'Requires location permissions',
      analytics: 'Can be disabled for privacy',
    },
    
    rollout_strategy: {
      gradual_rollout: true,
      a_b_testing: 'Search algorithm variations',
      monitoring: 'Search performance and error rates',
    },
  },
  
  // Future Enhancements
  roadmap: {
    v1_1: [
      'Personalized product recommendations',
      'Advanced filtering (brand, seller rating)',
      'Saved searches with notifications',
      'Product comparison feature',
    ],
    
    v1_2: [
      'Machine learning search relevance',
      'Visual search capabilities',
      'Social features (reviews, ratings)',
      'Advanced analytics dashboard',
    ],
    
    v2_0: [
      'AI-powered product matching',
      'Augmented reality product preview',
      'Voice search capabilities',
      'Blockchain-based authenticity verification',
    ],
  },
  
  // Documentation
  documentation: {
    api_reference: 'Complete TypeScript definitions',
    integration_guide: 'Step-by-step integration instructions',
    best_practices: 'Performance and UX recommendations',
    troubleshooting: 'Common issues and solutions',
    examples: 'Code examples for common use cases',
  },
} as const;
