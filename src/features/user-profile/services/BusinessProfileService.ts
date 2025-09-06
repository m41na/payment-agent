import { supabase } from '../../../shared/data/supabase';
import { BusinessProfile, BusinessLocation, ProfileError } from '../types';

export class BusinessProfileService {
  private readonly tableName = 'pg_preferences';

  private getDefaultProfile(): BusinessProfile {
    return {
      primary_color: '#6200ee',
      accent_color: '#03dac6',
      business_hours: {},
      business_country: 'US',
      tax_rate: 0.0000,
      currency: 'USD',
      timezone: 'America/New_York',
      auto_accept_orders: false,
      delivery_radius_miles: 10,
      minimum_order_amount: 0.00,
    };
  }

  async fetchProfile(userId: string): Promise<BusinessProfile | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // No rows returned
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data ? this.transformFromDatabase(data) : null;
    } catch (error: any) {
      console.error('Error fetching business profile:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async createProfile(userId: string, profileData: Partial<BusinessProfile>): Promise<BusinessProfile> {
    try {
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
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return this.transformFromDatabase(data);
    } catch (error: any) {
      console.error('Error creating business profile:', error);
      throw this.createError('NETWORK_ERROR', error.message);
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
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return this.transformFromDatabase(data);
    } catch (error: any) {
      console.error('Error updating business profile:', error);
      if (error instanceof ProfileError) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async updateStorefrontSettings(userId: string, settings: {
    storefront_name?: string;
    storefront_description?: string;
    primary_color?: string;
    accent_color?: string;
  }): Promise<BusinessProfile> {
    return this.updateProfile(userId, settings);
  }

  async updateStorefrontLocation(userId: string, location: BusinessLocation): Promise<BusinessProfile> {
    return this.updateProfile(userId, {
      storefront_location: location,
    });
  }

  async updateBusinessSettings(userId: string, settings: {
    tax_rate?: number;
    currency?: string;
    auto_accept_orders?: boolean;
    delivery_radius_miles?: number;
    minimum_order_amount?: number;
  }): Promise<BusinessProfile> {
    return this.updateProfile(userId, settings);
  }

  private validateProfileUpdates(updates: Partial<BusinessProfile>): void {
    if (updates.tax_rate !== undefined && (updates.tax_rate < 0 || updates.tax_rate > 100)) {
      throw this.createError('VALIDATION_ERROR', 'Tax rate must be between 0 and 100', 'tax_rate');
    }

    if (updates.delivery_radius_miles !== undefined && updates.delivery_radius_miles < 0) {
      throw this.createError('VALIDATION_ERROR', 'Delivery radius must be positive', 'delivery_radius_miles');
    }

    if (updates.minimum_order_amount !== undefined && updates.minimum_order_amount < 0) {
      throw this.createError('VALIDATION_ERROR', 'Minimum order amount must be positive', 'minimum_order_amount');
    }

    if (updates.primary_color && !this.isValidHexColor(updates.primary_color)) {
      throw this.createError('VALIDATION_ERROR', 'Invalid hex color format', 'primary_color');
    }

    if (updates.accent_color && !this.isValidHexColor(updates.accent_color)) {
      throw this.createError('VALIDATION_ERROR', 'Invalid hex color format', 'accent_color');
    }

    if (updates.business_email && !this.isValidEmail(updates.business_email)) {
      throw this.createError('VALIDATION_ERROR', 'Invalid email format', 'business_email');
    }
  }

  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Transform between API format and database format
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
    }

    return profile;
  }

  private createError(code: ProfileError['code'], message: string, field?: string): ProfileError {
    return {
      code,
      message,
      field,
    };
  }
}
