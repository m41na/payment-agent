import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { 
  Card, 
  Button, 
  Chip, 
  FAB, 
  Searchbar, 
  SegmentedButtons, 
  IconButton 
} from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { DiscoveryListingProps } from '../containers/DiscoveryListingContainer';
import { Product, Event } from '../../../types';

const DiscoveryListingScreen: React.FC<DiscoveryListingProps> = ({
  // View state
  viewMode,
  contentType,
  
  // Data
  products,
  events,
  
  // Loading states
  isLoading,
  isRefreshing,
  
  // Search
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  
  // View controls
  onViewModeChange,
  onContentTypeChange,
  
  // Actions
  onRefresh,
  onLoadMore,
  
  // Calendar specific
  selectedDate,
  onDateSelect,
  eventsForSelectedDate,
  getMarkedDates,
  
  // Event creation
  isEventModalVisible,
  onShowEventModal,
  onHideEventModal,
  onEventCreate,
  
  // Selection handlers
  onProductSelect,
  onEventSelect,
  
  // Shopping cart
  onAddToCart,
  isAddingToCart,
  
  // Utility functions
  getEventTypeColor,
}) => {

  // Filter data based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      (product.location_name && product.location_name.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.event_type.toLowerCase().includes(query) ||
      (event.location_name && event.location_name.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  // Render product item
  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <Card style={styles.itemCard}>
      <TouchableOpacity onPress={() => onProductSelect(item)}>
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
                📍 {item.location_name} • {item.distance || 0}mi
              </Text>
            </View>
            <Chip mode="outlined" style={styles.categoryChip}>
              {item.category}
            </Chip>
          </View>
        </Card.Content>
      </TouchableOpacity>
      
      {/* Add to Cart Button */}
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={() => onAddToCart(item)}
          loading={isAddingToCart}
          disabled={isAddingToCart}
          icon="cart-plus"
          style={styles.addToCartButton}
          contentStyle={styles.addToCartButtonContent}
        >
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </Button>
      </Card.Actions>
    </Card>
  ), [onProductSelect, onAddToCart, isAddingToCart]);

  // Render event item
  const renderEvent = useCallback(({ item }: { item: Event }) => (
    <TouchableOpacity onPress={() => onEventSelect(item)}>
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
              📍 {item.location_name} • {item.distance || 0}mi
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  ), [onEventSelect, getEventTypeColor]);

  // Render calendar view
  const renderCalendarView = useCallback(() => (
    <View style={styles.calendarContainer}>
      <Calendar
        onDayPress={(day) => onDateSelect(day.dateString)}
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
            data={eventsForSelectedDate}
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
  ), [selectedDate, onDateSelect, getMarkedDates, eventsForSelectedDate, renderEvent]);

  // Render list view
  const renderListView = useCallback(() => (
    <FlatList
      data={contentType === 'products' ? filteredProducts : filteredEvents}
      renderItem={contentType === 'products' ? renderProduct : renderEvent}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
        />
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.1}
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
      ListFooterComponent={
        isLoading ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator size="small" />
          </View>
        ) : null
      }
    />
  ), [
    contentType, 
    filteredProducts, 
    filteredEvents, 
    renderProduct, 
    renderEvent, 
    isRefreshing, 
    onRefresh, 
    onLoadMore, 
    isLoading
  ]);

  // Render map view
  const renderMapView = useCallback(() => (
    <View style={styles.mapContainer}>
      <Text variant="bodyLarge" style={styles.emptyStateText}>
        Map view will be available when location data is loaded
      </Text>
      <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
        OpenStreetView integration coming soon
      </Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder={`Search ${contentType}...`}
          onChangeText={onSearchChange}
          value={searchQuery}
          onSubmitEditing={onSearchSubmit}
          style={styles.searchBar}
        />
        
        <SegmentedButtons
          value={contentType}
          onValueChange={(value) => onContentTypeChange(value as 'products' | 'events')}
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
            onPress={() => onViewModeChange('list')}
            size={20}
          />
          <IconButton
            icon="map"
            mode={viewMode === 'map' ? 'contained' : 'outlined'}
            onPress={() => onViewModeChange('map')}
            size={20}
          />
          {contentType === 'events' && (
            <IconButton
              icon="calendar"
              mode={viewMode === 'calendar' ? 'contained' : 'outlined'}
              onPress={() => onViewModeChange('calendar')}
              size={20}
            />
          )}
        </View>
      </View>

      <View style={styles.content}>
        {isLoading && !isRefreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading {contentType}...</Text>
          </View>
        )}
        
        {!isLoading && (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'map' && renderMapView()}
            {viewMode === 'calendar' && contentType === 'events' && renderCalendarView()}
          </>
        )}
      </View>

      {contentType === 'events' && (
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={onShowEventModal}
          label="Add Event"
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingFooter: {
    padding: 16,
    alignItems: 'center',
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
  cardActions: {
    justifyContent: 'flex-end',
  },
  addToCartButton: {
    width: '100%',
    justifyContent: 'center',
  },
  addToCartButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});

export default DiscoveryListingScreen;
