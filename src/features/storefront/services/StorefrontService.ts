// ============================================================================
// STOREFRONT SERVICE - Business Profile Management
// ============================================================================

import { supabase } from '../../../shared/data/supabase';
import { 
  BusinessProfile, 
  BusinessLocation, 
  BusinessHours,
  StorefrontError, 
  StorefrontErrorCode,
  StorefrontServiceOptions,
  STOREFRONT_CONSTANTS 
} from '../types';

export class StorefrontService {
  private static instance: StorefrontService;
  private readonly tableName = 'pg_preferences';
  private cache = new Map<string, { data: BusinessProfile; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): StorefrontService {
    if (!StorefrontService.instance) {
      StorefrontService.instance = new StorefrontService();
    }
    return StorefrontService.instance;
  }

  // ============================================================================
  // BUSINESS PROFILE OPERATIONS
  // ============================================================================

  async fetchProfile(userId: string, options?: StorefrontServiceOptions): Promise<BusinessProfile | null> {
    try {
      // Check cache first
      const cacheKey = `profile_${userId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < (options?.cacheTTL || this.CACHE_TTL)) {
        return cached.data;
      }

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // No rows returned
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      const profile = data ? this.transformFromDatabase(data) : null;
      
      // Cache the result
      if (profile) {
        this.cache.set(cacheKey, { data: profile, timestamp: Date.now() });
      }

      return profile;
    } catch (error: any) {
      console.error('Error fetching business profile:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  async createProfile(userId: string, profileData: Partial<BusinessProfile>): Promise<BusinessProfile> {
    try {
      // Validate required fields
      this.validateProfileCreation(profileData);

      const newProfile = {
        ...this.getDefaultProfile(),
        ...profileData,
        user_id: userId,
      };

      const dbData = this.transformToDatabase(newProfile);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([dbData])
        .select()
        .single();

      if (error) {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      const profile = this.transformFromDatabase(data);
      
      // Update cache
      this.cache.set(`profile_${userId}`, { data: profile, timestamp: Date.now() });

      return profile;
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  async updateProfile(userId: string, updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    try {
      // Validate updates
      this.validateProfileUpdates(updates);

      const dbUpdates = this.transformToDatabase(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbUpdates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
      }

      const profile = this.transformFromDatabase(data);
      
      // Update cache
      this.cache.set(`profile_${userId}`, { data: profile, timestamp: Date.now() });

      return profile;
    } catch (error: any) {
      console.error('Error updating business profile:', error);
      if (error instanceof Error && error.message.includes('STOREFRONT_ERROR')) {
        throw error;
      }
      throw this.createError(StorefrontErrorCode.NETWORK_ERROR, error.message);
    }
  }

  // ============================================================================
  // SPECIALIZED UPDATE OPERATIONS
  // ============================================================================

  async updateStorefrontBranding(userId: string, branding: {
    storefront_name?: string;
    storefront_description?: string;
    storefront_logo_svg?: string;
    primary_color?: string;
    accent_color?: string;
  }): Promise<BusinessProfile> {
    return this.updateProfile(userId, branding);
  }

  async updateBusinessLocation(userId: string, location: BusinessLocation): Promise<BusinessProfile> {
    if (!this.isValidBusinessLocation(location)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR, 
        'Invalid business location coordinates',
        'storefront_location'
      );
    }

    return this.updateProfile(userId, {
      storefront_location: location,
    });
  }

  async updateBusinessHours(userId: string, hours: BusinessHours): Promise<BusinessProfile> {
    if (!this.isValidBusinessHours(hours)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid business hours format',
        'business_hours'
      );
    }

    return this.updateProfile(userId, { business_hours: hours });
  }

  async updateOperationalSettings(userId: string, settings: {
    tax_rate?: number;
    currency?: string;
    timezone?: string;
    auto_accept_orders?: boolean;
    delivery_radius_miles?: number;
    minimum_order_amount?: number;
  }): Promise<BusinessProfile> {
    return this.updateProfile(userId, settings);
  }

  async updateContactInfo(userId: string, contact: {
    business_contact_name?: string;
    business_phone?: string;
    business_email?: string;
    business_website?: string;
  }): Promise<BusinessProfile> {
    return this.updateProfile(userId, contact);
  }

  async updateBusinessAddress(userId: string, address: {
    business_street?: string;
    business_city?: string;
    business_state?: string;
    business_zip?: string;
    business_country?: string;
  }): Promise<BusinessProfile> {
    return this.updateProfile(userId, address);
  }

  // ============================================================================
  // PROFILE ANALYSIS AND UTILITIES
  // ============================================================================

  async getProfileCompletionPercentage(userId: string): Promise<number> {
    const profile = await this.fetchProfile(userId);
    if (!profile) return 0;

    const requiredFields = [
      'storefront_name',
      'storefront_description',
      'primary_color',
      'accent_color',
      'business_hours',
      'business_country',
      'tax_rate',
      'currency',
      'timezone'
    ];

    const optionalFields = [
      'storefront_logo_svg',
      'storefront_location',
      'business_street',
      'business_city',
      'business_state',
      'business_zip',
      'business_contact_name',
      'business_phone',
      'business_email',
      'business_website'
    ];

    let completedRequired = 0;
    let completedOptional = 0;

    // Check required fields
    requiredFields.forEach(field => {
      const value = (profile as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        if (field === 'business_hours' && Object.keys(value).length > 0) {
          completedRequired++;
        } else if (field !== 'business_hours') {
          completedRequired++;
        }
      }
    });

    // Check optional fields
    optionalFields.forEach(field => {
      const value = (profile as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        completedOptional++;
      }
    });

    // Required fields are 70% of completion, optional are 30%
    const requiredPercentage = (completedRequired / requiredFields.length) * 0.7;
    const optionalPercentage = (completedOptional / optionalFields.length) * 0.3;

    return Math.round((requiredPercentage + optionalPercentage) * 100);
  }

  async isStorefrontActive(userId: string): Promise<boolean> {
    const profile = await this.fetchProfile(userId);
    if (!profile) return false;

    // Check minimum requirements for active storefront
    return !!(
      profile.storefront_name &&
      profile.storefront_description &&
      profile.business_country &&
      profile.currency &&
      profile.timezone &&
      Object.keys(profile.business_hours).length > 0
    );
  }

  async clearCache(userId?: string): Promise<void> {
    if (userId) {
      this.cache.delete(`profile_${userId}`);
    } else {
      this.cache.clear();
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  private validateProfileCreation(profileData: Partial<BusinessProfile>): void {
    if (!profileData.storefront_name?.trim()) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Storefront name is required',
        'storefront_name'
      );
    }

    if (!profileData.business_country?.trim()) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Business country is required',
        'business_country'
      );
    }

    this.validateProfileUpdates(profileData);
  }

  private validateProfileUpdates(updates: Partial<BusinessProfile>): void {
    if (updates.tax_rate !== undefined && (updates.tax_rate < 0 || updates.tax_rate > 100)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Tax rate must be between 0 and 100',
        'tax_rate'
      );
    }

    if (updates.delivery_radius_miles !== undefined && updates.delivery_radius_miles < 0) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Delivery radius must be positive',
        'delivery_radius_miles'
      );
    }

    if (updates.minimum_order_amount !== undefined && updates.minimum_order_amount < 0) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Minimum order amount must be positive',
        'minimum_order_amount'
      );
    }

    if (updates.primary_color && !this.isValidHexColor(updates.primary_color)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid hex color format',
        'primary_color'
      );
    }

    if (updates.accent_color && !this.isValidHexColor(updates.accent_color)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid hex color format',
        'accent_color'
      );
    }

    if (updates.business_email && !this.isValidEmail(updates.business_email)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid email format',
        'business_email'
      );
    }

    if (updates.business_website && !this.isValidUrl(updates.business_website)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid website URL format',
        'business_website'
      );
    }

    if (updates.storefront_location && !this.isValidBusinessLocation(updates.storefront_location)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid business location coordinates',
        'storefront_location'
      );
    }

    if (updates.business_hours && !this.isValidBusinessHours(updates.business_hours)) {
      throw this.createError(
        StorefrontErrorCode.VALIDATION_ERROR,
        'Invalid business hours format',
        'business_hours'
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private getDefaultProfile(): BusinessProfile {
    return {
      primary_color: STOREFRONT_CONSTANTS.DEFAULT_PRIMARY_COLOR,
      accent_color: STOREFRONT_CONSTANTS.DEFAULT_ACCENT_COLOR,
      business_hours: {},
      business_country: 'US',
      tax_rate: STOREFRONT_CONSTANTS.DEFAULT_TAX_RATE,
      currency: STOREFRONT_CONSTANTS.DEFAULT_CURRENCY,
      timezone: STOREFRONT_CONSTANTS.DEFAULT_TIMEZONE,
      auto_accept_orders: false,
      delivery_radius_miles: STOREFRONT_CONSTANTS.DEFAULT_DELIVERY_RADIUS,
      minimum_order_amount: STOREFRONT_CONSTANTS.DEFAULT_MINIMUM_ORDER,
    };
  }

  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidBusinessLocation(location: BusinessLocation): boolean {
    return (
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180
    );
  }

  private isValidBusinessHours(hours: BusinessHours): boolean {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const [day, schedule] of Object.entries(hours)) {
      if (!validDays.includes(day.toLowerCase())) return false;
      
      if (typeof schedule !== 'object' || schedule === null) return false;
      
      const { open, close, closed } = schedule;
      if (typeof closed !== 'boolean') return false;
      
      if (!closed) {
        if (typeof open !== 'string' || typeof close !== 'string') return false;
        // Basic time format validation (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(open) || !timeRegex.test(close)) return false;
      }
    }
    
    return true;
  }

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  private transformToDatabase(profile: Partial<BusinessProfile>): any {
    const dbData = { ...profile };
    
    // Handle location transformation
    if (profile.storefront_location) {
      dbData.storefront_latitude = profile.storefront_location.latitude;
      dbData.storefront_longitude = profile.storefront_location.longitude;
      delete dbData.storefront_location;
    }

    return dbData;
  }

  private transformFromDatabase(data: any): BusinessProfile {
    const profile = { ...data };
    
    // Handle location transformation
    if (data.storefront_latitude !== undefined && data.storefront_longitude !== undefined) {
      profile.storefront_location = {
        latitude: data.storefront_latitude,
        longitude: data.storefront_longitude,
      };
      delete profile.storefront_latitude;
      delete profile.storefront_longitude;
    }

    return profile;
  }

  private createError(code: StorefrontErrorCode, message: string, field?: string): StorefrontError {
    const error = {
      code,
      message: `STOREFRONT_ERROR: ${message}`,
      field,
    };
    return error;
  }
}
