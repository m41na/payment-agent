import React from 'react';
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
  Dimensions
} from 'react-native';
import { ProfileManagementProps, ProfileData, BusinessData } from '../containers/ProfileManagementContainer';
import MapLocationPicker from '../../../components/MapLocationPicker';

const { width } = Dimensions.get('window');

const ProfileManagementScreen: React.FC<ProfileManagementProps> = ({
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
  onTabChange,
  onStartEditing,
  onCancelEditing,
  onSave,
  onProfileDataChange,
  onBusinessDataChange,
  onLocationChange,
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

  const renderTabButton = (tab: 'profile' | 'business', label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => onTabChange(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderProfileTab = () => (
    <View>
      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.full_name}
            onChangeText={(text) => handleProfileFieldChange('full_name', text)}
            placeholder="Enter your full name"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={userEmail}
            editable={false}
            placeholder="Email from authentication"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.phone_number}
            onChangeText={(text) => handleProfileFieldChange('phone_number', text)}
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
            onChangeText={(text) => handleProfileFieldChange('bio', text)}
            placeholder="Tell us about yourself..."
            multiline
            numberOfLines={4}
            editable={isEditing}
          />
        </View>
      </View>

      {/* Social Media */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Media</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instagram / Twitter</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.social_1}
            onChangeText={(text) => handleProfileFieldChange('social_1', text)}
            placeholder="@username or profile URL"
            editable={isEditing}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Other Social Media</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.disabledInput]}
            value={profileData.social_2}
            onChangeText={(text) => handleProfileFieldChange('social_2', text)}
            placeholder="@username or profile URL"
            editable={isEditing}
          />
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Email Notifications</Text>
          <Switch
            value={profileData.notification_preferences.email}
            onValueChange={(value) => handleNotificationChange('email', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={profileData.notification_preferences.email ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>SMS Notifications</Text>
          <Switch
            value={profileData.notification_preferences.sms}
            onValueChange={(value) => handleNotificationChange('sms', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={profileData.notification_preferences.sms ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Push Notifications</Text>
          <Switch
            value={profileData.notification_preferences.push}
            onValueChange={(value) => handleNotificationChange('push', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={profileData.notification_preferences.push ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Profile Visible to Others</Text>
          <Switch
            value={profileData.privacy_settings.profile_visible}
            onValueChange={(value) => handlePrivacyChange('profile_visible', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={profileData.privacy_settings.profile_visible ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Phone Number</Text>
          <Switch
            value={profileData.privacy_settings.show_phone}
            onValueChange={(value) => handlePrivacyChange('show_phone', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={profileData.privacy_settings.show_phone ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show Email Address</Text>
          <Switch
            value={profileData.privacy_settings.show_email}
            onValueChange={(value) => handlePrivacyChange('show_email', value)}
            disabled={!isEditing}
            trackColor={{ false: '#e0e0e0', true: '#667eea' }}
            thumbColor={profileData.privacy_settings.show_email ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
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
        {renderTabButton('profile', 'Profile')}
        {renderTabButton('business', 'Business')}
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
});

export default ProfileManagementScreen;
