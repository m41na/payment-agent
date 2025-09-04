import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, Card, TextInput } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { usePayment } from '../contexts/PaymentContext';

const HomeScreen = ({ navigation }: any) => {
  const { signOut } = useAuth();
  const { expressCheckout, loading } = usePayment();
  const [amount, setAmount] = useState('10.00');

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
            onPress={() => navigation.navigate('PaymentMethods')}
            style={styles.button}
          >
            Manage Payment Methods
          </Button>
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Checkout')}
            style={styles.button}
          >
            Make Payment
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
});

export default HomeScreen;
