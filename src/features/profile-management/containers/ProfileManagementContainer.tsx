import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useUserProfileContext } from '../../../providers/UserProfileProvider';
import { useStorefrontContext } from '../../../providers/StorefrontProvider';
import { useAuth } from '../../../shared/auth/AuthContext';
import ProfileManagementScreen from '../components/ProfileManagementScreen';

// Types for profile data
export interface ProfileData {
  full_name: string;
  phone_number: string;
  social_1: string;
  social_2: string;
  bio: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy_settings: {
    profile_visible: boolean;
    show_phone: boolean;
    show_email: boolean;
  };
}

export interface BusinessData {
  storefront_name: string;
  storefront_description: string;
  primary_color: string;
  accent_color: string;
  business_street: string;
  business_city: string;
  business_state: string;
  business_zip: string;
  business_phone: string;
  business_email: string;
  business_website: string;
  tax_rate: number;
  currency: string;
  auto_accept_orders: boolean;
  delivery_radius_miles: number;
  minimum_order_amount: number;
  storefront_latitude: number;
  storefront_longitude: number;
}

export interface ProfileManagementProps {
  // View state
  activeTab: 'profile' | 'business';
  isEditing: boolean;
  saving: boolean;
  loading: boolean;
  
  // Data
  profileData: ProfileData;
  businessData: BusinessData;
  userEmail: string;
  
  // Actions
  onTabChange: (tab: 'profile' | 'business') => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => Promise<void>;
  onProfileDataChange: (data: Partial<ProfileData>) => void;
  onBusinessDataChange: (data: Partial<BusinessData>) => void;
  onLocationChange: (location: { latitude: number; longitude: number }) => void;
}

const ProfileManagementContainer: React.FC = () => {
  const { 
    profile, 
    loading: profileLoading, 
    updateProfile, 
    createProfile,
    refreshProfile 
  } = useUserProfileContext();
  const { 
    profile: storefrontProfile, 
    isLoading: storefrontLoading, 
    updateProfile: updateStorefront,
    createProfile: createStorefront 
  } = useStorefrontContext();
  const { user } = useAuth();

  // View state
  const [activeTab, setActiveTab] = useState<'profile' | 'business'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    phone_number: '',
    social_1: '',
    social_2: '',
    bio: '',
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
  });

  // Business preferences form state
  const [businessData, setBusinessData] = useState<BusinessData>({
    storefront_name: '',
    storefront_description: '',
    primary_color: '#6200ee',
    accent_color: '#03dac6',
    business_street: '',
    business_city: '',
    business_state: '',
    business_zip: '',
    business_phone: '',
    business_email: '',
    business_website: '',
    tax_rate: 0,
    currency: 'USD',
    auto_accept_orders: false,
    delivery_radius_miles: 10,
    minimum_order_amount: 0,
    storefront_latitude: 0,
    storefront_longitude: 0,
  });

  // Initialize profile data when profile loads
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        social_1: profile.social_1 || '',
        social_2: profile.social_2 || '',
        bio: profile.bio || '',
        notification_preferences: profile.notification_preferences || {
          email: true,
          sms: false,
          push: true,
        },
        privacy_settings: profile.privacy_settings || {
          profile_visible: true,
          show_phone: false,
          show_email: false,
        },
      });
    }
  }, [profile]);

  // Initialize business data when preferences load
  useEffect(() => {
    if (storefrontProfile) {
      setBusinessData({
        storefront_name: storefrontProfile.storefront_name || '',
        storefront_description: storefrontProfile.storefront_description || '',
        primary_color: storefrontProfile.primary_color || '#6200ee',
        accent_color: storefrontProfile.accent_color || '#03dac6',
        business_street: storefrontProfile.business_street || '',
        business_city: storefrontProfile.business_city || '',
        business_state: storefrontProfile.business_state || '',
        business_zip: storefrontProfile.business_zip || '',
        business_phone: storefrontProfile.business_phone || '',
        business_email: storefrontProfile.business_email || '',
        business_website: storefrontProfile.business_website || '',
        tax_rate: storefrontProfile.tax_rate || 0,
        currency: storefrontProfile.currency || 'USD',
        auto_accept_orders: storefrontProfile.auto_accept_orders || false,
        delivery_radius_miles: storefrontProfile.delivery_radius_miles || 10,
        minimum_order_amount: storefrontProfile.minimum_order_amount || 0,
        storefront_latitude: storefrontProfile.storefront_location?.latitude || 0,
        storefront_longitude: storefrontProfile.storefront_location?.longitude || 0,
      });
    }
  }, [storefrontProfile]);

  // Reset form data to original values
  const resetFormData = useCallback(() => {
    if (activeTab === 'profile' && profile) {
      setProfileData({
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        social_1: profile.social_1 || '',
        social_2: profile.social_2 || '',
        bio: profile.bio || '',
        notification_preferences: profile.notification_preferences || {
          email: true,
          sms: false,
          push: true,
        },
        privacy_settings: profile.privacy_settings || {
          profile_visible: true,
          show_phone: false,
          show_email: false,
        },
      });
    } else if (activeTab === 'business' && storefrontProfile) {
      setBusinessData({
        storefront_name: storefrontProfile.storefront_name || '',
        storefront_description: storefrontProfile.storefront_description || '',
        primary_color: storefrontProfile.primary_color || '#6200ee',
        accent_color: storefrontProfile.accent_color || '#03dac6',
        business_street: storefrontProfile.business_street || '',
        business_city: storefrontProfile.business_city || '',
        business_state: storefrontProfile.business_state || '',
        business_zip: storefrontProfile.business_zip || '',
        business_phone: storefrontProfile.business_phone || '',
        business_email: storefrontProfile.business_email || '',
        business_website: storefrontProfile.business_website || '',
        tax_rate: storefrontProfile.tax_rate || 0,
        currency: storefrontProfile.currency || 'USD',
        auto_accept_orders: storefrontProfile.auto_accept_orders || false,
        delivery_radius_miles: storefrontProfile.delivery_radius_miles || 10,
        minimum_order_amount: storefrontProfile.minimum_order_amount || 0,
        storefront_latitude: storefrontProfile.storefront_location?.latitude || 0,
        storefront_longitude: storefrontProfile.storefront_location?.longitude || 0,
      });
    }
  }, [activeTab, profile, storefrontProfile]);

  // Handle save action
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      
      if (activeTab === 'profile') {
        if (profile) {
          await updateProfile(profileData);
        } else {
          await createProfile(profileData);
        }
      } else {
        const businessPayload = {
          ...businessData,
          storefront_location: {
            latitude: businessData.storefront_latitude,
            longitude: businessData.storefront_longitude,
          },
        };

        if (storefrontProfile) {
          await updateStorefront(businessPayload);
        } else {
          await createStorefront(businessPayload);
        }
      }
      
      setIsEditing(false);
      Alert.alert(
        'Success', 
        `${activeTab === 'profile' ? 'Profile' : 'Business settings'} updated successfully!`
      );
    } catch (error: any) {
      console.error('Failed to save profile/business data:', error);
      Alert.alert('Error', error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [activeTab, profile, storefrontProfile, profileData, businessData, updateProfile, createProfile, updateStorefront, createStorefront]);

  // Handle cancel editing
  const handleCancelEditing = useCallback(() => {
    resetFormData();
    setIsEditing(false);
  }, [resetFormData]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'profile' | 'business') => {
    setActiveTab(tab);
    setIsEditing(false);
  }, []);

  // Handle profile data changes
  const handleProfileDataChange = useCallback((data: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...data }));
  }, []);

  // Handle business data changes
  const handleBusinessDataChange = useCallback((data: Partial<BusinessData>) => {
    setBusinessData(prev => ({ ...prev, ...data }));
  }, []);

  // Handle location changes
  const handleLocationChange = useCallback((location: { latitude: number; longitude: number }) => {
    setBusinessData(prev => ({
      ...prev,
      storefront_latitude: location.latitude,
      storefront_longitude: location.longitude,
    }));
  }, []);

  // Computed values
  const loading = useMemo(() => profileLoading || storefrontLoading, [profileLoading, storefrontLoading]);
  const userEmail = useMemo(() => user?.email || '', [user?.email]);

  // Props for the UI component
  const props: ProfileManagementProps = useMemo(() => ({
    // View state
    activeTab,
    isEditing,
    saving,
    loading,
    
    // Data
    profileData,
    businessData,
    userEmail,
    
    // Actions
    onTabChange: handleTabChange,
    onStartEditing: () => setIsEditing(true),
    onCancelEditing: handleCancelEditing,
    onSave: handleSave,
    onProfileDataChange: handleProfileDataChange,
    onBusinessDataChange: handleBusinessDataChange,
    onLocationChange: handleLocationChange,
  }), [
    activeTab,
    isEditing,
    saving,
    loading,
    profileData,
    businessData,
    userEmail,
    handleTabChange,
    handleCancelEditing,
    handleSave,
    handleProfileDataChange,
    handleBusinessDataChange,
    handleLocationChange,
  ]);

  return <ProfileManagementScreen {...props} />;
};

export default ProfileManagementContainer;
