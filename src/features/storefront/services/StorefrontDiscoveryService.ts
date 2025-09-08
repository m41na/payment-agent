// ============================================================================
// STOREFRONT DISCOVERY SERVICE - Location-Based Storefront Search
// ============================================================================

import { supabase } from '../../../services/supabase';
import { 
  StorefrontDiscovery,
  StorefrontSearchFilter,
  BusinessLocation,
  StorefrontError,
  StorefrontErrorCode,
  STOREFRONT_CONSTANTS
} from '../types';

export class StorefrontDiscoveryService {
  private static instance: StorefrontDiscoveryService;
  private cache = new Map<string, { data: StorefrontDiscovery[]; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  public static getInstance(): StorefrontDiscoveryService {
    if (!StorefrontDiscoveryService.instance) {
      StorefrontDiscoveryService.instance = new StorefrontDiscoveryService();
    }
    return StorefrontDiscoveryService.instance;
  }

  // ============================================================================
  // STOREFRONT DISCOVERY OPERATIONS
  // ============================================================================

  async searchStorefronts(filter: StorefrontSearchFilter): Promise<StorefrontDiscovery[]> {
    try {
      // Generate cache key based on filter
      const cacheKey = this.generateCacheKey(filter);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }

      let query = supabase
        .from('pg_preferences')
        .select(`
          user_id,
          storefront_name,
          storefront_description,
          storefront_latitude,
          storefront_longitude,
          primary_color,
          business_hours,
          delivery_radius_miles,
          auto_accept_orders,
          created_at
        `)
        .not('storefront_name', 'is', null)
        .not('storefront_latitude', 'is', null)
        .not('storefront_longitude', 'is', null);

      // Apply filters
      if (filter.is_open !== undefined) {
        // This would require business hours calculation
        // For now, we'll include all storefronts
      }

      if (filter.delivery_available !== undefined && filter.delivery_available) {
        query = query.gt('delivery_radius_miles', 0);
      }

      const { data, error } = await query.limit(STOREFRONT_CONSTANTS.SEARCH_LIMITS.MAX_RESULTS);

      if (error) {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      let storefronts = (data || []).map(item => this.transformStorefrontFromDatabase(item));

      // Apply location-based filtering and sorting
      if (filter.location) {
        storefronts = this.filterByLocation(storefronts, filter);
      }

      // Apply additional filters
      storefronts = this.applyFilters(storefronts, filter);

      // Sort results
      storefronts = this.sortStorefronts(storefronts, filter.sort_by || 'distance');

      // Cache the results
      this.cache.set(cacheKey, { data: storefronts, timestamp: Date.now() });

      return storefronts;
    } catch (error: any) {
      console.error('Error searching storefronts:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  async getNearbyStorefronts(
    location: BusinessLocation, 
    radius: number = STOREFRONT_CONSTANTS.SEARCH_LIMITS.DEFAULT_RADIUS_MILES
  ): Promise<StorefrontDiscovery[]> {
    return this.searchStorefronts({
      location,
      radius_miles: Math.min(radius, STOREFRONT_CONSTANTS.SEARCH_LIMITS.MAX_RADIUS_MILES),
      sort_by: 'distance'
    });
  }

  async getStorefrontById(storefrontId: string): Promise<StorefrontDiscovery | null> {
    try {
      const { data, error } = await supabase
        .from('pg_preferences')
        .select(`
          user_id,
          storefront_name,
          storefront_description,
          storefront_latitude,
          storefront_longitude,
          primary_color,
          business_hours,
          delivery_radius_miles,
          auto_accept_orders,
          created_at
        `)
        .eq('user_id', storefrontId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      return data ? this.transformStorefrontFromDatabase(data) : null;
    } catch (error: any) {
      console.error('Error fetching storefront:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  async getFeaturedStorefronts(limit: number = 10): Promise<StorefrontDiscovery[]> {
    try {
      const { data, error } = await supabase
        .from('pg_preferences')
        .select(`
          user_id,
          storefront_name,
          storefront_description,
          storefront_latitude,
          storefront_longitude,
          primary_color,
          business_hours,
          delivery_radius_miles,
          auto_accept_orders,
          created_at
        `)
        .not('storefront_name', 'is', null)
        .not('storefront_latitude', 'is', null)
        .not('storefront_longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      return (data || []).map(item => this.transformStorefrontFromDatabase(item));
    } catch (error: any) {
      console.error('Error fetching featured storefronts:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  // ============================================================================
  // FILTERING AND SORTING METHODS
  // ============================================================================

  private filterByLocation(storefronts: StorefrontDiscovery[], filter: StorefrontSearchFilter): StorefrontDiscovery[] {
    if (!filter.location) return storefronts;

    const radius = filter.radius_miles || STOREFRONT_CONSTANTS.SEARCH_LIMITS.DEFAULT_RADIUS_MILES;

    return storefronts
      .map(storefront => ({
        ...storefront,
        distance: this.calculateDistance(filter.location!, storefront.location)
      }))
      .filter(storefront => storefront.distance! <= radius);
  }

  private applyFilters(storefronts: StorefrontDiscovery[], filter: StorefrontSearchFilter): StorefrontDiscovery[] {
    let filtered = storefronts;

    if (filter.categories && filter.categories.length > 0) {
      filtered = filtered.filter(storefront => 
        filter.categories!.some(category => 
          storefront.categories.includes(category)
        )
      );
    }

    if (filter.delivery_available !== undefined) {
      filtered = filtered.filter(storefront => 
        storefront.delivery_available === filter.delivery_available
      );
    }

    if (filter.pickup_available !== undefined) {
      filtered = filtered.filter(storefront => 
        storefront.pickup_available === filter.pickup_available
      );
    }

    if (filter.min_rating !== undefined) {
      filtered = filtered.filter(storefront => 
        (storefront.rating || 0) >= filter.min_rating!
      );
    }

    if (filter.is_open !== undefined) {
      filtered = filtered.filter(storefront => 
        storefront.is_open === filter.is_open
      );
    }

    return filtered;
  }

  private sortStorefronts(storefronts: StorefrontDiscovery[], sortBy: string): StorefrontDiscovery[] {
    switch (sortBy) {
      case 'distance':
        return storefronts.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      case 'rating':
        return storefronts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'name':
        return storefronts.sort((a, b) => a.storefront_name.localeCompare(b.storefront_name));
      case 'newest':
        return storefronts.sort((a, b) => 
          new Date(b.id).getTime() - new Date(a.id).getTime()
        );
      default:
        return storefronts;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculateDistance(from: BusinessLocation, to: BusinessLocation): number {
    // Haversine formula for calculating distance between two points
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) * Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isStorefrontOpen(businessHours: any): boolean {
    // Simplified business hours check
    // In a real implementation, this would check current time against business hours
    const now = new Date();
    const dayOfWeek = now.toLocaleLowerCase().substring(0, 3); // 'mon', 'tue', etc.
    
    if (!businessHours || !businessHours[dayOfWeek]) {
      return false;
    }

    const todayHours = businessHours[dayOfWeek];
    return !todayHours.closed;
  }

  private transformStorefrontFromDatabase(data: any): StorefrontDiscovery {
    return {
      id: data.user_id,
      user_id: data.user_id,
      storefront_name: data.storefront_name,
      description: data.storefront_description || '',
      location: {
        latitude: data.storefront_latitude,
        longitude: data.storefront_longitude
      },
      rating: undefined, // Would come from reviews system
      review_count: undefined, // Would come from reviews system
      categories: [], // Would come from business categorization
      is_open: this.isStorefrontOpen(data.business_hours),
      delivery_available: (data.delivery_radius_miles || 0) > 0,
      pickup_available: true, // Default assumption
      featured_image: undefined, // Would come from storefront images
      primary_color: data.primary_color
    };
  }

  private generateCacheKey(filter: StorefrontSearchFilter): string {
    const parts = [
      filter.location ? `${filter.location.latitude},${filter.location.longitude}` : 'no-location',
      filter.radius_miles || 'no-radius',
      filter.categories?.join(',') || 'no-categories',
      filter.is_open?.toString() || 'any-open',
      filter.delivery_available?.toString() || 'any-delivery',
      filter.pickup_available?.toString() || 'any-pickup',
      filter.min_rating?.toString() || 'no-min-rating',
      filter.sort_by || 'no-sort'
    ];
    
    return `search_${parts.join('_')}`;
  }

  private createError(code: StorefrontErrorCode, message: string, field?: string): StorefrontError {
    return {
      code,
      message: `STOREFRONT_ERROR: ${message}`,
      field,
    };
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }
}
