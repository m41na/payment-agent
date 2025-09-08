import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Modal, Title, Chip } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useLocationServicesContext } from '../../../providers/LocationServicesProvider';
import { Event } from '../../../types';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../user-auth/context/AuthContext';

interface EventCreationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (event: Event) => void;
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({ visible, onDismiss, onSave }) => {
  const { currentLocation } = useLocationServicesContext();
  const { user } = useAuth();
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'workshop',
    start_date: '',
    end_date: '',
    location_name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
  });

  const eventTypes = [
    { label: 'Workshop', value: 'workshop' },
    { label: 'Seminar', value: 'seminar' },
    { label: 'Conference', value: 'conference' },
    { label: 'Networking', value: 'networking' },
    { label: 'Training', value: 'training' },
    { label: 'Meetup', value: 'meetup' },
    { label: 'Exhibition', value: 'exhibition' },
    { label: 'Other', value: 'other' },
  ];

  const handleSave = async () => {
    if (!newEvent.title || !newEvent.start_date || !newEvent.end_date || !currentLocation || !user) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        event_type: newEvent.event_type,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date,
        organizer_id: user.id,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        location_name: newEvent.location_name,
        address: newEvent.address,
        contact_info: {
          email: newEvent.contact_email,
          phone: newEvent.contact_phone,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('pg_events')
        .insert([eventData])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        Alert.alert('Error', 'Failed to create event. Please try again.');
        return;
      }

      onSave(data);
      handleReset();
      onDismiss();
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  };

  const handleReset = () => {
    setNewEvent({
      title: '',
      description: '',
      event_type: 'workshop',
      start_date: '',
      end_date: '',
      location_name: '',
      address: '',
      contact_email: '',
      contact_phone: '',
    });
  };

  const handleCancel = () => {
    handleReset();
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.modalCard}>
          <Card.Content>
            <Title style={styles.modalTitle}>Create New Event</Title>
            
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>📝 Event Details</Text>
                
                <TextInput
                  label="Event Title *"
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Description"
                  value={newEvent.description}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.fieldLabel}>Event Type</Text>
                <View style={styles.chipContainer}>
                  {eventTypes.map((type) => (
                    <Chip
                      key={type.value}
                      selected={newEvent.event_type === type.value}
                      onPress={() => setNewEvent(prev => ({ ...prev, event_type: type.value }))}
                      style={styles.chip}
                    >
                      {type.label}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>📅 Date & Time</Text>
                
                <TextInput
                  label="Start Date & Time *"
                  value={newEvent.start_date}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, start_date: text }))}
                  style={styles.input}
                  mode="outlined"
                  placeholder="YYYY-MM-DD HH:MM"
                />

                <TextInput
                  label="End Date & Time *"
                  value={newEvent.end_date}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, end_date: text }))}
                  style={styles.input}
                  mode="outlined"
                  placeholder="YYYY-MM-DD HH:MM"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>📍 Location (Auto-detected)</Text>
                {currentLocation ? (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationCoords}>
                      {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </Text>
                    <TextInput
                      label="Location Name (Optional)"
                      value={newEvent.location_name}
                      onChangeText={(text) => setNewEvent(prev => ({ ...prev, location_name: text }))}
                      style={styles.input}
                      mode="outlined"
                    />
                    <TextInput
                      label="Address (Optional)"
                      value={newEvent.address}
                      onChangeText={(text) => setNewEvent(prev => ({ ...prev, address: text }))}
                      style={styles.input}
                      mode="outlined"
                    />
                  </View>
                ) : (
                  <Text style={styles.noLocationText}>
                    Location not available. Please enable location services.
                  </Text>
                )}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>📞 Contact Information</Text>
                
                <TextInput
                  label="Contact Email"
                  value={newEvent.contact_email}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, contact_email: text }))}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="email-address"
                />

                <TextInput
                  label="Contact Phone"
                  value={newEvent.contact_phone}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, contact_phone: text }))}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={[styles.modalButton, styles.cancelButton]}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                onPress={handleSave}
                style={styles.modalButton}
                disabled={!newEvent.title || !newEvent.start_date || !newEvent.end_date || !currentLocation || !user}
              >
                Create Event
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxHeight: '90%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: 500,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
    color: '#666',
  },
  input: {
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  locationInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  noLocationText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    borderColor: '#ccc',
  },
});

export default EventCreationModal;
