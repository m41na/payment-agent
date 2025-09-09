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
            color="#667eea" 
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
        {!method.is_default && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSetDefault(method.id)}
          >
            <Text style={styles.actionButtonText}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => confirmDelete(method.id)}
        >
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
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
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Card</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {paymentMethods.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="card-outline" size={48} color="#94a3b8" />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentMethodCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderColor: '#e2e8f0',
    borderWidth: 1,
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
    backgroundColor: '#f1f5f9',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 16,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cardExpiry: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodsList: {
    marginTop: 8,
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  dialogText: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#ef4444',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600',
  },
});

export default PaymentMethodsContent;
