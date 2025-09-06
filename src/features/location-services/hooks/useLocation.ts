// ============================================================================
// LOCATION HOOK - Core Location State Management
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Location,
  LocationData,
  LocationPermissionStatus,
  LocationSettings,
  LocationTrackingOptions,
  LocationUpdate,
  LocationHistory,
  LocationError,
  LocationErrorCode,
  LOCATION_CONSTANTS
} from '../types';
import { LocationService } from '../services/LocationService';

interface UseLocationState {
  currentLocation: Location | null;
  lastKnownLocation: Location | null;
  permissions: LocationPermissionStatus | null;
  settings: LocationSettings;
  locationHistory: LocationHistory[];
  isTracking: boolean;
  loading: boolean;
  error: LocationError | null;
}

interface UseLocationActions {
  getCurrentLocation: (options?: Partial<LocationTrackingOptions>) => Promise<Location | null>;
  getLastKnownLocation: () => Promise<Location | null>;
  requestPermissions: () => Promise<LocationPermissionStatus>;
  checkPermissions: () => Promise<LocationPermissionStatus>;
  requestBackgroundPermissions: () => Promise<LocationPermissionStatus>;
  startTracking: (options?: Partial<LocationTrackingOptions>) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateSettings: (newSettings: Partial<LocationSettings>) => Promise<void>;
  getLocationHistory: (limit?: number) => Promise<LocationHistory[]>;
  clearLocationHistory: () => Promise<void>;
  clearError: () => void;
  refreshLocation: () => Promise<void>;
}

export interface UseLocationReturn extends UseLocationState, UseLocationActions {}

export const useLocation = (): UseLocationReturn => {
  const [state, setState] = useState<UseLocationState>({
    currentLocation: null,
    lastKnownLocation: null,
    permissions: null,
    settings: {
      enableTracking: true,
      accuracy: LOCATION_CONSTANTS.DEFAULT_ACCURACY,
      distanceFilter: 10,
      shareLocation: true,
      saveHistory: false,
      geofenceNotifications: true
    },
    locationHistory: [],
    isTracking: false,
    loading: false,
    error: null
  });

  const locationService = useRef(LocationService.getInstance());
  const trackingCallbackRef = useRef<((update: LocationUpdate) => void) | null>(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    initializeLocation();
  }, []);

  const initializeLocation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Load settings
      const settings = locationService.current.getSettings();
      
      // Check permissions
      const permissions = await locationService.current.checkPermissions();
      
      // Get last known location
      const lastKnown = await locationService.current.getLastKnownLocation();
      
      // Get location history if enabled
      const history = settings.saveHistory ? 
        await locationService.current.getLocationHistory() : [];

      setState(prev => ({
        ...prev,
        settings,
        permissions,
        lastKnownLocation: lastKnown,
        locationHistory: history,
        isTracking: locationService.current.isCurrentlyTracking(),
        loading: false
      }));

      // Get current location if permissions granted
      if (permissions.granted) {
        await getCurrentLocation();
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as LocationError
      }));
    }
  }, []);

  // ============================================================================
  // LOCATION OPERATIONS
  // ============================================================================

  const getCurrentLocation = useCallback(async (
    options?: Partial<LocationTrackingOptions>
  ): Promise<Location | null> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const location = await locationService.current.getCurrentLocation(options);
      
      setState(prev => ({
        ...prev,
        currentLocation: location,
        lastKnownLocation: location,
        loading: false
      }));

      return location;
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({
        ...prev,
        loading: false,
        error: locationError
      }));
      return null;
    }
  }, []);

  const getLastKnownLocation = useCallback(async (): Promise<Location | null> => {
    try {
      const location = await locationService.current.getLastKnownLocation();
      
      setState(prev => ({
        ...prev,
        lastKnownLocation: location
      }));

      return location;
    } catch (error) {
      console.warn('Failed to get last known location:', error);
      return null;
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<void> => {
    await getCurrentLocation();
  }, [getCurrentLocation]);

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  const requestPermissions = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const permissions = await locationService.current.requestPermissions();
      
      setState(prev => ({
        ...prev,
        permissions,
        loading: false
      }));

      // Get current location if permissions granted
      if (permissions.granted) {
        await getCurrentLocation();
      }

      return permissions;
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({
        ...prev,
        loading: false,
        error: locationError,
        permissions: {
          granted: false,
          canAskAgain: false,
          status: locationError.code as any
        }
      }));
      throw error;
    }
  }, [getCurrentLocation]);

  const checkPermissions = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      const permissions = await locationService.current.checkPermissions();
      
      setState(prev => ({
        ...prev,
        permissions
      }));

      return permissions;
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({
        ...prev,
        error: locationError
      }));
      throw error;
    }
  }, []);

  const requestBackgroundPermissions = useCallback(async (): Promise<LocationPermissionStatus> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const permissions = await locationService.current.requestBackgroundPermissions();
      
      setState(prev => ({
        ...prev,
        permissions,
        loading: false
      }));

      return permissions;
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({
        ...prev,
        loading: false,
        error: locationError
      }));
      throw error;
    }
  }, []);

  // ============================================================================
  // LOCATION TRACKING
  // ============================================================================

  const startTracking = useCallback(async (
    options?: Partial<LocationTrackingOptions>
  ): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Create tracking callback
      trackingCallbackRef.current = (update: LocationUpdate) => {
        setState(prev => ({
          ...prev,
          currentLocation: update.location,
          lastKnownLocation: update.location
        }));
      };

      await locationService.current.startTracking(options, trackingCallbackRef.current);
      
      setState(prev => ({
        ...prev,
        isTracking: true,
        loading: false
      }));
    } catch (error) {
      const locationError = error as LocationError;
      setState(prev => ({
        ...prev,
        loading: false,
        error: locationError,
        isTracking: false
      }));
      throw error;
    }
  }, []);

  const stopTracking = useCallback(async (): Promise<void> => {
    try {
      await locationService.current.stopTracking();
      trackingCallbackRef.current = null;
      
      setState(prev => ({
        ...prev,
        isTracking: false
      }));
    } catch (error) {
      console.warn('Error stopping location tracking:', error);
    }
  }, []);

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  const updateSettings = useCallback(async (
    newSettings: Partial<LocationSettings>
  ): Promise<void> => {
    try {
      await locationService.current.updateSettings(newSettings);
      const updatedSettings = locationService.current.getSettings();
      
      setState(prev => ({
        ...prev,
        settings: updatedSettings
      }));

      // Refresh location history if saveHistory setting changed
      if ('saveHistory' in newSettings) {
        const history = newSettings.saveHistory ? 
          await locationService.current.getLocationHistory() : [];
        
        setState(prev => ({
          ...prev,
          locationHistory: history
        }));
      }
    } catch (error) {
      console.warn('Failed to update location settings:', error);
    }
  }, []);

  // ============================================================================
  // LOCATION HISTORY
  // ============================================================================

  const getLocationHistory = useCallback(async (limit?: number): Promise<LocationHistory[]> => {
    try {
      const history = await locationService.current.getLocationHistory(limit);
      
      setState(prev => ({
        ...prev,
        locationHistory: history
      }));

      return history;
    } catch (error) {
      console.warn('Failed to get location history:', error);
      return [];
    }
  }, []);

  const clearLocationHistory = useCallback(async (): Promise<void> => {
    try {
      await locationService.current.clearLocationHistory();
      
      setState(prev => ({
        ...prev,
        locationHistory: []
      }));
    } catch (error) {
      console.warn('Failed to clear location history:', error);
    }
  }, []);

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (state.isTracking) {
        locationService.current.stopTracking().catch(console.error);
      }
    };
  }, [state.isTracking]);

  return {
    // State
    currentLocation: state.currentLocation,
    lastKnownLocation: state.lastKnownLocation,
    permissions: state.permissions,
    settings: state.settings,
    locationHistory: state.locationHistory,
    isTracking: state.isTracking,
    loading: state.loading,
    error: state.error,

    // Actions
    getCurrentLocation,
    getLastKnownLocation,
    requestPermissions,
    checkPermissions,
    requestBackgroundPermissions,
    startTracking,
    stopTracking,
    updateSettings,
    getLocationHistory,
    clearLocationHistory,
    clearError,
    refreshLocation
  };
};
