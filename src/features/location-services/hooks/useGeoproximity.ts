// ============================================================================
// GEOPROXIMITY HOOK - Distance Calculations and Proximity Operations
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Coordinates,
  DistanceResult,
  DistanceUnit,
  ProximityFilter,
  ProximitySearchOptions,
  LocationBounds,
  LocationError,
  ProximitySortBy,
  LOCATION_CONSTANTS
} from '../types';
import { GeoproximityService } from '../services/GeoproximityService';

interface UseGeoproximityState {
  loading: boolean;
  error: LocationError | null;
  lastCalculation: DistanceResult | null;
}

interface UseGeoproximityActions {
  calculateDistance: (from: Coordinates, to: Coordinates, unit?: DistanceUnit) => DistanceResult;
  calculateDistances: (from: Coordinates, destinations: Coordinates[], unit?: DistanceUnit) => DistanceResult[];
  calculateBearing: (from: Coordinates, to: Coordinates) => number;
  isWithinRadius: (center: Coordinates, point: Coordinates, radius: number, unit?: DistanceUnit) => boolean;
  filterByProximity: <T extends { latitude: number; longitude: number }>(items: T[], filter: ProximityFilter) => T[];
  sortByDistance: <T extends { latitude: number; longitude: number }>(items: T[], center: Coordinates, unit?: DistanceUnit) => (T & { distance: number })[];
  findNearest: <T extends { latitude: number; longitude: number }>(items: T[], center: Coordinates, limit?: number, unit?: DistanceUnit) => (T & { distance: number })[];
  proximitySearch: <T extends { latitude: number; longitude: number }>(items: T[], options: ProximitySearchOptions) => (T & { distance?: number })[];
  calculateBounds: (center: Coordinates, radius: number, unit?: DistanceUnit) => LocationBounds;
  isWithinBounds: (point: Coordinates, bounds: LocationBounds) => boolean;
  getBoundsCenter: (bounds: LocationBounds) => Coordinates;
  convertDistance: (distance: number, fromUnit: DistanceUnit, toUnit: DistanceUnit) => number;
  formatDistance: (distance: number, unit: DistanceUnit, precision?: number) => string;
  clearCache: () => void;
  clearError: () => void;
}

export interface UseGeoproximityReturn extends UseGeoproximityState, UseGeoproximityActions {}

export const useGeoproximity = (): UseGeoproximityReturn => {
  const [state, setState] = useState<UseGeoproximityState>({
    loading: false,
    error: null,
    lastCalculation: null
  });

  const geoproximityService = useRef(GeoproximityService.getInstance());

  // ============================================================================
  // DISTANCE CALCULATIONS
  // ============================================================================

  const calculateDistance = useCallback((
    from: Coordinates,
    to: Coordinates,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): DistanceResult => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const result = geoproximityService.current.calculateDistance(from, to, unit);
      
      setState(prev => ({ ...prev, lastCalculation: result }));
      
      return result;
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      throw error;
    }
  }, []);

  const calculateDistances = useCallback((
    from: Coordinates,
    destinations: Coordinates[],
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): DistanceResult[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.calculateDistances(from, destinations, unit);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      throw error;
    }
  }, []);

  const calculateBearing = useCallback((from: Coordinates, to: Coordinates): number => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.calculateBearing(from, to);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      throw error;
    }
  }, []);

  // ============================================================================
  // PROXIMITY OPERATIONS
  // ============================================================================

  const isWithinRadius = useCallback((
    center: Coordinates,
    point: Coordinates,
    radius: number,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): boolean => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.isWithinRadius(center, point, radius, unit);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return false;
    }
  }, []);

  const filterByProximity = useCallback(<T extends { latitude: number; longitude: number }>(
    items: T[],
    filter: ProximityFilter
  ): T[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.filterByProximity(items, filter);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return [];
    }
  }, []);

  const sortByDistance = useCallback(<T extends { latitude: number; longitude: number }>(
    items: T[],
    center: Coordinates,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): (T & { distance: number })[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.sortByDistance(items, center, unit);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return [];
    }
  }, []);

  const findNearest = useCallback(<T extends { latitude: number; longitude: number }>(
    items: T[],
    center: Coordinates,
    limit: number = 10,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): (T & { distance: number })[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.findNearest(items, center, limit, unit);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return [];
    }
  }, []);

  const proximitySearch = useCallback(<T extends { latitude: number; longitude: number }>(
    items: T[],
    options: ProximitySearchOptions
  ): (T & { distance?: number })[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.proximitySearch(items, options);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return [];
    }
  }, []);

  // ============================================================================
  // BOUNDS AND REGIONS
  // ============================================================================

  const calculateBounds = useCallback((
    center: Coordinates,
    radius: number,
    unit: DistanceUnit = LOCATION_CONSTANTS.DEFAULT_DISTANCE_UNIT
  ): LocationBounds => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.calculateBounds(center, radius, unit);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      throw error;
    }
  }, []);

  const isWithinBounds = useCallback((point: Coordinates, bounds: LocationBounds): boolean => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.isWithinBounds(point, bounds);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return false;
    }
  }, []);

  const getBoundsCenter = useCallback((bounds: LocationBounds): Coordinates => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.getBoundsCenter(bounds);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      throw error;
    }
  }, []);

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  const convertDistance = useCallback((
    distance: number,
    fromUnit: DistanceUnit,
    toUnit: DistanceUnit
  ): number => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.convertDistance(distance, fromUnit, toUnit);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return distance;
    }
  }, []);

  const formatDistance = useCallback((
    distance: number,
    unit: DistanceUnit,
    precision?: number
  ): string => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      return geoproximityService.current.formatDistance(distance, unit, precision);
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({ ...prev, error: locationError }));
      return `${distance} ${unit}`;
    }
  }, []);

  const clearCache = useCallback(() => {
    geoproximityService.current.clearCache();
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // MEMOIZED HELPER FUNCTIONS
  // ============================================================================

  const helpers = useMemo(() => ({
    // Quick distance check without full calculation
    isNearby: (from: Coordinates, to: Coordinates, maxDistance: number, unit?: DistanceUnit) => {
      return isWithinRadius(from, to, maxDistance, unit);
    },

    // Get items within walking distance (default 1km)
    getWalkingDistance: <T extends { latitude: number; longitude: number }>(
      items: T[],
      center: Coordinates,
      maxDistance: number = 1
    ) => {
      return filterByProximity(items, {
        center,
        radius: maxDistance,
        unit: DistanceUnit.KILOMETERS
      });
    },

    // Get items within driving distance (default 25km)
    getDrivingDistance: <T extends { latitude: number; longitude: number }>(
      items: T[],
      center: Coordinates,
      maxDistance: number = 25
    ) => {
      return filterByProximity(items, {
        center,
        radius: maxDistance,
        unit: DistanceUnit.KILOMETERS
      });
    },

    // Create search radius for different transport modes
    createSearchRadius: (center: Coordinates, transportMode: 'walking' | 'cycling' | 'driving' | 'transit') => {
      const radiusMap = {
        walking: { radius: 1, unit: DistanceUnit.KILOMETERS },
        cycling: { radius: 5, unit: DistanceUnit.KILOMETERS },
        driving: { radius: 25, unit: DistanceUnit.KILOMETERS },
        transit: { radius: 10, unit: DistanceUnit.KILOMETERS }
      };

      const config = radiusMap[transportMode];
      return calculateBounds(center, config.radius, config.unit);
    }
  }), [isWithinRadius, filterByProximity, calculateBounds]);

  return {
    // State
    loading: state.loading,
    error: state.error,
    lastCalculation: state.lastCalculation,

    // Core distance calculations
    calculateDistance,
    calculateDistances,
    calculateBearing,

    // Proximity operations
    isWithinRadius,
    filterByProximity,
    sortByDistance,
    findNearest,
    proximitySearch,

    // Bounds and regions
    calculateBounds,
    isWithinBounds,
    getBoundsCenter,

    // Utilities
    convertDistance,
    formatDistance,
    clearCache,
    clearError,

    // Helper functions
    ...helpers
  };
};
