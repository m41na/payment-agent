import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, TextInput, Portal, Modal, Title, Chip } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useLocation } from '../contexts/LocationContext';
import { Event } from '../types';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EventCreationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (event: Partial<Event>) => void;
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({ visible, onDismiss, onSave }) => {
  const { location } = useLocation();
  const { user } = useAuth();
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'garage_sale' as Event['event_type'],
    start_date: '',
    end_date: '',
    location_name: '',
    address: '',
    contact_phone: '',
    contact_email: '',
    contact_website: '',
  });
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  const eventTypes = [
    { value: 'garage_sale', label: 'Garage Sale', color: '#ff9800' },
    { value: 'auction', label: 'Auction', color: '#e91e63' },
    { value: 'farmers_market', label: 'Farmers Market', color: '#4caf50' },
    { value: 'flea_market', label: 'Flea Market', color: '#9c27b0' },
    { value: 'estate_sale', label: 'Estate Sale', color: '#795548' },
    { value: 'country_fair', label: 'Country Fair', color: '#ffeb3b' },
    { value: 'craft_fair', label: 'Craft Fair', color: '#00bcd4' },
    { value: 'food_truck', label: 'Food Truck', color: '#ff5722' },
    { value: 'pop_up_shop', label: 'Pop-up Shop', color: '#3f51b5' },
    { value: 'other', label: 'Other', color: '#607d8b' },
  ];

  const handleSave = async () => {
    if (!newEvent.title || !newEvent.start_date || !newEvent.end_date || !location || !user) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (new Date(newEvent.end_date) <= new Date(newEvent.start_date)) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    const event: Partial<Event> = {
      title: newEvent.title,
      description: newEvent.description,
      event_type: newEvent.event_type,
      start_date: newEvent.start_date,
      end_date: newEvent.end_date,
      organizer_id: user.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      location_name: newEvent.location_name,
      address: newEvent.address,
      contact_info: {
        phone: newEvent.contact_phone,
        email: newEvent.contact_email,
        website: newEvent.contact_website,
      },
      tags: [],
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select();

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      onSave(event);
      handleReset();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReset = () => {
    setNewEvent({
      title: '',
      description: '',
      event_type: 'garage_sale',
      start_date: '',
      end_date: '',
      location_name: '',
      address: '',
      contact_phone: '',
      contact_email: '',
      contact_website: '',
    });
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Select date';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString();
  };

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <ScrollView style={styles.modalScrollView}>
          <Card>
            <Card.Content>
              <Title style={styles.modalTitle}>Create New Event</Title>
              
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

              <View style={styles.eventTypeSection}>
                <Text style={styles.sectionLabel}>Event Type *</Text>
                <View style={styles.eventTypeChips}>
                  {eventTypes.map((type) => (
                    <Chip
                      key={type.value}
                      mode={newEvent.event_type === type.value ? 'flat' : 'outlined'}
                      selected={newEvent.event_type === type.value}
                      onPress={() => setNewEvent(prev => ({ ...prev, event_type: type.value as Event['event_type'] }))}
                      style={[
                        styles.eventTypeChip,
                        newEvent.event_type === type.value && { backgroundColor: type.color + '20' }
                      ]}
                      textStyle={newEvent.event_type === type.value ? { color: type.color } : undefined}
                    >
                      {type.label}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.dateSection}>
                <Text style={styles.sectionLabel}>Date & Time *</Text>
                
                <Button
                  mode="outlined"
                  onPress={() => setShowStartCalendar(true)}
                  style={styles.dateButton}
                  icon="calendar"
                >
                  Start: {formatDateForDisplay(newEvent.start_date)}
                </Button>

                <Button
                  mode="outlined"
                  onPress={() => setShowEndCalendar(true)}
                  style={styles.dateButton}
                  icon="calendar"
                >
                  End: {formatDateForDisplay(newEvent.end_date)}
                </Button>
              </View>

              <View style={styles.locationSection}>
                <Text style={styles.sectionLabel}>📍 Location (Auto-detected)</Text>
                {location ? (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationCoords}>
                      {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                    </Text>
                    <TextInput
                      label="Location Name (Optional)"
                      value={newEvent.location_name}
                      onChangeText={(text) => setNewEvent(prev => ({ ...prev, location_name: text }))}
                      style={styles.input}
                      mode="outlined"
                      placeholder="e.g., Community Center, My Home"
                    />
                    <TextInput
                      label="Address (Optional)"
                      value={newEvent.address}
                      onChangeText={(text) => setNewEvent(prev => ({ ...prev, address: text }))}
                      style={styles.input}
                      mode="outlined"
                      placeholder="123 Main St, City, State"
                    />
                  </View>
                ) : (
                  <Text style={styles.locationError}>
                    Location not available. Please enable location services.
                  </Text>
                )}
              </View>

              <View style={styles.contactSection}>
                <Text style={styles.sectionLabel}>Contact Information (Optional)</Text>
                
                <TextInput
                  label="Phone"
                  value={newEvent.contact_phone}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, contact_phone: text }))}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="phone-pad"
                />

                <TextInput
                  label="Email"
                  value={newEvent.contact_email}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, contact_email: text }))}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="email-address"
                />

                <TextInput
                  label="Website"
                  value={newEvent.contact_website}
                  onChangeText={(text) => setNewEvent(prev => ({ ...prev, contact_website: text }))}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="url"
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={onDismiss}
                  style={styles.modalButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  style={styles.modalButton}
                  disabled={!newEvent.title || !newEvent.start_date || !newEvent.end_date || !location || !user}
                >
                  Create Event
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </Modal>

      {/* Start Date Calendar */}
      <Modal
        visible={showStartCalendar}
        onDismiss={() => setShowStartCalendar(false)}
        contentContainerStyle={styles.calendarModal}
      >
        <Card>
          <Card.Content>
            <Title style={styles.calendarTitle}>Select Start Date</Title>
            <Calendar
              onDayPress={(day) => {
                setNewEvent(prev => ({ ...prev, start_date: formatDateForInput(day.dateString) }));
                setShowStartCalendar(false);
              }}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: '#6200ee',
                todayTextColor: '#6200ee',
                arrowColor: '#6200ee',
              }}
            />
          </Card.Content>
        </Card>
      </Modal>

      {/* End Date Calendar */}
      <Modal
        visible={showEndCalendar}
        onDismiss={() => setShowEndCalendar(false)}
        contentContainerStyle={styles.calendarModal}
      >
        <Card>
          <Card.Content>
            <Title style={styles.calendarTitle}>Select End Date</Title>
            <Calendar
              onDayPress={(day) => {
                setNewEvent(prev => ({ ...prev, end_date: formatDateForInput(day.dateString) }));
                setShowEndCalendar(false);
              }}
              minDate={newEvent.start_date ? newEvent.start_date.split('T')[0] : new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: '#6200ee',
                todayTextColor: '#6200ee',
                arrowColor: '#6200ee',
              }}
            />
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '90%',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventTypeSection: {
    marginBottom: 16,
  },
  eventTypeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventTypeChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateButton: {
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  locationSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  locationInfo: {
    marginTop: 8,
  },
  locationCoords: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  locationError: {
    color: '#d32f2f',
    fontStyle: 'italic',
  },
  contactSection: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  calendarModal: {
    margin: 20,
  },
  calendarTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#6200ee',
  },
});

export default EventCreationModal;
