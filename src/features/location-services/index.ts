// ============================================================================
// LOCATION SERVICES FEATURE - PUBLIC API
// ============================================================================

// Services
export { LocationService } from './services/LocationService';
export { GeoproximityService } from './services/GeoproximityService';
export { MapService } from './services/MapService';

// Hooks
export { useLocation } from './hooks/useLocation';
export { useGeoproximity } from './hooks/useGeoproximity';
export { useMapService } from './hooks/useMapService';
export { useLocationServices } from './hooks/useLocationServices';

// Types and Interfaces
export type {
  // Core location types
  Coordinates,
  Location,
  LocationData,
  GeofenceRegion,
  
  // Distance and proximity types
  DistanceResult,
  ProximityFilter,
  LocationBounds,
  ProximitySearchOptions,
  
  // Map types
  MapMarker,
  MapRegion,
  MapViewport,
  MapInteractionEvent,
  
  // Geocoding types
  GeocodingResult,
  AddressComponent,
  ReverseGeocodingResult,
  
  // Location search types
  LocationSearchQuery,
  LocationSearchResult,
  
  // Location tracking types
  LocationTrackingOptions,
  LocationUpdate,
  LocationHistory,
  
  // Location permissions types
  LocationPermissionStatus,
  LocationSettings,
  
  // Service operation types
  LocationServiceOptions,
  GeoproximityServiceOptions,
  MapServiceOptions,
  
  // Error types
  LocationError,
  
  // Analytics types
  LocationAnalytics,
  LocationMetrics,
  
  // Hook return types
  UseLocationReturn,
  UseGeoproximityReturn,
  UseMapServiceReturn,
  UseLocationServicesReturn
} from './types';

// Enums
export {
  DistanceUnit,
  LocationAccuracy,
  LocationPermission,
  LocationSource,
  LocationType,
  MapInteractionType,
  ProximitySortBy,
  LocationErrorCode
} from './types';

// Constants
export { LOCATION_CONSTANTS } from './types';

// Type Guards
export {
  isValidCoordinates,
  isValidLocation,
  isValidLocationData,
  isLocationError
} from './types';

// ============================================================================
// FEATURE METADATA
// ============================================================================

export const LOCATION_SERVICES_FEATURE = {
  name: 'Location Services',
  version: '1.0.0',
  description: 'Core location services providing geolocation, proximity calculations, and map operations for the local marketplace platform',
  
  // ============================================================================
  // CAPABILITIES
  // ============================================================================
  capabilities: {
    location: {
      permissions: 'Request and manage location permissions (foreground and background)',
      tracking: 'Continuous location tracking with configurable accuracy and filters',
      history: 'Location history management with optional persistence',
      caching: 'Intelligent location caching for offline scenarios',
      settings: 'Customizable location service settings and preferences'
    },
    
    geoproximity: {
      distance: 'Haversine formula distance calculations between coordinates',
      bearing: 'Calculate bearing/direction between two points',
      proximity: 'Filter and sort items by proximity to a center point',
      bounds: 'Calculate bounding boxes and check point containment',
      search: 'Advanced proximity search with multiple sorting options',
      units: 'Support for multiple distance units (km, miles, meters, feet)'
    },
    
    maps: {
      regions: 'Create and manage map regions with zoom levels',
      markers: 'Add, update, remove, and cluster map markers',
      interactions: 'Handle map interaction events (tap, drag, zoom)',
      viewport: 'Calculate viewports and bounds from regions',
      clustering: 'Automatic marker clustering based on zoom level',
      utilities: 'Convert between location data and map markers'
    },
    
    integration: {
      realTime: 'Real-time location updates with callback support',
      offline: 'Offline-first design with local caching and queuing',
      permissions: 'Comprehensive permission management and error handling',
      analytics: 'Location analytics and usage metrics tracking',
      crossPlatform: 'React Native compatible with Expo Location'
    }
  },

  // ============================================================================
  // DEPENDENCIES
  // ============================================================================
  dependencies: {
    external: {
      'expo-location': '^16.0.0',
      '@react-native-async-storage/async-storage': '^1.19.0',
      'react': '^18.0.0',
      'react-native': '^0.72.0'
    },
    internal: {
      types: '../../../types/supabase',
      contexts: 'No direct context dependencies - self-contained'
    }
  },

  // ============================================================================
  // INTEGRATION POINTS
  // ============================================================================
  integrations: {
    features: {
      'product-discovery': {
        purpose: 'Geoproximity sorting and filtering of products by location',
        methods: ['sortByDistance', 'filterByProximity', 'findNearest'],
        dataFlow: 'Products with coordinates → Location-sorted results'
      },
      'events-management': {
        purpose: 'Location-based event discovery and proximity filtering',
        methods: ['calculateDistance', 'proximitySearch', 'getNearbyLocations'],
        dataFlow: 'Events with coordinates → Distance-enhanced event listings'
      },
      'inventory-management': {
        purpose: 'Location-aware inventory listing and merchant proximity',
        methods: ['sortByProximity', 'getSearchBounds', 'isLocationNearby'],
        dataFlow: 'Inventory items → Location-filtered and sorted results'
      },
      'user-profile': {
        purpose: 'Business location management and address validation',
        methods: ['validateCoordinates', 'formatCoordinates', 'locationToMarker'],
        dataFlow: 'User addresses → Validated coordinates and map markers'
      }
    },
    
    external: {
      maps: {
        leaflet: 'Integration with Leaflet maps via MapLocationPicker component',
        webview: 'WebView-based map rendering for cross-platform compatibility'
      },
      storage: {
        asyncStorage: 'Local persistence for location history and settings',
        cache: 'In-memory caching for distance calculations and location data'
      }
    }
  },

  // ============================================================================
  // DATABASE SCHEMA
  // ============================================================================
  databaseSchema: {
    tables: {
      // Location services primarily work with existing tables that have lat/lng columns
      products: ['latitude', 'longitude', 'location_name', 'address'],
      events: ['latitude', 'longitude', 'location_name', 'address'],
      profiles: ['latitude', 'longitude', 'business_address', 'location_name']
    },
    
    // Optional location-specific tables for advanced features
    optionalTables: {
      location_history: {
        columns: ['id', 'user_id', 'latitude', 'longitude', 'accuracy', 'timestamp', 'source', 'metadata'],
        purpose: 'Store user location history if enabled in settings'
      },
      geofences: {
        columns: ['id', 'user_id', 'name', 'center_lat', 'center_lng', 'radius', 'active'],
        purpose: 'Geofence regions for location-based notifications'
      }
    }
  },

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  configuration: {
    defaults: {
      accuracy: 'LocationAccuracy.BALANCED',
      distanceUnit: 'DistanceUnit.KILOMETERS',
      searchRadius: '10 kilometers',
      cacheTimeout: '5 minutes',
      trackingInterval: '5 seconds',
      distanceFilter: '10 meters'
    },
    
    limits: {
      maxSearchResults: 50,
      maxHistoryEntries: 1000,
      maxGeofences: 20,
      maxCacheSize: '1000 distance calculations',
      coordinatePrecision: '6 decimal places'
    },
    
    permissions: {
      required: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      optional: ['ACCESS_BACKGROUND_LOCATION'],
      rationale: 'Location access required for local marketplace functionality'
    }
  },

  // ============================================================================
  // SECURITY
  // ============================================================================
  security: {
    permissions: {
      location: 'Requests appropriate location permissions with user consent',
      background: 'Optional background location for continuous tracking',
      storage: 'Local storage access for caching and history'
    },
    
    privacy: {
      dataMinimization: 'Only collects location data when explicitly needed',
      userControl: 'Users can disable location history and tracking',
      localStorage: 'Location data stored locally, not transmitted by default',
      anonymization: 'Location history can be cleared at any time'
    },
    
    validation: {
      coordinates: 'Validates coordinate ranges and formats',
      permissions: 'Checks permission status before location operations',
      errorHandling: 'Comprehensive error handling for location failures'
    }
  },

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  errorHandling: {
    types: {
      PERMISSION_DENIED: 'Location permissions not granted',
      LOCATION_UNAVAILABLE: 'Unable to determine location',
      TIMEOUT: 'Location request timed out',
      NETWORK_ERROR: 'Network connectivity issues',
      INVALID_COORDINATES: 'Invalid coordinate values provided',
      SERVICE_UNAVAILABLE: 'Location services disabled or unavailable'
    },
    
    strategies: {
      gracefulDegradation: 'Fall back to cached location or manual input',
      userFeedback: 'Clear error messages with actionable guidance',
      retryLogic: 'Automatic retry with exponential backoff',
      fallbackMethods: 'Multiple location sources (GPS, network, cached)'
    }
  },

  // ============================================================================
  // TESTING STRATEGY
  // ============================================================================
  testing: {
    unit: {
      services: 'Test location calculations, distance formulas, and coordinate validation',
      hooks: 'Test React hook state management and side effects',
      utilities: 'Test coordinate transformations and formatting functions'
    },
    
    integration: {
      permissions: 'Test permission request flows and error handling',
      tracking: 'Test location tracking start/stop and callback mechanisms',
      caching: 'Test location caching and cache invalidation logic'
    },
    
    mocking: {
      location: 'Mock Expo Location API for consistent test results',
      permissions: 'Mock permission states for different test scenarios',
      storage: 'Mock AsyncStorage for testing persistence logic'
    }
  },

  // ============================================================================
  // PERFORMANCE
  // ============================================================================
  performance: {
    optimization: {
      caching: 'Distance calculations cached with TTL expiration',
      clustering: 'Marker clustering reduces map rendering overhead',
      debouncing: 'Location updates debounced to prevent excessive callbacks',
      lazy: 'Services instantiated only when needed (singleton pattern)'
    },
    
    monitoring: {
      accuracy: 'Track location accuracy and update frequency',
      battery: 'Monitor battery impact of location tracking',
      memory: 'Limit cache sizes and clean up old entries',
      network: 'Minimize network requests for location operations'
    }
  },

  // ============================================================================
  // DEPLOYMENT
  // ============================================================================
  deployment: {
    requirements: {
      platform: 'React Native with Expo Location support',
      permissions: 'Location permissions configured in app.json/Info.plist',
      storage: 'AsyncStorage available for local persistence'
    },
    
    configuration: {
      production: 'Disable debug logging and enable production optimizations',
      development: 'Enable verbose logging and mock location providers',
      testing: 'Use mock location services for automated testing'
    }
  },

  // ============================================================================
  // ROADMAP
  // ============================================================================
  roadmap: {
    immediate: {
      geocoding: 'Address to coordinate conversion and reverse geocoding',
      search: 'Location search with place name and address lookup',
      geofencing: 'Geofence creation and notification system'
    },
    
    shortTerm: {
      routing: 'Basic routing and directions between locations',
      offline: 'Enhanced offline map support and tile caching',
      analytics: 'Detailed location analytics and usage patterns'
    },
    
    longTerm: {
      ml: 'Machine learning for location prediction and optimization',
      ar: 'Augmented reality location features and overlays',
      social: 'Social location sharing and friend finding features'
    }
  },

  // ============================================================================
  // DOCUMENTATION
  // ============================================================================
  documentation: {
    api: {
      services: 'Complete API documentation for all service methods',
      hooks: 'React hook usage examples and best practices',
      types: 'TypeScript type definitions and interfaces'
    },
    
    guides: {
      setup: 'Getting started with location services',
      permissions: 'Managing location permissions and user consent',
      proximity: 'Implementing proximity-based features',
      maps: 'Integrating maps and markers',
      performance: 'Optimizing location service performance'
    },
    
    examples: {
      basic: 'Simple location retrieval and display',
      tracking: 'Continuous location tracking implementation',
      proximity: 'Proximity search and filtering examples',
      maps: 'Map integration with markers and regions'
    }
  }
} as const;
