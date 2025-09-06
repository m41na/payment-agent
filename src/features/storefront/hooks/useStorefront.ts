// ============================================================================
// STOREFRONT HOOK - Business Profile Management
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { StorefrontService } from '../services/StorefrontService';
import { 
  BusinessProfile,
  BusinessHours,
  BusinessLocation,
  StorefrontBranding,
  StorefrontSettings,
  StorefrontError,
  StorefrontErrorCode,
  STOREFRONT_CONSTANTS
} from '../types';

interface StorefrontState {
  profile: BusinessProfile | null;
  isLoading: boolean;
  error: StorefrontError | null;
  isUpdating: boolean;
  completionPercentage: number;
  hasActiveStorefront: boolean;
}

interface StorefrontActions {
  // Profile Management
  fetchProfile: () => Promise<void>;
  createProfile: (profileData: Partial<BusinessProfile>) => Promise<void>;
  updateProfile: (updates: Partial<BusinessProfile>) => Promise<void>;
  deleteProfile: () => Promise<void>;
  
  // Specialized Updates
  updateBranding: (branding: StorefrontBranding) => Promise<void>;
  updateLocation: (location: BusinessLocation) => Promise<void>;
  updateBusinessHours: (hours: BusinessHours) => Promise<void>;
  updateSettings: (settings: StorefrontSettings) => Promise<void>;
  updateContactInfo: (contactInfo: { phone?: string; email?: string; website?: string }) => Promise<void>;
  
  // Utility Actions
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  validateProfile: () => { isValid: boolean; errors: string[] };
}

export interface UseStorefrontReturn extends StorefrontState, StorefrontActions {
  // Computed Values
  isProfileComplete: boolean;
  missingFields: string[];
  canPublishStorefront: boolean;
  
  // Helper Functions
  getCompletionStatus: () => {
    percentage: number;
    completedSections: string[];
    missingSections: string[];
  };
}

export function useStorefront(userId?: string): UseStorefrontReturn {
  const [state, setState] = useState<StorefrontState>({
    profile: null,
    isLoading: false,
    error: null,
    isUpdating: false,
    completionPercentage: 0,
    hasActiveStorefront: false
  });

  const storefrontService = StorefrontService.getInstance();

  // ============================================================================
  // PROFILE MANAGEMENT ACTIONS
  // ============================================================================

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const profile = await storefrontService.getBusinessProfile(userId);
      const completionPercentage = profile ? 
        await storefrontService.calculateProfileCompletion(profile) : 0;
      const hasActiveStorefront = profile ? 
        await storefrontService.hasActiveStorefront(userId) : false;

      setState(prev => ({
        ...prev,
        profile,
        completionPercentage,
        hasActiveStorefront,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoading: false
      }));
    }
  }, [userId, storefrontService]);

  const createProfile = useCallback(async (profileData: Partial<BusinessProfile>) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const newProfile = await storefrontService.createBusinessProfile(userId, profileData);
      const completionPercentage = await storefrontService.calculateProfileCompletion(newProfile);
      const hasActiveStorefront = await storefrontService.hasActiveStorefront(userId);

      setState(prev => ({
        ...prev,
        profile: newProfile,
        completionPercentage,
        hasActiveStorefront,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  const updateProfile = useCallback(async (updates: Partial<BusinessProfile>) => {
    if (!userId || !state.profile) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await storefrontService.updateBusinessProfile(userId, updates);
      const completionPercentage = await storefrontService.calculateProfileCompletion(updatedProfile);
      const hasActiveStorefront = await storefrontService.hasActiveStorefront(userId);

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        completionPercentage,
        hasActiveStorefront,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, state.profile, storefrontService]);

  const deleteProfile = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      await storefrontService.deleteBusinessProfile(userId);
      setState(prev => ({
        ...prev,
        profile: null,
        completionPercentage: 0,
        hasActiveStorefront: false,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  // ============================================================================
  // SPECIALIZED UPDATE ACTIONS
  // ============================================================================

  const updateBranding = useCallback(async (branding: StorefrontBranding) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await storefrontService.updateStorefrontBranding(userId, branding);
      const completionPercentage = await storefrontService.calculateProfileCompletion(updatedProfile);

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        completionPercentage,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  const updateLocation = useCallback(async (location: BusinessLocation) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await storefrontService.updateBusinessLocation(userId, location);
      const completionPercentage = await storefrontService.calculateProfileCompletion(updatedProfile);

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        completionPercentage,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  const updateBusinessHours = useCallback(async (hours: BusinessHours) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await storefrontService.updateBusinessHours(userId, hours);
      const completionPercentage = await storefrontService.calculateProfileCompletion(updatedProfile);

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        completionPercentage,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  const updateSettings = useCallback(async (settings: StorefrontSettings) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await storefrontService.updateStorefrontSettings(userId, settings);
      const completionPercentage = await storefrontService.calculateProfileCompletion(updatedProfile);
      const hasActiveStorefront = await storefrontService.hasActiveStorefront(userId);

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        completionPercentage,
        hasActiveStorefront,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  const updateContactInfo = useCallback(async (contactInfo: { phone?: string; email?: string; website?: string }) => {
    if (!userId) return;

    setState(prev => ({ ...prev, isUpdating: true, error: null }));

    try {
      const updatedProfile = await storefrontService.updateContactInfo(userId, contactInfo);
      const completionPercentage = await storefrontService.calculateProfileCompletion(updatedProfile);

      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        completionPercentage,
        isUpdating: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isUpdating: false
      }));
    }
  }, [userId, storefrontService]);

  // ============================================================================
  // UTILITY ACTIONS
  // ============================================================================

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const validateProfile = useCallback(() => {
    if (!state.profile) {
      return { isValid: false, errors: ['No profile found'] };
    }

    const errors: string[] = [];

    // Required fields validation
    if (!state.profile.business_name?.trim()) {
      errors.push('Business name is required');
    }

    if (!state.profile.business_type) {
      errors.push('Business type is required');
    }

    if (!state.profile.location) {
      errors.push('Business location is required');
    }

    if (!state.profile.contact_info?.email) {
      errors.push('Contact email is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [state.profile]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const isProfileComplete = state.completionPercentage >= STOREFRONT_CONSTANTS.COMPLETION_THRESHOLDS.MINIMUM_FOR_PUBLICATION;
  
  const missingFields = (() => {
    if (!state.profile) return ['All fields'];
    
    const missing: string[] = [];
    if (!state.profile.business_name) missing.push('Business name');
    if (!state.profile.business_type) missing.push('Business type');
    if (!state.profile.location) missing.push('Location');
    if (!state.profile.contact_info?.email) missing.push('Contact email');
    if (!state.profile.business_hours) missing.push('Business hours');
    
    return missing;
  })();

  const canPublishStorefront = isProfileComplete && state.hasActiveStorefront;

  const getCompletionStatus = useCallback(() => {
    const sections = [
      { name: 'Basic Info', required: ['business_name', 'business_type', 'description'] },
      { name: 'Location', required: ['location'] },
      { name: 'Contact', required: ['contact_info.email'] },
      { name: 'Hours', required: ['business_hours'] },
      { name: 'Branding', required: ['branding.primary_color'] }
    ];

    const completedSections: string[] = [];
    const missingSections: string[] = [];

    sections.forEach(section => {
      const isComplete = section.required.every(field => {
        const fieldPath = field.split('.');
        let value = state.profile as any;
        
        for (const path of fieldPath) {
          value = value?.[path];
        }
        
        return value !== null && value !== undefined && value !== '';
      });

      if (isComplete) {
        completedSections.push(section.name);
      } else {
        missingSections.push(section.name);
      }
    });

    return {
      percentage: state.completionPercentage,
      completedSections,
      missingSections
    };
  }, [state.profile, state.completionPercentage]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId, fetchProfile]);

  return {
    // State
    profile: state.profile,
    isLoading: state.isLoading,
    error: state.error,
    isUpdating: state.isUpdating,
    completionPercentage: state.completionPercentage,
    hasActiveStorefront: state.hasActiveStorefront,

    // Actions
    fetchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    updateBranding,
    updateLocation,
    updateBusinessHours,
    updateSettings,
    updateContactInfo,
    refreshProfile,
    clearError,
    validateProfile,

    // Computed Values
    isProfileComplete,
    missingFields,
    canPublishStorefront,
    getCompletionStatus
  };
}
