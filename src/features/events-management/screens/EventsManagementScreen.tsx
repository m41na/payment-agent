import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EventsManagementScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Events</Text>
      <Text style={styles.subtitle}>Discover and manage events</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Events</Text>
        <Text>Events created: 3</Text>
        <Text>Status: Ready</Text>
        <Text>Upcoming: Coffee Meetup (Tomorrow)</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discover Events</Text>
        <Text>• Browse local events</Text>
        <Text>• Create new events</Text>
        <Text>• Manage attendees</Text>
        <Text>• Send event updates</Text>
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

export default EventsManagementScreen;
