import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  List, 
  ActivityIndicator, 
  Chip,
  IconButton,
  Divider 
} from 'react-native-paper';
import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from '../../../services/supabase';
import { PaymentMethodsScreenProps, PaymentMethod } from '../types';
import { appTheme } from '../../theme';

const PaymentMethodsScreen: React.FC<PaymentMethodsScreenProps> = ({
  paymentMethods,
  loading,
  onAddPaymentMethod,
  onRemovePaymentMethod,
  onSetDefaultPaymentMethod,
  onRefreshPaymentMethods,
  onSelectPaymentMethod,
}) => {
  const [addingMethod, setAddingMethod] = useState(false);

  const handleAddPaymentMethod = async () => {
    try {
      setAddingMethod(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to add payment methods');
        return;
      }

      // Create setup intent for collecting payment method
      const { data, error } = await supabase.functions.invoke('pg_create-setup-intent', {
        body: { customer_id: user.id }
      });

      if (error) throw error;

      const { client_secret } = data;

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: client_secret,
        merchantDisplayName: 'Payment Agent',
        style: 'alwaysDark',
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        return;
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Error', presentError.message);
        }
        return;
      }

      // Payment method was successfully added via webhook
      // Refresh the list
      onRefreshPaymentMethods();
      Alert.alert('Success', 'Payment method added successfully!');

    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add payment method');
    } finally {
      setAddingMethod(false);
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await onRemovePaymentMethod(id);
              Alert.alert('Success', 'Payment method removed successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to remove payment method');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (id: string) => {
    try {
      await onSetDefaultPaymentMethod(id);
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update default payment method');
    }
  };

  const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
    <Card style={styles.paymentMethodCard}>
      <Card.Content>
        <View style={styles.paymentMethodHeader}>
          <View style={styles.paymentMethodInfo}>
            <Text variant="titleMedium">
              •••• •••• •••• {item.last4}
            </Text>
            <Text variant="bodySmall" style={styles.brandText}>
              {item.brand?.toUpperCase()} • Expires {item.exp_month}/{item.exp_year}
            </Text>
          </View>
          <View style={styles.paymentMethodActions}>
            {item.is_default && (
              <Chip mode="flat" compact style={styles.defaultChip}>
                Default
              </Chip>
            )}
            {onSelectPaymentMethod ? (
              <Button
                mode="contained"
                compact
                onPress={() => onSelectPaymentMethod(item.id)}
                style={{ marginRight: 8 }}
              >
                Use
              </Button>
            ) : (
              <IconButton
                icon="delete"
                size={20}
                iconColor={appTheme.colors.danger}
                onPress={() => handleRemovePaymentMethod(item.id)}
              />
            )}
          </View>
        </View>

        {!item.is_default && !onSelectPaymentMethod && (
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              compact
              onPress={() => handleSetDefault(item.id)}
              style={styles.setDefaultButton}
            >
              Set as Default
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator animating={true} size="large" />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Loading payment methods...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Payment Methods
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Manage your saved payment methods
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={handleAddPaymentMethod}
        loading={addingMethod}
        disabled={addingMethod}
        style={styles.addButton}
        icon="plus"
      >
        {addingMethod ? 'Adding...' : 'Add Payment Method'}
      </Button>

      {paymentMethods.length === 0 ? (
        <Card style={styles.emptyState}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.emptyStateText}>
              💳 No payment methods
            </Text>
            <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
              Add a payment method to make purchases easier
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <FlatList
          data={paymentMethods}
          renderItem={renderPaymentMethod}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.paymentMethodsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.surfaceElevated,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    color: appTheme.colors.textSecondary,
  },
  header: {
    padding: 16,
    backgroundColor: appTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.border,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: appTheme.colors.textSecondary,
  },
  addButton: {
    margin: 16,
    backgroundColor: appTheme.colors.primary,
  },
  paymentMethodsList: {
    paddingHorizontal: 16,
  },
  paymentMethodCard: {
    marginBottom: 12,
    elevation: 2,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  brandText: {
    color: appTheme.colors.textSecondary,
    marginTop: 4,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  defaultChip: {
    backgroundColor: appTheme.colors.surfaceElevated,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  setDefaultButton: {
    borderColor: appTheme.colors.primary,
  },
  emptyState: {
    margin: 16,
    marginTop: 60,
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 8,
    color: appTheme.colors.textSecondary,
  },
  emptyStateSubtext: {
    textAlign: 'center',
    color: appTheme.colors.muted,
  },
});

export default PaymentMethodsScreen;
