import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StorefrontDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Business</Text>
      <Text style={styles.subtitle}>Manage your storefront and business operations</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storefront Overview</Text>
        <Text>Business profile: Demo Coffee Shop</Text>
        <Text>Completion: 75%</Text>
        <Text>Status: Active</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text>• Update business information</Text>
        <Text>• Manage products</Text>
        <Text>• View analytics</Text>
        <Text>• Process orders</Text>
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

export default StorefrontDashboard;
