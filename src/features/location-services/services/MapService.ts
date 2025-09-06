// ============================================================================
// MAP SERVICE - Map Operations and Interactions
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  LocationErrorCode,
  MapServiceOptions,
  LOCATION_CONSTANTS,
  isValidCoordinates
} from '../types';
import { GeoproximityService } from './GeoproximityService';

export class MapService {
  private static instance: MapService;
  private options: MapServiceOptions;
  private geoproximityService: GeoproximityService;
  private markers = new Map<string, MapMarker>();
  private clusteredMarkers = new Map<string, MapMarker[]>();
  private currentRegion: MapRegion | null = null;
  private interactionCallbacks = new Map<string, (event: MapInteractionEvent) => void>();

  private constructor(options?: MapServiceOptions) {
    this.options = {
      defaultZoom: LOCATION_CONSTANTS.DEFAULT_ZOOM_LEVEL,
      minZoom: 1,
      maxZoom: 20,
      enableClustering: true,
      clusterRadius: 50,
      enableUserLocation: true,
      enableCompass: true,
      enableZoomControls: true,
      ...options
    };
    this.geoproximityService = GeoproximityService.getInstance();
  }

  public static getInstance(options?: MapServiceOptions): MapService {
    if (!MapService.instance) {
      MapService.instance = new MapService(options);
    }
    return MapService.instance;
  }

  // ============================================================================
  // MAP REGION MANAGEMENT
  // ============================================================================

  /**
   * Create map region from center point and zoom level
   */
  createRegion(center: Coordinates, zoom: number = this.options.defaultZoom!): MapRegion {
    if (!isValidCoordinates(center)) {
      throw this.createLocationError(
        LocationErrorCode.INVALID_COORDINATES,
        'Invalid coordinates provided for map region'
      );
    }

    // Calculate deltas based on zoom level
    const latitudeDelta = this.calculateLatitudeDelta(zoom);
    const longitudeDelta = this.calculateLongitudeDelta(zoom, center.latitude);

    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta,
      longitudeDelta
    };
  }

  /**
   * Create region that fits all provided coordinates
   */
  createRegionFromCoordinates(coordinates: Coordinates[], padding: number = 0.1): MapRegion {
    if (coordinates.length === 0) {
      throw this.createLocationError(
        LocationErrorCode.INVALID_COORDINATES,
        'No coordinates provided for region calculation'
      );
    }

    if (coordinates.length === 1) {
      return this.createRegion(coordinates[0]);
    }

    // Find bounds
    const bounds = this.calculateBoundsFromCoordinates(coordinates);
    
    // Add padding
    const latPadding = (bounds.northeast.latitude - bounds.southwest.latitude) * padding;
    const lonPadding = (bounds.northeast.longitude - bounds.southwest.longitude) * padding;

    const paddedBounds: LocationBounds = {
      northeast: {
        latitude: bounds.northeast.latitude + latPadding,
        longitude: bounds.northeast.longitude + lonPadding
      },
      southwest: {
        latitude: bounds.southwest.latitude - latPadding,
        longitude: bounds.southwest.longitude - lonPadding
      }
    };

    return this.createRegionFromBounds(paddedBounds);
  }

  /**
   * Create region from bounds
   */
  createRegionFromBounds(bounds: LocationBounds): MapRegion {
    const center = this.geoproximityService.getBoundsCenter(bounds);
    const latitudeDelta = bounds.northeast.latitude - bounds.southwest.latitude;
    const longitudeDelta = bounds.northeast.longitude - bounds.southwest.longitude;

    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta,
      longitudeDelta
    };
  }

  /**
   * Get current map region
   */
  getCurrentRegion(): MapRegion | null {
    return this.currentRegion;
  }

  /**
   * Set current map region
   */
  setCurrentRegion(region: MapRegion): void {
    this.currentRegion = region;
  }

  // ============================================================================
  // MARKER MANAGEMENT
  // ============================================================================

  /**
   * Add marker to map
   */
  addMarker(marker: MapMarker): void {
    if (!isValidCoordinates(marker.position)) {
      throw this.createLocationError(
        LocationErrorCode.INVALID_COORDINATES,
        'Invalid coordinates provided for marker'
      );
    }

    this.markers.set(marker.id, marker);
    
    if (this.options.enableClustering) {
      this.updateClusters();
    }
  }

  /**
   * Remove marker from map
   */
  removeMarker(markerId: string): boolean {
    const removed = this.markers.delete(markerId);
    
    if (removed && this.options.enableClustering) {
      this.updateClusters();
    }
    
    return removed;
  }

  /**
   * Update existing marker
   */
  updateMarker(markerId: string, updates: Partial<MapMarker>): boolean {
    const marker = this.markers.get(markerId);
    if (!marker) return false;

    if (updates.position && !isValidCoordinates(updates.position)) {
      throw this.createLocationError(
        LocationErrorCode.INVALID_COORDINATES,
        'Invalid coordinates provided for marker update'
      );
    }

    const updatedMarker = { ...marker, ...updates };
    this.markers.set(markerId, updatedMarker);
    
    if (this.options.enableClustering) {
      this.updateClusters();
    }
    
    return true;
  }

  /**
   * Get marker by ID
   */
  getMarker(markerId: string): MapMarker | undefined {
    return this.markers.get(markerId);
  }

  /**
   * Get all markers
   */
  getAllMarkers(): MapMarker[] {
    return Array.from(this.markers.values());
  }

  /**
   * Get markers within bounds
   */
  getMarkersInBounds(bounds: LocationBounds): MapMarker[] {
    return this.getAllMarkers().filter(marker =>
      this.geoproximityService.isWithinBounds(marker.position, bounds)
    );
  }

  /**
   * Get markers within radius of center point
   */
  getMarkersInRadius(center: Coordinates, radius: number): MapMarker[] {
    return this.getAllMarkers().filter(marker =>
      this.geoproximityService.isWithinRadius(center, marker.position, radius)
    );
  }

  /**
   * Clear all markers
   */
  clearMarkers(): void {
    this.markers.clear();
    this.clusteredMarkers.clear();
  }

  // ============================================================================
  // CLUSTERING
  // ============================================================================

  /**
   * Get clustered markers for current zoom level
   */
  getClusteredMarkers(zoomLevel: number): Map<string, MapMarker[]> {
    if (!this.options.enableClustering) {
      // Return individual markers as single-item clusters
      const individualClusters = new Map<string, MapMarker[]>();
      this.markers.forEach((marker, id) => {
        individualClusters.set(id, [marker]);
      });
      return individualClusters;
    }

    return this.clusteredMarkers;
  }

  /**
   * Update marker clusters based on current markers and zoom level
   */
  private updateClusters(): void {
    if (!this.options.enableClustering) return;

    this.clusteredMarkers.clear();
    const markers = this.getAllMarkers();
    const processed = new Set<string>();
    const clusterRadius = this.options.clusterRadius! / 1000; // Convert to km

    markers.forEach(marker => {
      if (processed.has(marker.id)) return;

      const cluster: MapMarker[] = [marker];
      processed.add(marker.id);

      // Find nearby markers to cluster
      markers.forEach(otherMarker => {
        if (processed.has(otherMarker.id) || marker.id === otherMarker.id) return;

        const distance = this.geoproximityService.calculateDistance(
          marker.position,
          otherMarker.position
        );

        if (distance.distance <= clusterRadius) {
          cluster.push(otherMarker);
          processed.add(otherMarker.id);
        }
      });

      // Create cluster ID
      const clusterId = cluster.length === 1 ? 
        marker.id : 
        `cluster_${marker.id}_${cluster.length}`;

      this.clusteredMarkers.set(clusterId, cluster);
    });
  }

  // ============================================================================
  // MAP INTERACTIONS
  // ============================================================================

  /**
   * Register callback for map interactions
   */
  onMapInteraction(callbackId: string, callback: (event: MapInteractionEvent) => void): void {
    this.interactionCallbacks.set(callbackId, callback);
  }

  /**
   * Unregister map interaction callback
   */
  offMapInteraction(callbackId: string): void {
    this.interactionCallbacks.delete(callbackId);
  }

  /**
   * Handle map interaction event
   */
  handleMapInteraction(event: MapInteractionEvent): void {
    // Update current region if it's a region change
    if (event.type === MapInteractionType.REGION_CHANGE && event.region) {
      this.currentRegion = event.region;
    }

    // Notify all registered callbacks
    this.interactionCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.warn('Error in map interaction callback:', error);
      }
    });
  }

  // ============================================================================
  // VIEWPORT CALCULATIONS
  // ============================================================================

  /**
   * Calculate viewport from region
   */
  calculateViewport(region: MapRegion): MapViewport {
    const bounds: LocationBounds = {
      northeast: {
        latitude: region.latitude + region.latitudeDelta / 2,
        longitude: region.longitude + region.longitudeDelta / 2
      },
      southwest: {
        latitude: region.latitude - region.latitudeDelta / 2,
        longitude: region.longitude - region.longitudeDelta / 2
      }
    };

    const zoom = this.calculateZoomFromRegion(region);

    return {
      bounds,
      center: {
        latitude: region.latitude,
        longitude: region.longitude
      },
      zoom
    };
  }

  /**
   * Calculate zoom level from region deltas
   */
  calculateZoomFromRegion(region: MapRegion): number {
    // Approximate zoom calculation based on latitude delta
    const zoom = Math.log2(360 / region.latitudeDelta);
    return Math.max(this.options.minZoom!, Math.min(this.options.maxZoom!, zoom));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert location data to map marker
   */
  locationToMarker(
    location: LocationData,
    options?: Partial<Omit<MapMarker, 'id' | 'position'>>
  ): MapMarker {
    return {
      id: options?.title ? 
        `marker_${options.title.replace(/\s+/g, '_').toLowerCase()}` : 
        `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      title: location.locationName || location.address,
      description: location.address,
      ...options
    };
  }

  /**
   * Get map service options
   */
  getOptions(): MapServiceOptions {
    return { ...this.options };
  }

  /**
   * Update map service options
   */
  updateOptions(newOptions: Partial<MapServiceOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Update clustering if the option changed
    if ('enableClustering' in newOptions) {
      if (newOptions.enableClustering) {
        this.updateClusters();
      } else {
        this.clusteredMarkers.clear();
      }
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private calculateLatitudeDelta(zoom: number): number {
    // Approximate calculation for latitude delta based on zoom
    return 360 / Math.pow(2, zoom);
  }

  private calculateLongitudeDelta(zoom: number, latitude: number): number {
    // Longitude delta varies with latitude due to Earth's curvature
    const latitudeDelta = this.calculateLatitudeDelta(zoom);
    return latitudeDelta * Math.cos(latitude * Math.PI / 180);
  }

  private calculateBoundsFromCoordinates(coordinates: Coordinates[]): LocationBounds {
    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLon = coordinates[0].longitude;
    let maxLon = coordinates[0].longitude;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLon = Math.min(minLon, coord.longitude);
      maxLon = Math.max(maxLon, coord.longitude);
    });

    return {
      southwest: { latitude: minLat, longitude: minLon },
      northeast: { latitude: maxLat, longitude: maxLon }
    };
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
