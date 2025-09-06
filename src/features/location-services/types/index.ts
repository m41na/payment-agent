// ============================================================================
// LOCATION SERVICES FEATURE - TYPE DEFINITIONS
// ============================================================================

import { Database } from '../../../types/supabase';

// ============================================================================
// CORE LOCATION TYPES
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

export interface LocationData extends Coordinates {
  address?: string;
  locationName?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  placeId?: string;
}

export interface GeofenceRegion {
  id: string;
  center: Coordinates;
  radius: number; // in meters
  identifier: string;
  notifyOnEntry?: boolean;
  notifyOnExit?: boolean;
}

// ============================================================================
// DISTANCE AND PROXIMITY TYPES
// ============================================================================

export interface DistanceResult {
  distance: number; // in kilometers or miles based on unit
  unit: DistanceUnit;
  bearing?: number; // direction in degrees
  duration?: number; // estimated travel time in minutes
}

export interface ProximityFilter {
  center: Coordinates;
  radius: number; // in kilometers or miles
  unit: DistanceUnit;
}

export interface LocationBounds {
  northeast: Coordinates;
  southwest: Coordinates;
}

export interface ProximitySearchOptions {
  center: Coordinates;
  radius: number;
  unit: DistanceUnit;
  limit?: number;
  offset?: number;
  sortBy?: ProximitySortBy;
  includeDistance?: boolean;
}

// ============================================================================
// MAP TYPES
// ============================================================================

export interface MapMarker {
  id: string;
  position: Coordinates;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  data?: any;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapViewport {
  bounds: LocationBounds;
  center: Coordinates;
  zoom: number;
}

export interface MapInteractionEvent {
  type: MapInteractionType;
  coordinates: Coordinates;
  marker?: MapMarker;
  region?: MapRegion;
}

// ============================================================================
// GEOCODING TYPES
// ============================================================================

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  addressComponents: AddressComponent[];
  placeId?: string;
  types: string[];
  confidence?: number;
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

export interface ReverseGeocodingResult {
  address: string;
  addressComponents: AddressComponent[];
  placeId?: string;
  types: string[];
}

// ============================================================================
// LOCATION SEARCH TYPES
// ============================================================================

export interface LocationSearchQuery {
  query: string;
  center?: Coordinates;
  radius?: number;
  types?: LocationType[];
  limit?: number;
}

export interface LocationSearchResult {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  types: LocationType[];
  rating?: number;
  distance?: number;
  placeId?: string;
}

// ============================================================================
// LOCATION TRACKING TYPES
// ============================================================================

export interface LocationTrackingOptions {
  accuracy: LocationAccuracy;
  distanceFilter?: number; // minimum distance in meters before update
  timeInterval?: number; // minimum time in milliseconds between updates
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface LocationUpdate {
  location: Location;
  timestamp: number;
  accuracy: number;
  source: LocationSource;
}

export interface LocationHistory {
  id: string;
  userId: string;
  location: Location;
  timestamp: number;
  accuracy: number;
  source: LocationSource;
  metadata?: Record<string, any>;
}

// ============================================================================
// LOCATION PERMISSIONS TYPES
// ============================================================================

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: LocationPermission;
  accuracy?: LocationAccuracy;
}

export interface LocationSettings {
  enableTracking: boolean;
  accuracy: LocationAccuracy;
  distanceFilter: number;
  shareLocation: boolean;
  saveHistory: boolean;
  geofenceNotifications: boolean;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum DistanceUnit {
  KILOMETERS = 'kilometers',
  MILES = 'miles',
  METERS = 'meters',
  FEET = 'feet'
}

export enum LocationAccuracy {
  LOWEST = 'lowest',
  LOW = 'low',
  BALANCED = 'balanced',
  HIGH = 'high',
  HIGHEST = 'highest'
}

export enum LocationPermission {
  DENIED = 'denied',
  GRANTED = 'granted',
  RESTRICTED = 'restricted',
  UNDETERMINED = 'undetermined'
}

export enum LocationSource {
  GPS = 'gps',
  NETWORK = 'network',
  PASSIVE = 'passive',
  FUSED = 'fused',
  MANUAL = 'manual'
}

export enum LocationType {
  BUSINESS = 'business',
  RESTAURANT = 'restaurant',
  STORE = 'store',
  EVENT_VENUE = 'event_venue',
  LANDMARK = 'landmark',
  ADDRESS = 'address',
  INTERSECTION = 'intersection',
  POSTAL_CODE = 'postal_code'
}

export enum MapInteractionType {
  TAP = 'tap',
  LONG_PRESS = 'long_press',
  MARKER_PRESS = 'marker_press',
  REGION_CHANGE = 'region_change',
  DRAG_END = 'drag_end'
}

export enum ProximitySortBy {
  DISTANCE = 'distance',
  RELEVANCE = 'relevance',
  RATING = 'rating',
  NAME = 'name'
}

// ============================================================================
// SERVICE OPERATION TYPES
// ============================================================================

export interface LocationServiceOptions {
  enableGeocoding?: boolean;
  enableReverseGeocoding?: boolean;
  enableLocationSearch?: boolean;
  cacheResults?: boolean;
  cacheDuration?: number; // in milliseconds
  retryAttempts?: number;
  timeout?: number;
}

export interface GeoproximityServiceOptions {
  defaultUnit?: DistanceUnit;
  earthRadius?: number; // custom earth radius for calculations
  precision?: number; // decimal places for distance calculations
  enableBearing?: boolean;
  enableDuration?: boolean;
}

export interface MapServiceOptions {
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  enableClustering?: boolean;
  clusterRadius?: number;
  enableUserLocation?: boolean;
  enableCompass?: boolean;
  enableZoomControls?: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface LocationError {
  code: LocationErrorCode;
  message: string;
  details?: any;
  timestamp: number;
}

export enum LocationErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  GEOCODING_FAILED = 'GEOCODING_FAILED',
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// ============================================================================
// ANALYTICS AND METRICS TYPES
// ============================================================================

export interface LocationAnalytics {
  locationRequests: number;
  geocodingRequests: number;
  proximitySearches: number;
  mapInteractions: number;
  averageAccuracy: number;
  errorRate: number;
  lastUpdated: number;
}

export interface LocationMetrics {
  totalDistanceTraveled: number;
  averageSpeed: number;
  locationsVisited: number;
  timeSpentAtLocations: Record<string, number>;
  frequentLocations: LocationData[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const LOCATION_CONSTANTS = {
  // Earth radius in different units
  EARTH_RADIUS_KM: 6371,
  EARTH_RADIUS_MILES: 3959,
  EARTH_RADIUS_METERS: 6371000,
  
  // Default values
  DEFAULT_ACCURACY: LocationAccuracy.BALANCED,
  DEFAULT_DISTANCE_UNIT: DistanceUnit.KILOMETERS,
  DEFAULT_ZOOM_LEVEL: 13,
  DEFAULT_SEARCH_RADIUS: 10, // kilometers
  DEFAULT_CACHE_DURATION: 300000, // 5 minutes
  DEFAULT_TIMEOUT: 10000, // 10 seconds
  
  // Limits
  MAX_SEARCH_RESULTS: 50,
  MAX_HISTORY_ENTRIES: 1000,
  MIN_DISTANCE_FILTER: 1, // meters
  MAX_DISTANCE_FILTER: 1000, // meters
  
  // Precision
  COORDINATE_PRECISION: 6,
  DISTANCE_PRECISION: 2,
  
  // Geofence limits
  MIN_GEOFENCE_RADIUS: 10, // meters
  MAX_GEOFENCE_RADIUS: 100000, // 100km
  MAX_GEOFENCES: 20
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isValidCoordinates = (coords: any): coords is Coordinates => {
  return (
    coords &&
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
};

export const isValidLocation = (location: any): location is Location => {
  return isValidCoordinates(location);
};

export const isValidLocationData = (data: any): data is LocationData => {
  return isValidCoordinates(data);
};

export const isLocationError = (error: any): error is LocationError => {
  return (
    error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.timestamp === 'number'
  );
};
