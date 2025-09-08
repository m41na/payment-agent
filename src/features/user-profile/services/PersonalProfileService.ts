import { supabase } from '../../../services/supabase';
import { PersonalProfile, ProfileUpdateResult, ProfileError } from '../types';

export class PersonalProfileService {
  private readonly tableName = 'pg_profiles';

  private getDefaultProfile(): Partial<PersonalProfile> {
    return {
      notification_preferences: {
        email: true,
        sms: false,
        push: true,
      },
      privacy_settings: {
        profile_visible: true,
        show_phone: false,
        show_email: false,
      },
    };
  }

  async fetchProfile(userId: string): Promise<PersonalProfile | null> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // No rows returned
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data || null;
    } catch (error: any) {
      console.error('Error fetching personal profile:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async createProfile(userId: string, email: string, profileData: Partial<PersonalProfile>): Promise<PersonalProfile> {
    try {
      const newProfile = {
        ...this.getDefaultProfile(),
        ...profileData,
        id: userId,
        email,
      };

      const { data, error } = await supabase
        .from(this.tableName)
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error creating personal profile:', error);
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async updateProfile(userId: string, updates: Partial<PersonalProfile>): Promise<PersonalProfile> {
    try {
      // Validate updates
      this.validateProfileUpdates(updates);

      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw this.createError('NETWORK_ERROR', error.message);
      }

      return data;
    } catch (error: any) {
      console.error('Error updating personal profile:', error);
      if (error instanceof ProfileError) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', error.message);
    }
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<PersonalProfile['notification_preferences']>): Promise<PersonalProfile> {
    const currentProfile = await this.fetchProfile(userId);
    if (!currentProfile) {
      throw this.createError('NOT_FOUND', 'Profile not found');
    }

    const updatedPreferences = {
      ...currentProfile.notification_preferences,
      ...preferences,
    };

    return this.updateProfile(userId, {
      notification_preferences: updatedPreferences,
    });
  }

  async updatePrivacySettings(userId: string, settings: Partial<PersonalProfile['privacy_settings']>): Promise<PersonalProfile> {
    const currentProfile = await this.fetchProfile(userId);
    if (!currentProfile) {
      throw this.createError('NOT_FOUND', 'Profile not found');
    }

    const updatedSettings = {
      ...currentProfile.privacy_settings,
      ...settings,
    };

    return this.updateProfile(userId, {
      privacy_settings: updatedSettings,
    });
  }

  private validateProfileUpdates(updates: Partial<PersonalProfile>): void {
    if (updates.phone_number && !this.isValidPhoneNumber(updates.phone_number)) {
      throw this.createError('VALIDATION_ERROR', 'Invalid phone number format', 'phone_number');
    }

    if (updates.full_name && updates.full_name.trim().length < 2) {
      throw this.createError('VALIDATION_ERROR', 'Full name must be at least 2 characters', 'full_name');
    }

    if (updates.bio && updates.bio.length > 500) {
      throw this.createError('VALIDATION_ERROR', 'Bio must be less than 500 characters', 'bio');
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation - can be enhanced
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private createError(code: ProfileError['code'], message: string, field?: string): ProfileError {
    return {
      code,
      message,
      field,
    };
  }
}
