// ============================================================================
// LOCATION SERVICE - Core Location Operations
// ============================================================================

import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Coordinates,
  Location as LocationType,
  LocationData,
  LocationPermissionStatus,
  LocationSettings,
  LocationTrackingOptions,
  LocationUpdate,
  LocationHistory,
  LocationError,
  LocationErrorCode,
  LocationAccuracy,
  LocationPermission,
  LocationSource,
  LOCATION_CONSTANTS,
  isValidCoordinates
} from '../types';

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationType | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;
  private settings: LocationSettings;
  private locationHistory: LocationHistory[] = [];
  private isTracking = false;

  private constructor() {
    this.settings = {
      enableTracking: true,
      accuracy: LocationAccuracy.BALANCED,
      distanceFilter: 10,
      shareLocation: true,
      saveHistory: false,
      geofenceNotifications: true
    };
    this.loadSettings();
    this.loadLocationHistory();
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // ============================================================================
  // PERMISSION MANAGEMENT
  // ============================================================================

  /**
   * Request location permissions from the user
   */
  async requestPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      const permissionStatus: LocationPermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status: this.mapLocationPermission(status),
        accuracy: status === 'granted' ? this.settings.accuracy : undefined
      };

      return permissionStatus;
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.PERMISSION_DENIED,
        'Failed to request location permissions',
        error
      );
    }
  }

  /**
   * Check current permission status
   */
  async checkPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status: this.mapLocationPermission(status),
        accuracy: status === 'granted' ? this.settings.accuracy : undefined
      };
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.PERMISSION_DENIED,
        'Failed to check location permissions',
        error
      );
    }
  }

  /**
   * Request background location permissions (for continuous tracking)
   */
  async requestBackgroundPermissions(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status: this.mapLocationPermission(status),
        accuracy: status === 'granted' ? this.settings.accuracy : undefined
      };
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.PERMISSION_DENIED,
        'Failed to request background location permissions',
        error
      );
    }
  }

  // ============================================================================
  // LOCATION RETRIEVAL
  // ============================================================================

  /**
   * Get current location
   */
  async getCurrentLocation(options?: Partial<LocationTrackingOptions>): Promise<LocationType> {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        throw this.createLocationError(
          LocationErrorCode.PERMISSION_DENIED,
          'Location permissions not granted'
        );
      }

      const locationOptions: Location.LocationOptions = {
        accuracy: this.mapLocationAccuracy(options?.accuracy || this.settings.accuracy),
        timeout: options?.timeout || LOCATION_CONSTANTS.DEFAULT_TIMEOUT,
        maximumAge: options?.maximumAge || 60000 // 1 minute
      };

      const locationResult = await Location.getCurrentPositionAsync(locationOptions);
      
      const location: LocationType = {
        latitude: locationResult.coords.latitude,
        longitude: locationResult.coords.longitude,
        accuracy: locationResult.coords.accuracy || undefined,
        altitude: locationResult.coords.altitude || undefined,
        altitudeAccuracy: locationResult.coords.altitudeAccuracy || undefined,
        heading: locationResult.coords.heading || undefined,
        speed: locationResult.coords.speed || undefined,
        timestamp: locationResult.timestamp
      };

      this.currentLocation = location;

      // Save to history if enabled
      if (this.settings.saveHistory) {
        await this.addToHistory(location, LocationSource.GPS);
      }

      return location;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        throw this.createLocationError(
          LocationErrorCode.TIMEOUT,
          'Location request timed out',
          error
        );
      }
      
      throw this.createLocationError(
        LocationErrorCode.LOCATION_UNAVAILABLE,
        'Failed to get current location',
        error
      );
    }
  }

  /**
   * Get last known location from cache
   */
  async getLastKnownLocation(): Promise<LocationType | null> {
    try {
      if (this.currentLocation) {
        return this.currentLocation;
      }

      const cached = await AsyncStorage.getItem('last_known_location');
      if (cached) {
        const location = JSON.parse(cached) as LocationType;
        if (isValidCoordinates(location)) {
          this.currentLocation = location;
          return location;
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to get last known location from cache:', error);
      return null;
    }
  }

  // ============================================================================
  // LOCATION TRACKING
  // ============================================================================

  /**
   * Start continuous location tracking
   */
  async startTracking(
    options?: Partial<LocationTrackingOptions>,
    onLocationUpdate?: (update: LocationUpdate) => void
  ): Promise<void> {
    try {
      if (this.isTracking) {
        await this.stopTracking();
      }

      const permissions = await this.checkPermissions();
      if (!permissions.granted) {
        throw this.createLocationError(
          LocationErrorCode.PERMISSION_DENIED,
          'Location permissions required for tracking'
        );
      }

      const trackingOptions: Location.LocationOptions = {
        accuracy: this.mapLocationAccuracy(options?.accuracy || this.settings.accuracy),
        timeInterval: options?.timeInterval || 5000, // 5 seconds
        distanceInterval: options?.distanceFilter || this.settings.distanceFilter
      };

      this.watchSubscription = await Location.watchPositionAsync(
        trackingOptions,
        (locationResult) => {
          const location: LocationType = {
            latitude: locationResult.coords.latitude,
            longitude: locationResult.coords.longitude,
            accuracy: locationResult.coords.accuracy || undefined,
            altitude: locationResult.coords.altitude || undefined,
            altitudeAccuracy: locationResult.coords.altitudeAccuracy || undefined,
            heading: locationResult.coords.heading || undefined,
            speed: locationResult.coords.speed || undefined,
            timestamp: locationResult.timestamp
          };

          this.currentLocation = location;

          const update: LocationUpdate = {
            location,
            timestamp: Date.now(),
            accuracy: locationResult.coords.accuracy || 0,
            source: LocationSource.GPS
          };

          // Save to history if enabled
          if (this.settings.saveHistory) {
            this.addToHistory(location, LocationSource.GPS).catch(console.error);
          }

          // Cache location
          this.cacheLocation(location).catch(console.error);

          // Notify callback
          if (onLocationUpdate) {
            onLocationUpdate(update);
          }
        }
      );

      this.isTracking = true;
    } catch (error) {
      throw this.createLocationError(
        LocationErrorCode.SERVICE_UNAVAILABLE,
        'Failed to start location tracking',
        error
      );
    }
  }

  /**
   * Stop location tracking
   */
  async stopTracking(): Promise<void> {
    try {
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
      this.isTracking = false;
    } catch (error) {
      console.warn('Error stopping location tracking:', error);
    }
  }

  /**
   * Check if currently tracking location
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  // ============================================================================
  // LOCATION HISTORY
  // ============================================================================

  /**
   * Get location history
   */
  async getLocationHistory(limit?: number): Promise<LocationHistory[]> {
    try {
      await this.loadLocationHistory();
      const history = [...this.locationHistory];
      
      // Sort by timestamp (newest first)
      history.sort((a, b) => b.timestamp - a.timestamp);
      
      if (limit) {
        return history.slice(0, limit);
      }
      
      return history;
    } catch (error) {
      console.warn('Failed to get location history:', error);
      return [];
    }
  }

  /**
   * Clear location history
   */
  async clearLocationHistory(): Promise<void> {
    try {
      this.locationHistory = [];
      await AsyncStorage.removeItem('location_history');
    } catch (error) {
      console.warn('Failed to clear location history:', error);
    }
  }

  /**
   * Add location to history
   */
  private async addToHistory(location: LocationType, source: LocationSource): Promise<void> {
    try {
      const historyEntry: LocationHistory = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: 'current_user', // Should be replaced with actual user ID
        location,
        timestamp: Date.now(),
        accuracy: location.accuracy || 0,
        source,
        metadata: {}
      };

      this.locationHistory.push(historyEntry);

      // Limit history size
      if (this.locationHistory.length > LOCATION_CONSTANTS.MAX_HISTORY_ENTRIES) {
        this.locationHistory = this.locationHistory.slice(-LOCATION_CONSTANTS.MAX_HISTORY_ENTRIES);
      }

      await this.saveLocationHistory();
    } catch (error) {
      console.warn('Failed to add location to history:', error);
    }
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  /**
   * Get current location settings
   */
  getSettings(): LocationSettings {
    return { ...this.settings };
  }

  /**
   * Update location settings
   */
  async updateSettings(newSettings: Partial<LocationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      
      // Restart tracking if settings changed and currently tracking
      if (this.isTracking) {
        await this.stopTracking();
        await this.startTracking();
      }
    } catch (error) {
      console.warn('Failed to update location settings:', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Validate coordinates
   */
  validateCoordinates(coordinates: Coordinates): boolean {
    return isValidCoordinates(coordinates);
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(
    coordinates: Coordinates,
    precision: number = LOCATION_CONSTANTS.COORDINATE_PRECISION
  ): string {
    return `${coordinates.latitude.toFixed(precision)}, ${coordinates.longitude.toFixed(precision)}`;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private mapLocationPermission(status: Location.PermissionStatus): LocationPermission {
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return LocationPermission.GRANTED;
      case Location.PermissionStatus.DENIED:
        return LocationPermission.DENIED;
      default:
        return LocationPermission.UNDETERMINED;
    }
  }

  private mapLocationAccuracy(accuracy: LocationAccuracy): Location.Accuracy {
    switch (accuracy) {
      case LocationAccuracy.LOWEST:
        return Location.Accuracy.Lowest;
      case LocationAccuracy.LOW:
        return Location.Accuracy.Low;
      case LocationAccuracy.BALANCED:
        return Location.Accuracy.Balanced;
      case LocationAccuracy.HIGH:
        return Location.Accuracy.High;
      case LocationAccuracy.HIGHEST:
        return Location.Accuracy.Highest;
      default:
        return Location.Accuracy.Balanced;
    }
  }

  private async cacheLocation(location: LocationType): Promise<void> {
    try {
      await AsyncStorage.setItem('last_known_location', JSON.stringify(location));
    } catch (error) {
      console.warn('Failed to cache location:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem('location_settings');
      if (cached) {
        const settings = JSON.parse(cached) as LocationSettings;
        this.settings = { ...this.settings, ...settings };
      }
    } catch (error) {
      console.warn('Failed to load location settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('location_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save location settings:', error);
    }
  }

  private async loadLocationHistory(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem('location_history');
      if (cached) {
        this.locationHistory = JSON.parse(cached) as LocationHistory[];
      }
    } catch (error) {
      console.warn('Failed to load location history:', error);
      this.locationHistory = [];
    }
  }

  private async saveLocationHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem('location_history', JSON.stringify(this.locationHistory));
    } catch (error) {
      console.warn('Failed to save location history:', error);
    }
  }

  private createLocationError(
    code: LocationErrorCode,
    message: string,
    details?: any
  ): LocationError {
    return {
      code,
      message,
      details,
      timestamp: Date.now()
    };
  }
}
