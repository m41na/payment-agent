import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ navigation }: any) => {
  const { signOut } = useAuth();

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
});

export default HomeScreen;
