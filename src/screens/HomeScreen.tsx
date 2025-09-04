import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Card, TextInput, Portal, Modal, RadioButton, List } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';

const HomeScreen = ({ navigation }: any) => {
  const { signOut } = useAuth();
  const { expressCheckout, oneTimePayment, selectiveCheckout, paymentMethods, loading } = usePayment();
  const [amount, setAmount] = useState('10.00');
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');

  const handleExpressCheckout = async () => {
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountCents) || amountCents <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const paymentIntentId = await expressCheckout(amountCents, 'Express checkout payment');
      Alert.alert('Success', `Payment completed! Payment Intent: ${paymentIntentId}`);
    } catch (error) {
      Alert.alert('Payment Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleOneTimePayment = async () => {
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountCents) || amountCents <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      const paymentIntentId = await oneTimePayment(amountCents, 'One-time payment');
      Alert.alert('Success', `Payment completed! Payment Intent: ${paymentIntentId}`);
    } catch (error) {
      Alert.alert('Payment Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSelectiveCheckout = async () => {
    try {
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountCents) || amountCents <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      if (!selectedPaymentMethodId) {
        Alert.alert('Error', 'Please select a payment method');
        return;
      }

      const paymentIntentId = await selectiveCheckout(amountCents, selectedPaymentMethodId, 'Selective checkout payment');
      Alert.alert('Success', `Payment completed! Payment Intent: ${paymentIntentId}`);
    } catch (error) {
      Alert.alert('Payment Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Payment Agent
          </Text>
          
          <Text variant="bodyLarge" style={styles.subtitle}>
            Welcome to your payment dashboard
          </Text>
          
          <TextInput
            label="Amount ($)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          
          <Button
            mode="contained"
            onPress={handleExpressCheckout}
            loading={loading}
            disabled={loading}
            style={[styles.button, styles.expressButton]}
          >
            Express Checkout ${amount}
          </Button>
          
          <Button
            mode="contained"
            onPress={handleOneTimePayment}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            One-Time Payment ${amount}
          </Button>
          
          <Button
            mode="contained"
            onPress={() => setShowPaymentMethodModal(true)}
            style={styles.button}
          >
            Selective Checkout ${amount}
          </Button>
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('PaymentMethods')}
            style={styles.button}
          >
            Manage Payment Methods
          </Button>
          
          <Button
            mode="outlined"
            onPress={signOut}
            style={styles.button}
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>
      <Portal>
        <Modal visible={showPaymentMethodModal} onDismiss={() => setShowPaymentMethodModal(false)} contentContainerStyle={styles.paymentMethodModal}>
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Select Payment Method
              </Text>
              
              <RadioButton.Group
                onValueChange={setSelectedPaymentMethodId}
                value={selectedPaymentMethodId}
              >
                {paymentMethods.map((method) => (
                  <View key={method.id} style={styles.radioItem}>
                    <RadioButton value={method.stripe_payment_method_id} />
                    <View style={styles.paymentMethodDetails}>
                      <Text>**** **** **** {method.last4}</Text>
                      <Text style={styles.subText}>
                        {method.brand?.toUpperCase()} • {method.exp_month}/{method.exp_year}
                        {method.is_default && ' (Default)'}
                      </Text>
                    </View>
                  </View>
                ))}
              </RadioButton.Group>
              
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowPaymentMethodModal(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setShowPaymentMethodModal(false);
                    handleSelectiveCheckout();
                  }}
                  loading={loading}
                  disabled={loading || !selectedPaymentMethodId}
                  style={styles.modalButton}
                >
                  Pay ${amount}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  expressButton: {
    backgroundColor: '#34C759',
  },
  paymentMethodModal: {
    padding: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodDetails: {
    marginLeft: 12,
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    marginRight: 12,
  },
});

export default HomeScreen;
