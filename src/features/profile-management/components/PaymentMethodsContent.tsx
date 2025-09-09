import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePayment } from '../../payment-processing/hooks/usePayment';
import { appTheme } from '../../theme';

const PaymentMethodsContent: React.FC = () => {
  const { paymentMethods, loading, removePaymentMethod, setDefaultPaymentMethod, fetchPaymentMethods, addPaymentMethodWithSetup } = usePayment();
  
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [addingMethod, setAddingMethod] = useState(false);

  // Fetch payment methods when component mounts
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleAddPaymentMethod = async () => {
    try {
      setAddingMethod(true);
      
      // Use the new payment processing service with setup intent flow
      await addPaymentMethodWithSetup();
      Alert.alert('Success', 'Payment method added successfully!');
      
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setAddingMethod(false);
    }
  };

  const handleDeletePaymentMethod = async () => {
    try {
      await removePaymentMethod(selectedMethodId);
      setDeleteDialogVisible(false);
      setSelectedMethodId('');
      Alert.alert('Success', 'Payment method removed successfully!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove payment method');
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await setDefaultPaymentMethod(methodId);
      Alert.alert('Success', 'Default payment method updated!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update default payment method');
    }
  };

  const confirmDelete = (methodId: string) => {
    setSelectedMethodId(methodId);
    setDeleteDialogVisible(true);
  };

  const renderPaymentMethod = (method: any) => (
    <View key={method.id} style={styles.paymentMethodCard}>
      <View style={styles.paymentMethodInfo}>
        <View style={styles.cardIconContainer}>
          <Ionicons
            name="card"
            size={24}
            color={appTheme.colors.primary}
          />
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.cardBrand}>
            {method.brand?.toUpperCase() || 'CARD'} •••• {method.last4 || '0000'}
          </Text>
          <Text style={styles.cardExpiry}>
            Expires {method.exp_month || '00'}/{method.exp_year || '00'}
          </Text>
          {method.is_default && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.paymentMethodActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleSetDefault(method.id)}>
          <Ionicons name={method.is_default ? 'star' : 'star-outline'} size={20} color={method.is_default ? appTheme.colors.success : appTheme.colors.muted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(method.id)}>
          <Ionicons name="trash-outline" size={18} color={appTheme.colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPaymentMethod}
          disabled={addingMethod}
        >
          {addingMethod ? (
            <ActivityIndicator color={appTheme.colors.surface} size="small" />
          ) : (
            <>
              <Ionicons name="add" size={20} color={appTheme.colors.surface} />
              <Text style={styles.addButtonText}>Add Card</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={48} color={appTheme.colors.muted} />
          <Text style={styles.emptyStateTitle}>No Payment Methods</Text>
          <Text style={styles.emptyStateText}>
            Add a payment method to make purchases and manage subscriptions
          </Text>
        </View>
      ) : (
        <View style={styles.paymentMethodsList}>
          {paymentMethods.map(renderPaymentMethod)}
        </View>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogVisible && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Remove Payment Method</Text>
            <Text style={styles.dialogText}>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => setDeleteDialogVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={handleDeletePaymentMethod}
              >
                <Text style={styles.confirmButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: appTheme.colors.success,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 92,
  },
  addButtonText: {
    fontSize: 13,
    color: appTheme.colors.surface,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentMethodCard: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderColor: appTheme.colors.border,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: appTheme.colors.surface,
  },
  cardDetails: {
    flex: 0.8,
  },
  cardBrand: {
    fontSize: 15,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
  },
  cardExpiry: {
    fontSize: 13,
    color: appTheme.colors.textSecondary,
    marginTop: 2,
  },
  defaultBadge: {
    backgroundColor: appTheme.colors.success,
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 12,
    color: appTheme.colors.surface,
    fontWeight: '600',
  },
  paymentMethodActions: {
    flexDirection: 'column',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginLeft: 8,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: appTheme.colors.surface,
    borderColor: appTheme.colors.border,
    borderWidth: 1,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 13,
    color: appTheme.colors.primary,
    fontWeight: '700',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: appTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodsList: {
    marginTop: 0,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: appTheme.colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: appTheme.colors.textPrimary,
    marginBottom: 8,
  },
  dialogText: {
    fontSize: 14,
    color: appTheme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dialogButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: appTheme.colors.surfaceElevated,
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: appTheme.colors.danger,
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: appTheme.colors.textPrimary,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 14,
    color: appTheme.colors.surface,
    fontWeight: '600',
  },
});

export default PaymentMethodsContent;
