import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, Card, List, Divider } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = ({ navigation }: any) => {
  const { user, signOut } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Profile
          </Text>
          
          <Text variant="bodyLarge" style={styles.email}>
            {user?.email}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Account Settings
          </Text>
        </Card.Content>
        
        <List.Item
          title="Personal Information"
          description="Update your name and contact details"
          left={(props) => <List.Icon {...props} icon="account-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Navigate to personal info */}}
        />
        
        <Divider />
        
        <List.Item
          title="Payment Methods"
          description="Manage your saved payment methods"
          left={(props) => <List.Icon {...props} icon="credit-card" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.navigate('PaymentMethods')}
        />
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Storefront Settings
          </Text>
        </Card.Content>
        
        <List.Item
          title="Store Customization"
          description="Logo, name, colors, and branding"
          left={(props) => <List.Icon {...props} icon="palette" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Navigate to store customization */}}
        />
        
        <Divider />
        
        <List.Item
          title="Business Information"
          description="Address, hours, contact details"
          left={(props) => <List.Icon {...props} icon="store-edit" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Navigate to business info */}}
        />
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Legal & Privacy
          </Text>
        </Card.Content>
        
        <List.Item
          title="Privacy Statement"
          left={(props) => <List.Icon {...props} icon="shield-account" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Navigate to privacy statement */}}
        />
        
        <Divider />
        
        <List.Item
          title="Terms of Service"
          left={(props) => <List.Icon {...props} icon="file-document" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Navigate to terms of service */}}
        />
        
        <Divider />
        
        <List.Item
          title="Delete Account"
          description="Permanently delete your account"
          left={(props) => <List.Icon {...props} icon="delete-forever" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {/* TODO: Navigate to account deletion */}}
          titleStyle={styles.dangerText}
        />
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="outlined"
            onPress={signOut}
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    textAlign: 'center',
    color: '#666',
  },
  sectionTitle: {
    marginBottom: 8,
  },
  dangerText: {
    color: '#d32f2f',
  },
  signOutButton: {
    marginTop: 8,
  },
});

export default ProfileScreen;
