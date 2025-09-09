import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePayment } from '../../payment-processing/hooks/usePayment';
import { ProfileManagementProps, ProfileData, BusinessData } from '../containers/ProfileManagementContainer';
import MapLocationPicker from '../../location-services/components/MapLocationPicker';
import PaymentMethodsContent from './PaymentMethodsContent';

const { width } = Dimensions.get('window');

type TabType = 'profile' | 'storefront';

interface ModernProfileManagementProps extends ProfileManagementProps {
  // Payment methods data and actions
  paymentMethods?: any[];
  onAddPaymentMethod?: () => void;
  onEditPaymentMethod?: (id: string) => void;
  onDeletePaymentMethod?: (id: string) => void;
  onSetDefaultPaymentMethod?: (id: string) => void;
  
  // Account actions
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onViewTerms?: () => void;
  onViewPrivacy?: () => void;
}

const ProfileManagementScreen: React.FC<ModernProfileManagementProps> = ({
  // View state
  activeTab,
  isEditing,
  saving,
  loading,
  
  // Data
  profileData,
  businessData,
  userEmail,
  paymentMethods = [],
  
  // Actions
  onTabChange,
  onStartEditing,
  onCancelEditing,
  onSave,
  onProfileDataChange,
  onBusinessDataChange,
  onLocationChange,
  onAddPaymentMethod,
  onEditPaymentMethod,
  onDeletePaymentMethod,
  onSetDefaultPaymentMethod,
  onLogout,
  onDeleteAccount,
  onViewTerms,
  onViewPrivacy,
}) => {

  const handleProfileFieldChange = (field: keyof ProfileData, value: any) => {
    onProfileDataChange({ [field]: value });
  };

  const handleNotificationChange = (field: keyof ProfileData['notification_preferences'], value: boolean) => {
    onProfileDataChange({
      notification_preferences: {
        ...profileData.notification_preferences,
        [field]: value,
      },
    });
  };

  const handlePrivacyChange = (field: keyof ProfileData['privacy_settings'], value: boolean) => {
    onProfileDataChange({
      privacy_settings: {
        ...profileData.privacy_settings,
        [field]: value,
      },
    });
  };

  const handleBusinessFieldChange = (field: keyof BusinessData, value: any) => {
    onBusinessDataChange({ [field]: value });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: onDeleteAccount },
      ]
    );
  };

  const renderTabButton = (tab: TabType, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => onTabChange(tab)}
    >
      <Ionicons 
        name={icon} 
        size={20} 
        color={activeTab === tab ? '#fff' : '#64748b'} 
        style={styles.tabIcon}
      />
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProfileTab = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Personal Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.full_name}
            onChangeText={(text) => onProfileDataChange({ full_name: text })}
            placeholder="Enter your full name"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.phone_number}
            onChangeText={(text) => onProfileDataChange({ phone_number: text })}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.textArea, !isEditing && styles.disabledInput]}
            value={profileData.bio}
            onChangeText={(text) => onProfileDataChange({ bio: text })}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            editable={isEditing}
          />
        </View>
      </View>

      {/* Social Links Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Links</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Social Link 1</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.social_1}
            onChangeText={(text) => onProfileDataChange({ social_1: text })}
            placeholder="Instagram, Twitter, etc."
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Social Link 2</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.social_2}
            onChangeText={(text) => onProfileDataChange({ social_2: text })}
            placeholder="LinkedIn, Facebook, etc."
            editable={isEditing}
          />
        </View>
      </View>

      {/* Privacy Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Profile Visible</Text>
          <Switch
            value={profileData.privacy_settings.profile_visible}
            onValueChange={(value) => onProfileDataChange({
              privacy_settings: { ...profileData.privacy_settings, profile_visible: value }
            })}
            disabled={!isEditing}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Phone Number</Text>
          <Switch
            value={profileData.privacy_settings.show_phone}
            onValueChange={(value) => onProfileDataChange({
              privacy_settings: { ...profileData.privacy_settings, show_phone: value }
            })}
            disabled={!isEditing}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Email</Text>
          <Switch
            value={profileData.privacy_settings.show_email}
            onValueChange={(value) => onProfileDataChange({
              privacy_settings: { ...profileData.privacy_settings, show_email: value }
            })}
            disabled={!isEditing}
          />
        </View>
      </View>

      {/* Notification Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Email Notifications</Text>
          <Switch
            value={profileData.notification_preferences.email}
            onValueChange={(value) => onProfileDataChange({
              notification_preferences: { ...profileData.notification_preferences, email: value }
            })}
            disabled={!isEditing}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>SMS Notifications</Text>
          <Switch
            value={profileData.notification_preferences.sms}
            onValueChange={(value) => onProfileDataChange({
              notification_preferences: { ...profileData.notification_preferences, sms: value }
            })}
            disabled={!isEditing}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Push Notifications</Text>
          <Switch
            value={profileData.notification_preferences.push}
            onValueChange={(value) => onProfileDataChange({
              notification_preferences: { ...profileData.notification_preferences, push: value }
            })}
            disabled={!isEditing}
          />
        </View>
      </View>

      {/* Payment Methods Section */}
      <PaymentMethodsContent />

      {/* Account Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Management</Text>
        
        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#667eea" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete Account Section */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <Text style={styles.dangerZoneDescription}>
            Once you delete your account, there is no going back. Please be certain.
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={onDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderBusinessTab = () => (
    <View>
      {/* Storefront Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storefront</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Store Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.storefront_name}
            onChangeText={(text) => handleBusinessFieldChange('storefront_name', text)}
            placeholder="Enter your store name"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Store Description</Text>
          <TextInput
            style={[styles.textArea, !isEditing && styles.disabledInput]}
            value={businessData.storefront_description}
            onChangeText={(text) => handleBusinessFieldChange('storefront_description', text)}
            placeholder="Describe your business..."
            multiline
            numberOfLines={3}
            editable={isEditing}
          />
        </View>

        <View style={styles.colorRow}>
          <View style={styles.colorGroup}>
            <Text style={styles.label}>Primary Color</Text>
            <View style={styles.colorInputContainer}>
              <View style={[styles.colorPreview, { backgroundColor: businessData.primary_color }]} />
              <TextInput
                style={[styles.colorInput, !isEditing && styles.disabledInput]}
                value={businessData.primary_color}
                onChangeText={(text) => handleBusinessFieldChange('primary_color', text)}
                placeholder="#6200ee"
                editable={isEditing}
              />
            </View>
          </View>

          <View style={styles.colorGroup}>
            <Text style={styles.label}>Accent Color</Text>
            <View style={styles.colorInputContainer}>
              <View style={[styles.colorPreview, { backgroundColor: businessData.accent_color }]} />
              <TextInput
                style={[styles.colorInput, !isEditing && styles.disabledInput]}
                value={businessData.accent_color}
                onChangeText={(text) => handleBusinessFieldChange('accent_color', text)}
                placeholder="#03dac6"
                editable={isEditing}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Storefront Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storefront Location</Text>
        <MapLocationPicker
          location={{ 
            latitude: businessData.storefront_latitude, 
            longitude: businessData.storefront_longitude 
          }}
          onLocationChange={onLocationChange}
          editable={isEditing}
        />
      </View>

      {/* Business Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Address</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Street Address</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.business_street}
            onChangeText={(text) => handleBusinessFieldChange('business_street', text)}
            placeholder="123 Main Street"
            editable={isEditing}
          />
        </View>

        <View style={styles.addressRow}>
          <View style={styles.addressGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={businessData.business_city}
              onChangeText={(text) => handleBusinessFieldChange('business_city', text)}
              placeholder="City"
              editable={isEditing}
            />
          </View>

          <View style={styles.addressGroup}>
            <Text style={styles.label}>State</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={businessData.business_state}
              onChangeText={(text) => handleBusinessFieldChange('business_state', text)}
              placeholder="State"
              editable={isEditing}
            />
          </View>

          <View style={styles.addressGroup}>
            <Text style={styles.label}>ZIP</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.disabledInput]}
              value={businessData.business_zip}
              onChangeText={(text) => handleBusinessFieldChange('business_zip', text)}
              placeholder="12345"
              editable={isEditing}
            />
          </View>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Phone</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.business_phone}
            onChangeText={(text) => handleBusinessFieldChange('business_phone', text)}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Email</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.business_email}
            onChangeText={(text) => handleBusinessFieldChange('business_email', text)}
            placeholder="business@example.com"
            keyboardType="email-address"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.business_website}
            onChangeText={(text) => handleBusinessFieldChange('business_website', text)}
            placeholder="https://www.example.com"
            keyboardType="url"
            editable={isEditing}
          />
        </View>
      </View>

      {/* Business Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Settings</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tax Rate (%)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.tax_rate.toString()}
            onChangeText={(text) => handleBusinessFieldChange('tax_rate', parseFloat(text) || 0)}
            placeholder="8.25"
            keyboardType="decimal-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Currency</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.currency}
            onChangeText={(text) => handleBusinessFieldChange('currency', text)}
            placeholder="USD"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Delivery Radius (miles)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.delivery_radius_miles.toString()}
            onChangeText={(text) => handleBusinessFieldChange('delivery_radius_miles', parseFloat(text) || 0)}
            placeholder="10"
            keyboardType="decimal-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Minimum Order Amount ($)</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={businessData.minimum_order_amount.toString()}
            onChangeText={(text) => handleBusinessFieldChange('minimum_order_amount', parseFloat(text) || 0)}
            placeholder="0.00"
            keyboardType="decimal-pad"
            editable={isEditing}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Auto-Accept Orders</Text>
          <Switch
            value={businessData.auto_accept_orders}
            onValueChange={(value) => handleBusinessFieldChange('auto_accept_orders', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={businessData.auto_accept_orders ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <TouchableOpacity
          style={[styles.headerButton, isEditing ? styles.cancelButton : styles.editButton]}
          onPress={isEditing ? onCancelEditing : onStartEditing}
        >
          <Text style={[styles.headerButtonText, isEditing && styles.cancelButtonText]}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('profile', 'Profile', 'person')}
        {renderTabButton('storefront', 'Storefront', 'briefcase')}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'profile' ? renderProfileTab() : renderBusinessTab()}

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editButton: {
    backgroundColor: '#667eea',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  headerButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#64748b',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#667eea',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1e293b',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#1e293b',
  },
  disabledInput: {
    backgroundColor: '#f8fafc',
    color: '#64748b',
    borderColor: '#f1f5f9',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  colorGroup: {
    flex: 1,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 0,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addressGroup: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  scrollContent: {
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  dangerZone: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    marginTop: 20,
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444',
  },
  dangerZoneDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default ProfileManagementScreen;
