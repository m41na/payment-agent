// ============================================================================
// LOCATION SERVICES HOOK - Unified Location Management
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Coordinates,
  Location,
  LocationData,
  LocationPermissionStatus,
  LocationSettings,
  LocationTrackingOptions,
  LocationUpdate,
  LocationHistory,
  LocationError,
  DistanceResult,
  DistanceUnit,
  ProximityFilter,
  ProximitySearchOptions,
  MapMarker,
  MapRegion,
  MapViewport,
  MapInteractionEvent,
  LocationBounds,
  LOCATION_CONSTANTS
} from '../types';
import { useLocation } from './useLocation';
import { useGeoproximity } from './useGeoproximity';
import { useMapService } from './useMapService';

interface UseLocationServicesState {
  // Location state
  currentLocation: Location | null;
  lastKnownLocation: Location | null;
  permissions: LocationPermissionStatus | null;
  settings: LocationSettings;
  locationHistory: LocationHistory[];
  isTracking: boolean;
  
  // Map state
  markers: MapMarker[];
  currentRegion: MapRegion | null;
  viewport: MapViewport | null;
  
  // General state
  loading: boolean;
  error: LocationError | null;
}

interface UseLocationServicesActions {
  // Location operations
  getCurrentLocation: (options?: Partial<LocationTrackingOptions>) => Promise<Location | null>;
  requestPermissions: () => Promise<LocationPermissionStatus>;
  startTracking: (options?: Partial<LocationTrackingOptions>) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateSettings: (newSettings: Partial<LocationSettings>) => Promise<void>;
  
  // Proximity operations
  calculateDistance: (from: Coordinates, to: Coordinates, unit?: DistanceUnit) => DistanceResult;
  findNearbyItems: <T extends { latitude: number; longitude: number }>(
    items: T[], 
    center?: Coordinates, 
    radius?: number, 
    unit?: DistanceUnit
  ) => (T & { distance: number })[];
  sortByProximity: <T extends { latitude: number; longitude: number }>(
    items: T[], 
    center?: Coordinates, 
    unit?: DistanceUnit
  ) => (T & { distance: number })[];
  
  // Map operations
  addLocationMarker: (location: LocationData, options?: Partial<Omit<MapMarker, 'id' | 'position'>>) => void;
  setMapRegion: (region: MapRegion) => void;
  fitMapToLocations: (locations: Coordinates[], padding?: number) => MapRegion | null;
  
  // Utility operations
  formatDistance: (distance: number, unit?: DistanceUnit) => string;
  isLocationNearby: (location: Coordinates, maxDistance?: number, unit?: DistanceUnit) => boolean;
  clearError: () => void;
  refreshLocation: () => Promise<void>;
}

export interface UseLocationServicesReturn extends UseLocationServicesState, UseLocationServicesActions {}

export const useLocationServices = (): UseLocationServicesReturn => {
  const location = useLocation();
  const geoproximity = useGeoproximity();
  const mapService = useMapService();

  const [combinedState, setCombinedState] = useState<{
    loading: boolean;
    error: LocationError | null;
  }>({
    loading: false,
    error: null
  });

  // ============================================================================
  // COMBINED STATE MANAGEMENT
  // ============================================================================

  const state = useMemo<UseLocationServicesState>(() => ({
    // Location state
    currentLocation: location.currentLocation,
    lastKnownLocation: location.lastKnownLocation,
    permissions: location.permissions,
    settings: location.settings,
    locationHistory: location.locationHistory,
    isTracking: location.isTracking,
    
    // Map state
    markers: mapService.markers,
    currentRegion: mapService.currentRegion,
    viewport: mapService.viewport,
    
    // Combined loading and error state
    loading: combinedState.loading || location.loading || mapService.loading,
    error: combinedState.error || location.error || geoproximity.error || mapService.error
  }), [
    location.currentLocation,
    location.lastKnownLocation,
    location.permissions,
    location.settings,
    location.locationHistory,
    location.isTracking,
    location.loading,
    location.error,
    mapService.markers,
    mapService.currentRegion,
    mapService.viewport,
    mapService.loading,
    mapService.error,
    geoproximity.error,
    combinedState.loading,
    combinedState.error
  ]);

  // ============================================================================
  // ENHANCED LOCATION OPERATIONS
  // ============================================================================

  const getCurrentLocation = useCallback(async (
    options?: Partial<LocationTrackingOptions>
  ): Promise<Location | null> => {
    try {
      setCombinedState(prev => ({ ...prev, loading: true, error: null }));
      
      const currentLocation = await location.getCurrentLocation(options);
      
      // Auto-update map region if we have a current location and no region is set
      if (currentLocation && !mapService.currentRegion) {
        const region = mapService.createRegion(currentLocation);
        mapService.setCurrentRegion(region);
      }
      
      setCombinedState(prev => ({ ...prev, loading: false }));
      return currentLocation;
    } catch (error) {
      const locationError = error as LocationError;
      setCombinedState(prev => ({ ...prev, loading: false, error: locationError }));
      return null;
    }
  }, [location, mapService]);

  const requestPermissions = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      setCombinedState(prev => ({ ...prev, loading: true, error: null }));
      
      const permissions = await location.requestPermissions();
      
      setCombinedState(prev => ({ ...prev, loading: false }));
      return permissions;
    } catch (error) {
      const locationError = error as LocationError;
      setCombinedState(prev => ({ ...prev, loading: false, error: locationError }));
      throw error;
    }
  }, [location]);

  const startTracking = useCallback(async (
    options?: Partial<LocationTrackingOptions>
  ): Promise<void> => {
    try {
      setCombinedState(prev => ({ ...prev, loading: true, error: null }));
      
      await location.startTracking(options);
      
      setCombinedState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      const locationError = error as LocationError;
      setCombinedState(prev => ({ ...prev, loading: false, error: locationError }));
      throw error;
    }
  }, [location]);

  const stopTracking = useCallback(async (): Promise<void> => {
    await location.stopTracking();
  }, [location]);

  const updateSettings = useCallback(async (
    newSettings: Partial<LocationSettings>
  ): Promise<void> => {
    await location.updateSettings(newSettings);
  }, [location]);

  // ============================================================================
  // ENHANCED PROXIMITY OPERATIONS
  // ============================================================================

  const calculateDistance = useCallback((
    from: Coordinates,
    to: Coordinates,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): DistanceResult => {
    return geoproximity.calculateDistance(from, to, unit);
  }, [geoproximity]);

  const findNearbyItems = useCallback(<T extends { latitude: number; longitude: number }>(
    items: T[],
    center?: Coordinates,
    radius: number = LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): (T & { distance: number })[] => {
    const searchCenter = center || state.currentLocation;
    if (!searchCenter) {
      console.warn('No location available for proximity search');
      return [];
    }

    const filter: ProximityFilter = {
      center: searchCenter,
      radius,
      unit
    };

    const nearbyItems = geoproximity.filterByProximity(items, filter);
    return geoproximity.sortByDistance(nearbyItems, searchCenter, unit);
  }, [geoproximity, state.currentLocation]);

  const sortByProximity = useCallback(<T extends { latitude: number; longitude: number }>(
    items: T[],
    center?: Coordinates,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): (T & { distance: number })[] => {
    const searchCenter = center || state.currentLocation;
    if (!searchCenter) {
      console.warn('No location available for proximity sorting');
      return items.map(item => ({ ...item, distance: 0 }));
    }

    return geoproximity.sortByDistance(items, searchCenter, unit);
  }, [geoproximity, state.currentLocation]);

  // ============================================================================
  // ENHANCED MAP OPERATIONS
  // ============================================================================

  const addLocationMarker = useCallback((
    location: LocationData,
    options?: Partial<Omit<MapMarker, 'id' | 'position'>>
  ) => {
    const marker = mapService.locationToMarker(location, options);
    mapService.addMarker(marker);
  }, [mapService]);

  const setMapRegion = useCallback((region: MapRegion) => {
    mapService.setCurrentRegion(region);
  }, [mapService]);

  const fitMapToLocations = useCallback((
    locations: Coordinates[],
    padding: number = 0.1
  ): MapRegion | null => {
    if (locations.length === 0) return null;
    
    const region = mapService.createRegionFromCoordinates(locations, padding);
    mapService.setCurrentRegion(region);
    return region;
  }, [mapService]);

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  const formatDistance = useCallback((
    distance: number,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): string => {
    return geoproximity.formatDistance(distance, unit);
  }, [geoproximity]);

  const isLocationNearby = useCallback((
    targetLocation: Coordinates,
    maxDistance: number = 1,
    unit: DistanceUnit = DistanceUnit.KILOMETERS
  ): boolean => {
    if (!state.currentLocation) return false;
    
    return geoproximity.isWithinRadius(
      state.currentLocation,
      targetLocation,
      maxDistance,
      unit
    );
  }, [geoproximity, state.currentLocation]);

  const clearError = useCallback(() => {
    setCombinedState(prev => ({ ...prev, error: null }));
    location.clearError();
    geoproximity.clearError();
    mapService.clearError();
  }, [location, geoproximity, mapService]);

  const refreshLocation = useCallback(async (): Promise<void> => {
    await getCurrentLocation();
  }, [getCurrentLocation]);

  // ============================================================================
  // ENHANCED HELPER FUNCTIONS
  // ============================================================================

  const helpers = useMemo(() => ({
    // Get nearby locations with automatic current location
    getNearbyLocations: <T extends { latitude: number; longitude: number }>(
      items: T[],
      transportMode: 'walking' | 'cycling' | 'driving' | 'transit' = 'walking'
    ) => {
      const radiusMap = {
        walking: 1,
        cycling: 5,
        driving: 25,
        transit: 10
      };
      
      return findNearbyItems(
        items,
        state.currentLocation || undefined,
        radiusMap[transportMode],
        DistanceUnit.KILOMETERS
      );
    },

    // Add current location as marker
    addCurrentLocationMarker: (options?: Partial<Omit<MapMarker, 'id' | 'position'>>) => {
      if (!state.currentLocation) return null;
      
      const marker: MapMarker = {
        id: 'current_location',
        position: state.currentLocation,
        title: 'Your Location',
        description: 'Current location',
        color: '#007AFF',
        ...options
      };
      
      mapService.addMarker(marker);
      return marker;
    },

    // Center map on current location
    centerMapOnCurrentLocation: (zoom?: number) => {
      if (!state.currentLocation) return null;
      
      const region = mapService.createRegion(state.currentLocation, zoom);
      mapService.setCurrentRegion(region);
      return region;
    },

    // Get location-aware search bounds
    getSearchBounds: (radius: number = LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS) => {
      if (!state.currentLocation) return null;
      
      return geoproximity.calculateBounds(
        state.currentLocation,
        radius,
        LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
      );
    },

    // Check if location services are ready
    isReady: () => {
      return !!(
        state.permissions?.granted &&
        state.currentLocation &&
        !state.loading
      );
    },

    // Get location summary
    getLocationSummary: () => ({
      hasPermissions: state.permissions?.granted || false,
      hasCurrentLocation: !!state.currentLocation,
      isTracking: state.isTracking,
      markerCount: state.markers.length,
      hasMapRegion: !!state.currentRegion,
      isLoading: state.loading,
      hasError: !!state.error
    })
  }), [
    state.currentLocation,
    state.permissions,
    state.isTracking,
    state.markers.length,
    state.currentRegion,
    state.loading,
    state.error,
    findNearbyItems,
    mapService,
    geoproximity
  ]);

  return {
    // Combined state
    ...state,

    // Location operations
    getCurrentLocation,
    requestPermissions,
    startTracking,
    stopTracking,
    updateSettings,

    // Proximity operations
    calculateDistance,
    findNearbyItems,
    sortByProximity,

    // Map operations
    addLocationMarker,
    setMapRegion,
    fitMapToLocations,

    // Utility operations
    formatDistance,
    isLocationNearby,
    clearError,
    refreshLocation,

    // Helper functions
    ...helpers
  };
};
