import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const UserProfileScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Profile</Text>
      <Text style={styles.subtitle}>Manage your account and preferences</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <Text>Name: John Doe</Text>
        <Text>Email: user@example.com</Text>
        <Text>Phone: +1234567890</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <Text>• Notifications: Enabled</Text>
        <Text>• Dark Mode: Disabled</Text>
        <Text>• Language: English</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});

export default UserProfileScreen;
