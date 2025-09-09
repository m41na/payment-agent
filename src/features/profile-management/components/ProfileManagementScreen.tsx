import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProfileManagementProps, ProfileData, BusinessData } from '../containers/ProfileManagementContainer';
import MapLocationPicker from '../../location-services/components/MapLocationPicker';
import PaymentMethodsContent from './PaymentMethodsContent';
import { appTheme } from '../../theme';

type TabType = 'profile' | 'storefront';

interface ModernProfileManagementProps extends ProfileManagementProps {
  paymentMethods?: any[];
  onAddPaymentMethod?: () => void;
  onEditPaymentMethod?: (id: string) => void;
  onDeletePaymentMethod?: (id: string) => void;
  onSetDefaultPaymentMethod?: (id: string) => void;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onViewTerms?: () => void;
  onViewPrivacy?: () => void;
}

const SmallPencil = ({ color = appTheme.colors.muted }) => (
  <Ionicons name="pencil" size={16} color={color} />
);

const ProfileManagementScreen: React.FC<ModernProfileManagementProps> = ({
  activeTab,
  profileData,
  businessData,
  userEmail,
  paymentMethods = [],
  loading,
  saving,
  onProfileDataChange,
  onBusinessDataChange,
  onLocationChange,
  onAddPaymentMethod,
  onEditPaymentMethod,
  onDeletePaymentMethod,
  onSetDefaultPaymentMethod,
  onLogout,
  onDeleteAccount,
  onTabChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalField, setModalField] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState<string>('');
  const [dateValue, setDateValue] = useState<Date>(() => (profileData?.birthdate ? new Date(profileData.birthdate) : new Date(1990, 0, 1)));

  useEffect(() => {
    if (profileData?.birthdate) setDateValue(new Date(profileData.birthdate));
  }, [profileData?.birthdate]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  const initials = (profileData?.full_name || userEmail || 'U')
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const openEdit = (field: string, initial = '') => {
    setModalField(field);
    setModalValue(initial ?? '');
    setModalVisible(true);
  };

  const saveModal = () => {
    if (!modalField) return setModalVisible(false);

    if (modalField === 'birthdate') {
      onProfileDataChange({ birthdate: dateValue.toISOString() });
    } else if (modalField.startsWith('business.')) {
      const key = modalField.replace('business.', '');
      onBusinessDataChange({ [key]: modalValue });
    } else {
      onProfileDataChange({ [modalField]: modalValue });
    }

    setModalVisible(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onLogout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'This action cannot be undone. All your data will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: onDeleteAccount },
    ]);
  };

  const Field = ({ label, value, onPress, placeholder }: { label: string; value?: string | number | null; onPress?: () => void; placeholder?: string }) => (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={styles.fieldRow}>
      <View>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text numberOfLines={2} style={[styles.fieldValue, !value && styles.emptyValue]}>{value ? String(value) : placeholder ?? '—'}</Text>
      </View>
      {onPress && (
        <View style={styles.editIconWrap}>
          <SmallPencil color={appTheme.colors.muted} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <View style={styles.headerInner}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.nameText}>{profileData?.full_name || 'Your name'}</Text>
            <Text style={styles.emailText}>{userEmail || profileData?.email || ''}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.topLogoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={appTheme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]} onPress={() => onTabChange('profile')}>
          <Ionicons name="person" size={18} color={activeTab === 'profile' ? appTheme.colors.primary : appTheme.colors.muted} />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabItem, activeTab === 'storefront' && styles.tabItemActive]} onPress={() => onTabChange('storefront')}>
          <Ionicons name="business" size={18} color={activeTab === 'storefront' ? appTheme.colors.primary : appTheme.colors.muted} />
          <Text style={[styles.tabText, activeTab === 'storefront' && styles.tabTextActive]}>Storefront</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileTab = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>

        <Field label="Full name" value={profileData?.full_name} onPress={() => openEdit('full_name', profileData?.full_name)} placeholder="Tap to add your name" />

        <Field label="Email" value={userEmail || profileData?.email} placeholder="—" />

        <Field label="Phone" value={profileData?.phone_number} onPress={() => openEdit('phone_number', profileData?.phone_number)} placeholder="Add phone number" />

        <Field label="Birthday" value={profileData?.birthdate ? new Date(profileData.birthdate).toLocaleDateString() : undefined} onPress={() => openEdit('birthdate')} placeholder="Add birthday" />

        <View style={styles.sectionDivider} />

        <Text style={styles.cardTitle}>About</Text>
        <TouchableOpacity onPress={() => openEdit('bio', profileData?.bio)} activeOpacity={0.8} style={styles.bioBox}>
          <Text style={[styles.bioText, !profileData?.bio && styles.emptyValue]}>{profileData?.bio || 'Tap to add a short bio about yourself'}</Text>
          <SmallPencil />
        </TouchableOpacity>

        <View style={styles.sectionDivider} />

        <Text style={styles.cardTitle}>Privacy & Preferences</Text>

        <View style={styles.switchRowModern}>
          <Text style={styles.switchLabelModern}>Profile Visible</Text>
          <Switch value={profileData?.privacy_settings?.profile_visible} onValueChange={v => onProfileDataChange({ privacy_settings: { ...profileData.privacy_settings, profile_visible: v } })} trackColor={{ true: appTheme.colors.primary }} />
        </View>

        <View style={styles.switchRowModern}>
          <Text style={styles.switchLabelModern}>Show Email</Text>
          <Switch value={profileData?.privacy_settings?.show_email} onValueChange={v => onProfileDataChange({ privacy_settings: { ...profileData.privacy_settings, show_email: v } })} trackColor={{ true: appTheme.colors.primary }} />
        </View>

        <View style={styles.sectionDivider} />

        <PaymentMethodsContent paymentMethods={paymentMethods} onAddPaymentMethod={onAddPaymentMethod} onEditPaymentMethod={onEditPaymentMethod} onDeletePaymentMethod={onDeletePaymentMethod} onSetDefaultPaymentMethod={onSetDefaultPaymentMethod} />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={16} color={appTheme.colors.primary} />
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dangerZoneCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerText}>Deleting your account is irreversible and will permanently remove all your data.</Text>
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={16} color={appTheme.colors.surface} />
          <Text style={styles.deleteAccountButtonText}>Delete account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBusinessTab = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Storefront</Text>

      <Field label="Store name" value={businessData?.storefront_name} onPress={() => openEdit('business.storefront_name', businessData?.storefront_name)} placeholder="Add your store name" />

      <Field label="Description" value={businessData?.storefront_description} onPress={() => openEdit('business.storefront_description', businessData?.storefront_description)} placeholder="Tap to add description" />

      <Field label="Primary color" value={businessData?.primary_color} onPress={() => openEdit('business.primary_color', businessData?.primary_color)} />

      <Field label="Accent color" value={businessData?.accent_color} onPress={() => openEdit('business.accent_color', businessData?.accent_color)} />

      <Field label="Address" value={`${businessData?.business_street || ''} ${businessData?.business_city || ''}`.trim()} onPress={() => openEdit('business.business_street', businessData?.business_street)} />

      <View style={styles.sectionDivider} />

      <Text style={styles.cardTitle}>Business Settings</Text>
      <Field label="Currency" value={businessData?.currency} onPress={() => openEdit('business.currency', businessData?.currency)} />
      <Field label="Tax rate (%)" value={String(businessData?.tax_rate ?? '')} onPress={() => openEdit('business.tax_rate', String(businessData?.tax_rate ?? ''))} />

      <View style={styles.switchRowModern}>
        <Text style={styles.switchLabelModern}>Auto-accept orders</Text>
        <Switch value={businessData?.auto_accept_orders} onValueChange={v => onBusinessDataChange({ auto_accept_orders: v })} trackColor={{ true: appTheme.colors.primary }} />
      </View>

      <View style={{ marginTop: appTheme.spacing.md }}>
        <Text style={styles.inputLabel}>Storefront location</Text>
        <MapLocationPicker location={{ latitude: businessData?.storefront_latitude, longitude: businessData?.storefront_longitude }} onLocationChange={onLocationChange} editable />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.containerPad} showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {activeTab === 'profile' ? renderProfileTab() : renderBusinessTab()}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalField === 'birthdate' ? 'Edit Birthday' : modalField?.startsWith('business.') ? 'Edit Storefront' : `Edit ${modalField}`}</Text>

            {modalField === 'birthdate' ? (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <View style={styles.dateControlRow}>
                  <TouchableOpacity onPress={() => setDateValue(d => new Date(d.getFullYear() - 1, d.getMonth(), d.getDate()))} style={styles.dateControlBtn}><Text style={styles.dateControlText}>-1y</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setDateValue(d => new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()))} style={styles.dateControlBtn}><Text style={styles.dateControlText}>-1m</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setDateValue(new Date())} style={styles.dateControlBtn}><Text style={styles.dateControlText}>Today</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setDateValue(d => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()))} style={styles.dateControlBtn}><Text style={styles.dateControlText}>+1m</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setDateValue(d => new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()))} style={styles.dateControlBtn}><Text style={styles.dateControlText}>+1y</Text></TouchableOpacity>
                </View>

                <View style={{ marginTop: 16 }}>
                  <Text style={styles.previewDate}>{dateValue.toDateString()}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.inputLabel}>{modalField?.startsWith('business.') ? 'Value' : 'Value'}</Text>
                <TextInput value={modalValue} onChangeText={setModalValue} style={styles.modalInput} autoFocus />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalSave]} onPress={saveModal}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  containerPad: {
    padding: appTheme.spacing.md,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appTheme.colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: appTheme.colors.textSecondary,
  },
  headerWrap: {
    marginBottom: appTheme.spacing.md,
  },
  headerInner: {
    backgroundColor: appTheme.colors.surface,
    padding: appTheme.spacing.md,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: appTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: appTheme.spacing.sm,
  },
  avatarText: {
    color: appTheme.colors.surface,
    fontWeight: '700',
    fontSize: 20,
  },
  headerActions: {
    marginLeft: 12,
  },
  topLogoutButton: {
    backgroundColor: appTheme.colors.surfaceElevated,
    padding: 8,
    borderRadius: 10,
  },
  headerText: {},
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
  },
  emailText: {
    fontSize: 13,
    color: appTheme.colors.textSecondary,
    marginTop: 4,
  },
  headerActions: {},
  tabBar: {
    marginTop: appTheme.spacing.sm,
    flexDirection: 'row',
    gap: appTheme.spacing.sm,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  tabItemActive: {
    backgroundColor: appTheme.colors.surface,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  tabText: {
    marginTop: 6,
    color: appTheme.colors.muted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: appTheme.colors.primary,
  },
  card: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: 14,
    padding: appTheme.spacing.md,
    marginTop: appTheme.spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
    marginBottom: appTheme.spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.surfaceElevated,
  },
  fieldLabel: {
    color: appTheme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldValue: {
    color: appTheme.colors.textPrimary,
    maxWidth: '75%',
    textAlign: 'right',
    fontSize: 15,
  },
  emptyValue: {
    color: appTheme.colors.muted,
    fontStyle: 'italic',
  },
  editIconWrap: {
    marginLeft: 12,
  },
  bioBox: {
    backgroundColor: appTheme.colors.surfaceElevated,
    padding: appTheme.spacing.sm,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioText: {
    color: appTheme.colors.textSecondary,
    flex: 1,
    marginRight: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: appTheme.colors.surfaceElevated,
    marginVertical: appTheme.spacing.md,
  },
  switchRowModern: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabelModern: {
    color: appTheme.colors.textSecondary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: appTheme.spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  logoutText: {
    marginLeft: 8,
    color: appTheme.colors.primary,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  deleteText: {
    marginLeft: 8,
    color: appTheme.colors.danger,
    fontWeight: '700',
  },
  inputLabel: {
    color: appTheme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: appTheme.colors.textPrimary,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: appTheme.colors.surfaceElevated,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    color: appTheme.colors.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  modalCancel: {
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  modalSave: {
    backgroundColor: appTheme.colors.primary,
  },
  modalCancelText: {
    color: appTheme.colors.textPrimary,
    fontWeight: '700',
  },
  modalSaveText: {
    color: appTheme.colors.surface,
    fontWeight: '800',
  },
  dateControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateControlBtn: {
    backgroundColor: appTheme.colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  dateControlText: {
    color: appTheme.colors.textPrimary,
    fontWeight: '700',
  },
  previewDate: {
    fontSize: 16,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
    textAlign: 'center',
  },
  dangerZoneCard: {
    marginTop: appTheme.spacing.md,
    backgroundColor: appTheme.colors.surfaceElevated,
    padding: appTheme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: appTheme.colors.danger,
    marginBottom: 8,
  },
  dangerText: {
    color: appTheme.colors.textSecondary,
    marginBottom: appTheme.spacing.sm,
  },
  deleteAccountButton: {
    marginTop: appTheme.spacing.sm,
    backgroundColor: appTheme.colors.danger,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteAccountButtonText: {
    color: appTheme.colors.surface,
    fontWeight: '800',
    marginLeft: 8,
  },
});

export default ProfileManagementScreen;
