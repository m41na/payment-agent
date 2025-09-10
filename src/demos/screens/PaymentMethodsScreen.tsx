import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Card, Title, Text, IconButton, FAB, Portal, Dialog, Paragraph } from 'react-native-paper';
import { usePayment } from '../contexts/PaymentContext';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../services/supabase';

const PaymentMethodsScreen = () => {
  const navigation = useNavigation();
  const { paymentMethods, loading, removePaymentMethod, setDefaultPaymentMethod, addPaymentMethod, fetchPaymentMethods } = usePayment();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [addingMethod, setAddingMethod] = useState(false);

  // Fetch payment methods when screen mounts
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleAddPaymentMethod = async () => {
    try {
      setAddingMethod(true);
      
      // Create setup intent via Edge Function for collecting payment method
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to add a payment method');
        return;
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/pg_create-setup-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { client_secret } = await response.json();

      // Initialize payment sheet with setup intent
      const { error: initError } = await initPaymentSheet({
        setupIntentClientSecret: client_secret,
        merchantDisplayName: 'Payment Agent',
        style: 'alwaysDark',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
        return; // User canceled
      }

      // Payment method collection succeeded
      // The webhook will handle saving to database
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
    <Card key={method.id} style={styles.card}>
      <Card.Content>
        <View style={styles.methodHeader}>
          <View style={styles.methodInfo}>
            <Text variant="titleMedium">
              **** **** **** {method.last4}
            </Text>
            <Text variant="bodyMedium" style={styles.methodDetails}>
              {method.brand?.toUpperCase()} • {method.exp_month}/{method.exp_year}
            </Text>
            {method.is_default && (
              <Text variant="bodySmall" style={styles.defaultBadge}>
                Default
              </Text>
            )}
          </View>
          <View style={styles.methodActions}>
            {!method.is_default && (
              <IconButton
                icon="star-outline"
                size={20}
                onPress={() => handleSetDefault(method.id)}
              />
            )}
            <IconButton
              icon="delete-outline"
              size={20}
              onPress={() => confirmDelete(method.id)}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title>Payment Methods</Title>
            <Paragraph>Manage your saved payment methods</Paragraph>
          </Card.Content>
        </Card>

        {paymentMethods.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={styles.emptyState}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No payment methods saved
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Add a payment method to get started
              </Text>
            </Card.Content>
          </Card>
        ) : (
          paymentMethods.map(renderPaymentMethod)
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddPaymentMethod}
        loading={addingMethod}
        disabled={loading || addingMethod}
      />

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Remove Payment Method</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDeletePaymentMethod} loading={loading}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodDetails: {
    color: '#666',
    marginTop: 4,
  },
  defaultBadge: {
    color: '#4caf50',
    fontWeight: 'bold',
    marginTop: 4,
  },
  methodActions: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default PaymentMethodsScreen;
