import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, FAB, Searchbar, SegmentedButtons, IconButton } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useLocation } from '../contexts/LocationContext';
import { Product, Event } from '../types';
import EventCreationModal from '../components/EventCreationModal';
import { supabase } from '../services/supabase';

const ListingScreen = () => {
  const { location, requestLocation } = useLocation();
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'calendar'>('list');
  const [contentType, setContentType] = useState<'products' | 'events'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showEventModal, setShowEventModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) {
      requestLocation();
    }
  }, [location, requestLocation]);

  useEffect(() => {
    loadData();
  }, [contentType]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (contentType === 'products') {
        const { data, error } = await supabase
          .from('pg_products')
          .select('*')
          .eq('is_available', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } else {
        const { data, error } = await supabase
          .from('pg_events')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .order('start_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      garage_sale: '#ff9800',
      auction: '#e91e63',
      farmers_market: '#4caf50',
      flea_market: '#9c27b0',
      estate_sale: '#795548',
      country_fair: '#ffeb3b',
      craft_fair: '#00bcd4',
      food_truck: '#ff5722',
      pop_up_shop: '#3f51b5',
      other: '#607d8b',
    };
    return colors[eventType as keyof typeof colors] || colors.other;
  };

  const getMarkedDates = () => {
    const marked: any = {};
    events.forEach(event => {
      const date = event.start_date.split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: getEventTypeColor(event.event_type),
        activeOpacity: 0.7,
      };
    });
    return marked;
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => {
      const eventDate = event.start_date.split('T')[0];
      return eventDate === date;
    });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <Text variant="titleMedium" style={styles.itemTitle}>{item.title}</Text>
          <Text variant="headlineSmall" style={styles.price}>${item.price}</Text>
        </View>
        <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.itemFooter}>
          <View style={styles.locationInfo}>
            <Text variant="bodySmall" style={styles.location}>
              📍 {item.location_name} • {item.distance}mi
            </Text>
          </View>
          <Chip mode="outlined" style={styles.categoryChip}>
            {item.category}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEvent = ({ item }: { item: Event }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <Text variant="titleMedium" style={styles.itemTitle}>{item.title}</Text>
          <Chip 
            mode="flat" 
            style={[styles.eventTypeChip, { backgroundColor: getEventTypeColor(item.event_type) + '20' }]}
            textStyle={{ color: getEventTypeColor(item.event_type) }}
          >
            {item.event_type.replace('_', ' ').toUpperCase()}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.eventDetails}>
          <Text variant="bodySmall" style={styles.eventTime}>
            📅 {new Date(item.start_date).toLocaleDateString()} • {new Date(item.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text variant="bodySmall" style={styles.location}>
            📍 {item.location_name} • {item.distance}mi
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCalendarView = () => (
    <View style={styles.calendarContainer}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={getMarkedDates()}
        theme={{
          selectedDayBackgroundColor: '#6200ee',
          todayTextColor: '#6200ee',
          arrowColor: '#6200ee',
        }}
      />
      
      {selectedDate && (
        <View style={styles.selectedDateEvents}>
          <Text variant="titleMedium" style={styles.selectedDateTitle}>
            Events on {new Date(selectedDate).toLocaleDateString()}
          </Text>
          <FlatList
            data={getEventsForDate(selectedDate)}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.noEventsText}>No events scheduled for this date</Text>
            }
          />
        </View>
      )}
    </View>
  );

  const renderListView = () => (
    <FlatList
      data={contentType === 'products' ? products : events}
      renderItem={contentType === 'products' ? renderProduct : renderEvent}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No {contentType} found in your area
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Try adjusting your search or location settings
          </Text>
        </View>
      }
    />
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <Text variant="bodyLarge" style={styles.emptyStateText}>
        Map view will be available when location data is loaded
      </Text>
    </View>
  );

  const handleCreateEvent = async (event: Partial<Event>) => {
    try {
      const { data, error } = await supabase
        .from('pg_events')
        .insert([event])
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Event created successfully!');
      setShowEventModal(false);
      loadData(); // Refresh the events list
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder={`Search ${contentType}...`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <SegmentedButtons
          value={contentType}
          onValueChange={(value) => setContentType(value as 'products' | 'events')}
          buttons={[
            { value: 'products', label: 'Products' },
            { value: 'events', label: 'Events' },
          ]}
          style={styles.contentTypeSelector}
        />

        <View style={styles.viewModeSelector}>
          <IconButton
            icon="format-list-bulleted"
            mode={viewMode === 'list' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('list')}
            size={20}
          />
          <IconButton
            icon="map"
            mode={viewMode === 'map' ? 'contained' : 'outlined'}
            onPress={() => setViewMode('map')}
            size={20}
          />
          {contentType === 'events' && (
            <IconButton
              icon="calendar"
              mode={viewMode === 'calendar' ? 'contained' : 'outlined'}
              onPress={() => setViewMode('calendar')}
              size={20}
            />
          )}
        </View>
      </View>

      <View style={styles.content}>
        {viewMode === 'list' && renderListView()}
        {viewMode === 'map' && renderMapView()}
        {viewMode === 'calendar' && contentType === 'events' && renderCalendarView()}
      </View>

      {contentType === 'events' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowEventModal(true)}
          label="Add Event"
        />
      )}

      <EventCreationModal
        visible={showEventModal}
        onDismiss={() => setShowEventModal(false)}
        onSave={handleCreateEvent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 8,
    elevation: 2,
  },
  searchBar: {
    marginBottom: 12,
  },
  contentTypeSelector: {
    marginBottom: 12,
  },
  viewModeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    marginBottom: 12,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    flex: 1,
    fontWeight: 'bold',
    marginRight: 8,
  },
  price: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  description: {
    color: '#666',
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  location: {
    color: '#666',
    fontSize: 12,
  },
  categoryChip: {
    alignSelf: 'flex-end',
  },
  eventTypeChip: {
    alignSelf: 'flex-start',
  },
  eventDetails: {
    marginBottom: 8,
  },
  eventTime: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  selectedDateEvents: {
    flex: 1,
    padding: 16,
  },
  selectedDateTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  noEventsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default ListingScreen;
