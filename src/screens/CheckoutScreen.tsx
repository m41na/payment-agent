import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Card, Title, Paragraph, RadioButton, Text, TextInput, Divider } from 'react-native-paper';
import { usePayment } from '../contexts/PaymentContext';
import { useNavigation } from '@react-navigation/native';

const CheckoutScreen = () => {
  const navigation = useNavigation();
  const { paymentMethods, processPayment, loading } = usePayment();
  
  const [paymentFlow, setPaymentFlow] = useState<'express' | 'selective' | 'one-time'>('express');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [amount, setAmount] = useState('10.00');
  const [description, setDescription] = useState('Test Payment');

  const defaultPaymentMethod = paymentMethods.find(pm => pm.is_default);

  const handlePayment = async () => {
    try {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      let paymentMethodId: string | undefined;

      switch (paymentFlow) {
        case 'express':
          // Use default payment method
          paymentMethodId = defaultPaymentMethod?.stripe_payment_method_id;
          if (!paymentMethodId) {
            Alert.alert('Error', 'No default payment method found. Please add a payment method first.');
            return;
          }
          break;
        case 'selective':
          // Use selected payment method
          const selectedMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
          paymentMethodId = selectedMethod?.stripe_payment_method_id;
          if (!paymentMethodId) {
            Alert.alert('Error', 'Please select a payment method');
            return;
          }
          break;
        case 'one-time':
          // Don't pass payment method ID - will prompt for new card
          paymentMethodId = undefined;
          break;
      }

      const paymentIntentId = await processPayment(paymentAmount, description, paymentMethodId);
      
      Alert.alert(
        'Payment Successful!',
        `Payment completed with ID: ${paymentIntentId}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Payment Failed', error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const renderExpressFlow = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Express Checkout</Title>
        <Paragraph>Pay with your default payment method</Paragraph>
        {defaultPaymentMethod ? (
          <View style={styles.paymentMethodInfo}>
            <Text>Default: **** **** **** {defaultPaymentMethod.last4}</Text>
            <Text>{defaultPaymentMethod.brand?.toUpperCase()} • {defaultPaymentMethod.exp_month}/{defaultPaymentMethod.exp_year}</Text>
          </View>
        ) : (
          <Text style={styles.errorText}>No default payment method found</Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderSelectiveFlow = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Choose Payment Method</Title>
        <Paragraph>Select from your saved payment methods</Paragraph>
        {paymentMethods.length > 0 ? (
          <RadioButton.Group
            onValueChange={setSelectedPaymentMethod}
            value={selectedPaymentMethod}
          >
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.radioItem}>
                <RadioButton value={method.id} />
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
        ) : (
          <Text style={styles.errorText}>No saved payment methods found</Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderOneTimeFlow = () => (
    <Card style={styles.card}>
      <Card.Content>
        <Title>One-Time Payment</Title>
        <Paragraph>Enter payment details (card will not be saved)</Paragraph>
        <Text style={styles.infoText}>
          You'll be prompted to enter your card details during checkout
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Payment Details</Title>
          <TextInput
            label="Amount ($)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Payment Flow</Title>
          <RadioButton.Group
            onValueChange={(value) => setPaymentFlow(value as any)}
            value={paymentFlow}
          >
            <View style={styles.radioItem}>
              <RadioButton value="express" />
              <Text>Express Checkout (Default Payment Method)</Text>
            </View>
            <View style={styles.radioItem}>
              <RadioButton value="selective" />
              <Text>Choose Payment Method</Text>
            </View>
            <View style={styles.radioItem}>
              <RadioButton value="one-time" />
              <Text>One-Time Payment (Don't Save Card)</Text>
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      {paymentFlow === 'express' && renderExpressFlow()}
      {paymentFlow === 'selective' && renderSelectiveFlow()}
      {paymentFlow === 'one-time' && renderOneTimeFlow()}

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handlePayment}
          loading={loading}
          disabled={loading || (paymentFlow === 'express' && !defaultPaymentMethod) || (paymentFlow === 'selective' && !selectedPaymentMethod)}
          style={styles.payButton}
        >
          Pay ${amount}
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  paymentMethodInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  paymentMethodDetails: {
    marginLeft: 8,
    flex: 1,
  },
  subText: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    marginTop: 8,
  },
  infoText: {
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 16,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  payButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  cancelButton: {
    paddingVertical: 8,
  },
});

export default CheckoutScreen;
