import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { Card, Button, TextInput, Portal, Modal, Title, Chip, HelperText } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useLocationServicesContext } from '../../../providers/LocationServicesProvider';
import { Event } from '../../../types';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../user-auth/context/AuthContext';
import PrimaryButton from '../../shared/PrimaryButton';
import { appTheme } from '../../theme';
import BrandLogo from '../../shared/BrandLogo';

interface EventCreationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (event: Event) => void;
}

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

  const [errors, setErrors] = useState<Record<string,string>>({});

  const validate = useCallback(() => {
    const e: Record<string,string> = {};
    if (!newEvent.title.trim()) e.title = 'Title is required';
    if (!newEvent.start_date.trim()) e.start_date = 'Start date/time is required';
    if (!newEvent.end_date.trim()) e.end_date = 'End date/time is required';
    if (!currentLocation) e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [newEvent, currentLocation]);

  const handleSave = async () => {
    if (!validate() || !user) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const eventData = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        event_type: newEvent.event_type,
        start_date: newEvent.start_date,
        end_date: newEvent.end_date,
        organizer_id: user.id,
        latitude: currentLocation?.latitude || null,
        longitude: currentLocation?.longitude || null,
        location_name: newEvent.location_name || null,
        address: newEvent.address || null,
        contact_info: {
          email: newEvent.contact_email || null,
          phone: newEvent.contact_phone || null,
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
        Alert.alert('Error', 'Failed to create event.');
        return;
      }

      onSave?.(data);
      handleReset();
      onDismiss();
      Alert.alert('Success', 'Event created successfully!');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create event.');
    }
  };

  const handleReset = () => setNewEvent({
    title: '', description: '', event_type: 'workshop', start_date: '', end_date: '', location_name: '', address: '', contact_email: '', contact_phone: ''
  });

  const handleCancel = () => { handleReset(); onDismiss(); };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleCancel} contentContainerStyle={styles.modalContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <BrandLogo size={48} />
              <Title style={styles.title}>Create Event</Title>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

              <TextInput
                label="Title"
                value={newEvent.title}
                onChangeText={(t) => setNewEvent(prev => ({ ...prev, title: t }))}
                mode="outlined"
                style={styles.input}
                error={!!errors.title}
              />
              <HelperText type="error" visible={!!errors.title}>{errors.title}</HelperText>

              <TextInput
                label="Description"
                value={newEvent.description}
                onChangeText={(t) => setNewEvent(prev => ({ ...prev, description: t }))}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.chipsRow}>
                {eventTypes.map((et) => (
                  <Chip key={et.value} mode={newEvent.event_type === et.value ? 'flat' : 'outlined'} onPress={() => setNewEvent(prev => ({ ...prev, event_type: et.value }))} style={styles.chip}>{et.label}</Chip>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Date & Time</Text>
              <TextInput
                label="Start (YYYY-MM-DD HH:MM)"
                value={newEvent.start_date}
                onChangeText={(t) => setNewEvent(prev => ({ ...prev, start_date: t }))}
                mode="outlined"
                style={styles.input}
                error={!!errors.start_date}
              />
              <HelperText type="error" visible={!!errors.start_date}>{errors.start_date}</HelperText>

              <TextInput
                label="End (YYYY-MM-DD HH:MM)"
                value={newEvent.end_date}
                onChangeText={(t) => setNewEvent(prev => ({ ...prev, end_date: t }))}
                mode="outlined"
                style={styles.input}
                error={!!errors.end_date}
              />
              <HelperText type="error" visible={!!errors.end_date}>{errors.end_date}</HelperText>

              <Text style={styles.sectionLabel}>Location</Text>
              {currentLocation ? (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationCoords}>{currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</Text>
                  <TextInput label="Location Name" value={newEvent.location_name} onChangeText={(t) => setNewEvent(prev => ({ ...prev, location_name: t }))} mode="outlined" style={styles.input} />
                  <TextInput label="Address" value={newEvent.address} onChangeText={(t) => setNewEvent(prev => ({ ...prev, address: t }))} mode="outlined" style={styles.input} />
                </View>
              ) : (
                <Text style={styles.noLocationText}>Location not available. Enable location services.</Text>
              )}

              <Text style={styles.sectionLabel}>Contact</Text>
              <TextInput label="Contact Email" value={newEvent.contact_email} onChangeText={(t) => setNewEvent(prev => ({ ...prev, contact_email: t }))} mode="outlined" style={styles.input} keyboardType="email-address" />
              <TextInput label="Contact Phone" value={newEvent.contact_phone} onChangeText={(t) => setNewEvent(prev => ({ ...prev, contact_phone: t }))} mode="outlined" style={styles.input} keyboardType="phone-pad" />

            </ScrollView>

            <View style={styles.actionsRow}>
              <Button mode="outlined" onPress={handleCancel} style={styles.actionButton}>Cancel</Button>
              <PrimaryButton onPress={handleSave} style={styles.actionButton}>Create Event</PrimaryButton>
            </View>

          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { maxHeight: '90%', borderRadius: 12, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: appTheme.colors.textPrimary },
  scrollView: { maxHeight: 520 },
  input: { marginBottom: 12, backgroundColor: appTheme.colors.surface },
  fieldLabel: { fontSize: 14, color: appTheme.colors.textSecondary, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 8 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: appTheme.colors.textPrimary, marginTop: 8, marginBottom: 8 },
  locationInfo: { backgroundColor: appTheme.colors.surfaceElevated, padding: 12, borderRadius: 8, marginBottom: 12 },
  locationCoords: { fontSize: 12, color: appTheme.colors.textSecondary, marginBottom: 8, fontFamily: 'monospace' },
  noLocationText: { color: appTheme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: 20 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 12 },
  actionButton: { flex: 1 },
});

export default EventCreationModal;
