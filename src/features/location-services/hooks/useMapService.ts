// ============================================================================
// MAP SERVICE HOOK - Map Operations and Interactions
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Coordinates,
  LocationData,
  MapMarker,
  MapRegion,
  MapViewport,
  MapInteractionEvent,
  MapInteractionType,
  LocationBounds,
  LocationError,
  MapServiceOptions,
  LOCATION_CONSTANTS
} from '../types';
import { MapService } from '../services/MapService';

interface UseMapServiceState {
  markers: MapMarker[];
  clusteredMarkers: Map<string, MapMarker[]>;
  currentRegion: MapRegion | null;
  viewport: MapViewport | null;
  loading: boolean;
  error: LocationError | null;
}

interface UseMapServiceActions {
  addMarker: (marker: MapMarker) => void;
  removeMarker: (markerId: string) => boolean;
  updateMarker: (markerId: string, updates: Partial<MapMarker>) => boolean;
  getMarker: (markerId: string) => MapMarker | undefined;
  clearMarkers: () => void;
  getMarkersInBounds: (bounds: LocationBounds) => MapMarker[];
  getMarkersInRadius: (center: Coordinates, radius: number) => MapMarker[];
  createRegion: (center: Coordinates, zoom?: number) => MapRegion;
  createRegionFromCoordinates: (coordinates: Coordinates[], padding?: number) => MapRegion;
  createRegionFromBounds: (bounds: LocationBounds) => MapRegion;
  setCurrentRegion: (region: MapRegion) => void;
  calculateViewport: (region: MapRegion) => MapViewport;
  calculateZoomFromRegion: (region: MapRegion) => number;
  locationToMarker: (location: LocationData, options?: Partial<Omit<MapMarker, 'id' | 'position'>>) => MapMarker;
  onMapInteraction: (callbackId: string, callback: (event: MapInteractionEvent) => void) => void;
  offMapInteraction: (callbackId: string) => void;
  handleMapInteraction: (event: MapInteractionEvent) => void;
  updateOptions: (newOptions: Partial<MapServiceOptions>) => void;
  clearError: () => void;
}

export interface UseMapServiceReturn extends UseMapServiceState, UseMapServiceActions {}

export const useMapService = (options?: MapServiceOptions): UseMapServiceReturn => {
  const [state, setState] = useState<UseMapServiceState>({
    markers: [],
    clusteredMarkers: new Map(),
    currentRegion: null,
    viewport: null,
    loading: false,
    error: null
  });

  const mapService = useRef(MapService.getInstance(options));
  const interactionCallbacks = useRef(new Map<string, (event: MapInteractionEvent) => void>());

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    initializeMapService();
  }, []);

  const initializeMapService = useCallback(() => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Get initial markers
      const markers = mapService.current.getAllMarkers();
      const clusteredMarkers = mapService.current.getClusteredMarkers(LOCATION_CONSTANTS.DEFAULT_ZOOM_LEVEL);
      const currentRegion = mapService.current.getCurrentRegion();

      setState(prev => ({
        ...prev,
        markers,
        clusteredMarkers,
        currentRegion,
        viewport: currentRegion ? mapService.current.calculateViewport(currentRegion) : null,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as LocationError
      }));
    }
  }, []);

  // ============================================================================
  // MARKER MANAGEMENT
  // ============================================================================

  const addMarker = useCallback((marker: MapMarker) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      mapService.current.addMarker(marker);
      
      const updatedMarkers = mapService.current.getAllMarkers();
      const clusteredMarkers = mapService.current.getClusteredMarkers(
        state.currentRegion ? mapService.current.calculateZoomFromRegion(state.currentRegion) : LOCATION_CONSTANTS.DEFAULT_ZOOM_LEVEL
      );

      setState(prev => ({
        ...prev,
        markers: updatedMarkers,
        clusteredMarkers
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
    }
  }, [state.currentRegion]);

  const removeMarker = useCallback((markerId: string): boolean => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const removed = mapService.current.removeMarker(markerId);
      
      if (removed) {
        const updatedMarkers = mapService.current.getAllMarkers();
        const clusteredMarkers = mapService.current.getClusteredMarkers(
          state.currentRegion ? mapService.current.calculateZoomFromRegion(state.currentRegion) : LOCATION_CONSTANTS.DEFAULT_ZOOM_LEVEL
        );

        setState(prev => ({
          ...prev,
          markers: updatedMarkers,
          clusteredMarkers
        }));
      }

      return removed;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      return false;
    }
  }, [state.currentRegion]);

  const updateMarker = useCallback((markerId: string, updates: Partial<MapMarker>): boolean => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const updated = mapService.current.updateMarker(markerId, updates);
      
      if (updated) {
        const updatedMarkers = mapService.current.getAllMarkers();
        const clusteredMarkers = mapService.current.getClusteredMarkers(
          state.currentRegion ? mapService.current.calculateZoomFromRegion(state.currentRegion) : LOCATION_CONSTANTS.DEFAULT_ZOOM_LEVEL
        );

        setState(prev => ({
          ...prev,
          markers: updatedMarkers,
          clusteredMarkers
        }));
      }

      return updated;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      return false;
    }
  }, [state.currentRegion]);

  const getMarker = useCallback((markerId: string): MapMarker | undefined => {
    return mapService.current.getMarker(markerId);
  }, []);

  const clearMarkers = useCallback(() => {
    try {
      setState(prev => ({ ...prev, error: null }));

      mapService.current.clearMarkers();
      
      setState(prev => ({
        ...prev,
        markers: [],
        clusteredMarkers: new Map()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
    }
  }, []);

  const getMarkersInBounds = useCallback((bounds: LocationBounds): MapMarker[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.getMarkersInBounds(bounds);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      return [];
    }
  }, []);

  const getMarkersInRadius = useCallback((center: Coordinates, radius: number): MapMarker[] => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.getMarkersInRadius(center, radius);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      return [];
    }
  }, []);

  // ============================================================================
  // REGION MANAGEMENT
  // ============================================================================

  const createRegion = useCallback((center: Coordinates, zoom?: number): MapRegion => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.createRegion(center, zoom);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      throw error;
    }
  }, []);

  const createRegionFromCoordinates = useCallback((
    coordinates: Coordinates[],
    padding?: number
  ): MapRegion => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.createRegionFromCoordinates(coordinates, padding);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      throw error;
    }
  }, []);

  const createRegionFromBounds = useCallback((bounds: LocationBounds): MapRegion => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.createRegionFromBounds(bounds);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      throw error;
    }
  }, []);

  const setCurrentRegion = useCallback((region: MapRegion) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      mapService.current.setCurrentRegion(region);
      const viewport = mapService.current.calculateViewport(region);
      const clusteredMarkers = mapService.current.getClusteredMarkers(
        mapService.current.calculateZoomFromRegion(region)
      );

      setState(prev => ({
        ...prev,
        currentRegion: region,
        viewport,
        clusteredMarkers
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
    }
  }, []);

  const calculateViewport = useCallback((region: MapRegion): MapViewport => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.calculateViewport(region);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      throw error;
    }
  }, []);

  const calculateZoomFromRegion = useCallback((region: MapRegion): number => {
    return mapService.current.calculateZoomFromRegion(region);
  }, []);

  // ============================================================================
  // MAP INTERACTIONS
  // ============================================================================

  const onMapInteraction = useCallback((
    callbackId: string,
    callback: (event: MapInteractionEvent) => void
  ) => {
    interactionCallbacks.current.set(callbackId, callback);
    mapService.current.onMapInteraction(callbackId, callback);
  }, []);

  const offMapInteraction = useCallback((callbackId: string) => {
    interactionCallbacks.current.delete(callbackId);
    mapService.current.offMapInteraction(callbackId);
  }, []);

  const handleMapInteraction = useCallback((event: MapInteractionEvent) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      mapService.current.handleMapInteraction(event);

      // Update state if region changed
      if (event.type === MapInteractionType.REGION_CHANGE && event.region) {
        const viewport = mapService.current.calculateViewport(event.region);
        const clusteredMarkers = mapService.current.getClusteredMarkers(
          mapService.current.calculateZoomFromRegion(event.region)
        );

        setState(prev => ({
          ...prev,
          currentRegion: event.region!,
          viewport,
          clusteredMarkers
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
    }
  }, []);

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  const locationToMarker = useCallback((
    location: LocationData,
    options?: Partial<Omit<MapMarker, 'id' | 'position'>>
  ): MapMarker => {
    try {
      setState(prev => ({ ...prev, error: null }));
      return mapService.current.locationToMarker(location, options);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
      throw error;
    }
  }, []);

  const updateOptions = useCallback((newOptions: Partial<MapServiceOptions>) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      mapService.current.updateOptions(newOptions);
      
      // Update clustered markers if clustering option changed
      if ('enableClustering' in newOptions) {
        const clusteredMarkers = mapService.current.getClusteredMarkers(
          state.currentRegion ? mapService.current.calculateZoomFromRegion(state.currentRegion) : LOCATION_CONSTANTS.DEFAULT_ZOOM_LEVEL
        );

        setState(prev => ({
          ...prev,
          clusteredMarkers
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as LocationError
      }));
    }
  }, [state.currentRegion]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // MEMOIZED HELPER FUNCTIONS
  // ============================================================================

  const helpers = useMemo(() => ({
    // Get visible markers in current region
    getVisibleMarkers: () => {
      if (!state.currentRegion) return state.markers;
      
      const viewport = mapService.current.calculateViewport(state.currentRegion);
      return mapService.current.getMarkersInBounds(viewport.bounds);
    },

    // Create marker from coordinates with default styling
    createMarker: (coordinates: Coordinates, title?: string, description?: string): MapMarker => {
      return {
        id: `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: coordinates,
        title,
        description
      };
    },

    // Fit map to show all markers
    fitToMarkers: (padding: number = 0.1) => {
      if (state.markers.length === 0) return null;
      
      const coordinates = state.markers.map(marker => marker.position);
      return mapService.current.createRegionFromCoordinates(coordinates, padding);
    },

    // Get cluster info for a specific zoom level
    getClusterInfo: (zoomLevel: number) => {
      const clusters = mapService.current.getClusteredMarkers(zoomLevel);
      return {
        totalClusters: clusters.size,
        totalMarkers: state.markers.length,
        averageMarkersPerCluster: state.markers.length / clusters.size
      };
    }
  }), [state.markers, state.currentRegion]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      // Clean up interaction callbacks
      interactionCallbacks.current.forEach((_, callbackId) => {
        mapService.current.offMapInteraction(callbackId);
      });
      interactionCallbacks.current.clear();
    };
  }, []);

  return {
    // State
    markers: state.markers,
    clusteredMarkers: state.clusteredMarkers,
    currentRegion: state.currentRegion,
    viewport: state.viewport,
    loading: state.loading,
    error: state.error,

    // Marker management
    addMarker,
    removeMarker,
    updateMarker,
    getMarker,
    clearMarkers,
    getMarkersInBounds,
    getMarkersInRadius,

    // Region management
    createRegion,
    createRegionFromCoordinates,
    createRegionFromBounds,
    setCurrentRegion,
    calculateViewport,
    calculateZoomFromRegion,

    // Map interactions
    onMapInteraction,
    offMapInteraction,
    handleMapInteraction,

    // Utilities
    locationToMarker,
    updateOptions,
    clearError,

    // Helper functions
    ...helpers
  };
};
