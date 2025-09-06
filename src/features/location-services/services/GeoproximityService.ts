// ============================================================================
// GEOPROXIMITY SERVICE - Distance Calculations and Proximity Operations
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Coordinates,
  DistanceResult,
  DistanceUnit,
  ProximityFilter,
  ProximitySearchOptions,
  LocationBounds,
  LocationError,
  LocationErrorCode,
  ProximitySortBy,
  GeoproximityServiceOptions,
  LOCATION_CONSTANTS,
  isValidCoordinates
} from '../types';

export class GeoproximityService {
  private static instance: GeoproximityService;
  private options: GeoproximityServiceOptions;
  private distanceCache = new Map<string, DistanceResult>();
  private cacheExpiry = new Map<string, number>();

  private constructor(options?: GeoproximityServiceOptions) {
    this.options = {
      defaultUnit: DistanceUnit.KILOMETERS,
      earthRadius: LOCATION_CONSTANTS.EARTH_RADIUS_KM,
      precision: LOCATION_CONSTANTS.DISTANCE_PRECISION,
      enableBearing: true,
      enableDuration: false,
      ...options
    };
  }

  public static getInstance(options?: GeoproximityServiceOptions): GeoproximityService {
    if (!GeoproximityService.instance) {
      GeoproximityService.instance = new GeoproximityService(options);
    }
    return GeoproximityService.instance;
  }

  // ============================================================================
  // DISTANCE CALCULATIONS
  // ============================================================================

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  calculateDistance(
    from: Coordinates,
    to: Coordinates,
    unit: DistanceUnit = this.options.defaultUnit!
  ): DistanceResult {
    if (!isValidCoordinates(from) || !isValidCoordinates(to)) {
      throw this.createLocationError(
        LocationErrorCode.INVALID_COORDINATES,
        'Invalid coordinates provided for distance calculation'
      );
    }

    // Check cache first
    const cacheKey = this.getCacheKey(from, to, unit);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const earthRadius = this.getEarthRadius(unit);
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
        Math.cos(this.toRadians(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    const result: DistanceResult = {
      distance: Number(distance.toFixed(this.options.precision!)),
      unit,
      bearing: this.options.enableBearing ? this.calculateBearing(from, to) : undefined,
      duration: this.options.enableDuration ? this.estimateDuration(distance, unit) : undefined
    };

    // Cache the result
    this.setCache(cacheKey, result);

    return result;
  }

  /**
   * Calculate bearing (direction) between two coordinates
   */
  calculateBearing(from: Coordinates, to: Coordinates): number {
    if (!isValidCoordinates(from) || !isValidCoordinates(to)) {
      throw this.createLocationError(
        LocationErrorCode.INVALID_COORDINATES,
        'Invalid coordinates provided for bearing calculation'
      );
    }

    const dLon = this.toRadians(to.longitude - from.longitude);
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360; // Normalize to 0-360 degrees
  }

  /**
   * Calculate multiple distances from one point to multiple destinations
   */
  calculateDistances(
    from: Coordinates,
    destinations: Coordinates[],
    unit: DistanceUnit = this.options.defaultUnit!
  ): DistanceResult[] {
    return destinations.map(destination => 
      this.calculateDistance(from, destination, unit)
    );
  }

  // ============================================================================
  // PROXIMITY OPERATIONS
  // ============================================================================

  /**
   * Check if a point is within a specified radius of a center point
   */
  isWithinRadius(
    center: Coordinates,
    point: Coordinates,
    radius: number,
    unit: DistanceUnit = this.options.defaultUnit!
  ): boolean {
    const distance = this.calculateDistance(center, point, unit);
    return distance.distance <= radius;
  }

  /**
   * Filter points that are within a specified proximity
   */
  filterByProximity<T extends { latitude: number; longitude: number }>(
    items: T[],
    filter: ProximityFilter
  ): T[] {
    return items.filter(item => 
      this.isWithinRadius(filter.center, item, filter.radius, filter.unit)
    );
  }

  /**
   * Sort items by distance from a center point
   */
  sortByDistance<T extends { latitude: number; longitude: number }>(
    items: T[],
    center: Coordinates,
    unit: DistanceUnit = this.options.defaultUnit!
  ): (T & { distance: number })[] {
    return items
      .map(item => ({
        ...item,
        distance: this.calculateDistance(center, item, unit).distance
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Find nearest items to a center point
   */
  findNearest<T extends { latitude: number; longitude: number }>(
    items: T[],
    center: Coordinates,
    limit: number = 10,
    unit: DistanceUnit = this.options.defaultUnit!
  ): (T & { distance: number })[] {
    const sorted = this.sortByDistance(items, center, unit);
    return sorted.slice(0, limit);
  }

  /**
   * Perform proximity search with advanced options
   */
  proximitySearch<T extends { latitude: number; longitude: number }>(
    items: T[],
    options: ProximitySearchOptions
  ): (T & { distance?: number })[] {
    let results = [...items];

    // Filter by radius
    results = this.filterByProximity(results, {
      center: options.center,
      radius: options.radius,
      unit: options.unit
    });

    // Add distance if requested
    if (options.includeDistance) {
      results = results.map(item => ({
        ...item,
        distance: this.calculateDistance(options.center, item, options.unit).distance
      }));
    }

    // Sort results
    if (options.sortBy === ProximitySortBy.DISTANCE) {
      results = results.sort((a, b) => {
        const distanceA = 'distance' in a ? a.distance! : 
          this.calculateDistance(options.center, a, options.unit).distance;
        const distanceB = 'distance' in b ? b.distance! : 
          this.calculateDistance(options.center, b, options.unit).distance;
        return distanceA - distanceB;
      });
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || LOCATION_CONSTANTS.MAX_SEARCH_RESULTS;
    
    return results.slice(offset, offset + limit);
  }

  // ============================================================================
  // BOUNDS AND REGIONS
  // ============================================================================

  /**
   * Calculate bounding box for a center point and radius
   */
  calculateBounds(
    center: Coordinates,
    radius: number,
    unit: DistanceUnit = this.options.defaultUnit!
  ): LocationBounds {
    const earthRadius = this.getEarthRadius(unit);
    const lat = this.toRadians(center.latitude);
    const lon = this.toRadians(center.longitude);
    const angularDistance = radius / earthRadius;

    const minLat = lat - angularDistance;
    const maxLat = lat + angularDistance;

    let minLon: number;
    let maxLon: number;

    if (minLat > this.toRadians(-90) && maxLat < this.toRadians(90)) {
      const deltaLon = Math.asin(Math.sin(angularDistance) / Math.cos(lat));
      minLon = lon - deltaLon;
      maxLon = lon + deltaLon;

      if (minLon < this.toRadians(-180)) {
        minLon += 2 * Math.PI;
      }
      if (maxLon > this.toRadians(180)) {
        maxLon -= 2 * Math.PI;
      }
    } else {
      // Polar region case
      minLat = Math.max(minLat, this.toRadians(-90));
      maxLat = Math.min(maxLat, this.toRadians(90));
      minLon = this.toRadians(-180);
      maxLon = this.toRadians(180);
    }

    return {
      southwest: {
        latitude: this.toDegrees(minLat),
        longitude: this.toDegrees(minLon)
      },
      northeast: {
        latitude: this.toDegrees(maxLat),
        longitude: this.toDegrees(maxLon)
      }
    };
  }

  /**
   * Check if a point is within bounds
   */
  isWithinBounds(point: Coordinates, bounds: LocationBounds): boolean {
    return (
      point.latitude >= bounds.southwest.latitude &&
      point.latitude <= bounds.northeast.latitude &&
      point.longitude >= bounds.southwest.longitude &&
      point.longitude <= bounds.northeast.longitude
    );
  }

  /**
   * Calculate the center point of bounds
   */
  getBoundsCenter(bounds: LocationBounds): Coordinates {
    return {
      latitude: (bounds.southwest.latitude + bounds.northeast.latitude) / 2,
      longitude: (bounds.southwest.longitude + bounds.northeast.longitude) / 2
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Convert distance between units
   */
  convertDistance(distance: number, fromUnit: DistanceUnit, toUnit: DistanceUnit): number {
    if (fromUnit === toUnit) return distance;

    // Convert to meters first
    let meters: number;
    switch (fromUnit) {
      case DistanceUnit.KILOMETERS:
        meters = distance * 1000;
        break;
      case DistanceUnit.MILES:
        meters = distance * 1609.344;
        break;
      case DistanceUnit.FEET:
        meters = distance * 0.3048;
        break;
      case DistanceUnit.METERS:
      default:
        meters = distance;
        break;
    }

    // Convert from meters to target unit
    switch (toUnit) {
      case DistanceUnit.KILOMETERS:
        return meters / 1000;
      case DistanceUnit.MILES:
        return meters / 1609.344;
      case DistanceUnit.FEET:
        return meters / 0.3048;
      case DistanceUnit.METERS:
      default:
        return meters;
    }
  }

  /**
   * Format distance for display
   */
  formatDistance(distance: number, unit: DistanceUnit, precision?: number): string {
    const displayPrecision = precision ?? this.options.precision!;
    const formattedDistance = distance.toFixed(displayPrecision);
    
    const unitLabels = {
      [DistanceUnit.KILOMETERS]: 'km',
      [DistanceUnit.MILES]: 'mi',
      [DistanceUnit.METERS]: 'm',
      [DistanceUnit.FEET]: 'ft'
    };

    return `${formattedDistance} ${unitLabels[unit]}`;
  }

  /**
   * Clear distance cache
   */
  clearCache(): void {
    this.distanceCache.clear();
    this.cacheExpiry.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  private getEarthRadius(unit: DistanceUnit): number {
    switch (unit) {
      case DistanceUnit.MILES:
        return LOCATION_CONSTANTS.EARTH_RADIUS_MILES;
      case DistanceUnit.METERS:
        return LOCATION_CONSTANTS.EARTH_RADIUS_METERS;
      case DistanceUnit.FEET:
        return LOCATION_CONSTANTS.EARTH_RADIUS_METERS * 3.28084; // Convert to feet
      case DistanceUnit.KILOMETERS:
      default:
        return LOCATION_CONSTANTS.EARTH_RADIUS_KM;
    }
  }

  private estimateDuration(distance: number, unit: DistanceUnit): number {
    // Simple estimation: assume average walking speed of 5 km/h
    const distanceInKm = this.convertDistance(distance, unit, DistanceUnit.KILOMETERS);
    const walkingSpeedKmh = 5;
    return Math.round((distanceInKm / walkingSpeedKmh) * 60); // Return minutes
  }

  private getCacheKey(from: Coordinates, to: Coordinates, unit: DistanceUnit): string {
    const fromKey = `${from.latitude.toFixed(6)},${from.longitude.toFixed(6)}`;
    const toKey = `${to.latitude.toFixed(6)},${to.longitude.toFixed(6)}`;
    return `${fromKey}-${toKey}-${unit}`;
  }

  private getFromCache(key: string): DistanceResult | null {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.distanceCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.distanceCache.get(key) || null;
  }

  private setCache(key: string, result: DistanceResult): void {
    this.distanceCache.set(key, result);
    this.cacheExpiry.set(key, Date.now() + LOCATION_CONSTANTS.DEFAULT_CACHE_DURATION);
    
    // Clean up old cache entries if cache gets too large
    if (this.distanceCache.size > 1000) {
      const oldestKeys = Array.from(this.cacheExpiry.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, 100)
        .map(([key]) => key);
      
      oldestKeys.forEach(key => {
        this.distanceCache.delete(key);
        this.cacheExpiry.delete(key);
      });
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
