import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocationServicesContext } from '../../../providers/LocationServicesProvider';
import { useShoppingCart } from '../../shopping-cart';
import { supabase } from '../../../services/supabase';
import { Product, Event } from '../../../types';
import DiscoveryListingScreen from '../components/DiscoveryListingScreen';

export interface DiscoveryListingProps {
  // View state
  viewMode: 'map' | 'list' | 'calendar';
  contentType: 'products' | 'events';
  
  // Data
  products: Product[];
  events: Event[];
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  
  // View controls
  onViewModeChange: (mode: 'map' | 'list' | 'calendar') => void;
  onContentTypeChange: (type: 'products' | 'events') => void;
  
  // Actions
  onRefresh: () => void;
  onLoadMore: () => void;
  
  // Calendar specific
  selectedDate: string;
  onDateSelect: (date: string) => void;
  eventsForSelectedDate: Event[];
  getMarkedDates: () => any;
  
  // Event creation
  isEventModalVisible: boolean;
  onShowEventModal: () => void;
  onHideEventModal: () => void;
  onEventCreate: (eventData: any) => void;
  
  // Selection handlers
  onProductSelect: (product: Product) => void;
  onEventSelect: (event: Event) => void;
  
  // Shopping cart
  onAddToCart: (product: Product) => void;
  isAddingToCart: boolean;
  
  // Utility functions
  getEventTypeColor: (eventType: string) => string;
  currentLocation: any;
}

const DiscoveryListingContainer: React.FC = () => {
  const { currentLocation, getCurrentLocation } = useLocationServicesContext();
  const { addToCart, isLoading: cartLoading } = useShoppingCart();
  
  // State management
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'calendar'>('list');
  const [contentType, setContentType] = useState<'products' | 'events'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Request location on mount
  useEffect(() => {
    if (!currentLocation) {
      getCurrentLocation();
    }
  }, [currentLocation]);

  // Load data when content type changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [contentType]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  // Event type colors
  const getEventTypeColor = useCallback((eventType: string) => {
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
  }, []);

  // Get marked dates for calendar
  const getMarkedDates = useCallback(() => {
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
  }, [events, getEventTypeColor]);

  // Get events for selected date
  const getEventsForSelectedDate = useCallback(() => {
    if (!selectedDate) return [];
    return events.filter(event => {
      const eventDate = event.start_date.split('T')[0];
      return eventDate === selectedDate;
    });
  }, [events, selectedDate]);

  // Handle event creation
  const handleEventCreate = useCallback(async (eventData: Partial<Event>) => {
    try {
      const { data, error } = await supabase
        .from('pg_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert('Success', 'Event created successfully!');
      setIsEventModalVisible(false);
      await loadData(); // Refresh the events list
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
  }, [loadData]);

  // Event handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    // TODO: Implement search functionality
    console.log('Search submitted:', searchQuery);
  }, [searchQuery]);

  const handleViewModeChange = useCallback((mode: 'map' | 'list' | 'calendar') => {
    setViewMode(mode);
  }, []);

  const handleContentTypeChange = useCallback((type: 'products' | 'events') => {
    setContentType(type);
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleShowEventModal = useCallback(() => {
    setIsEventModalVisible(true);
  }, []);

  const handleHideEventModal = useCallback(() => {
    setIsEventModalVisible(false);
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    // TODO: Navigate to product details
    console.log('Product selected:', product.id);
  }, []);

  const handleEventSelect = useCallback((event: Event) => {
    // TODO: Navigate to event details
    console.log('Event selected:', event.id);
  }, []);

  /**
   * Handle adding product to cart
   */
  const handleAddToCart = useCallback(async (product: Product) => {
    try {
      setIsAddingToCart(true);
      
      await addToCart({
        product_id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        quantity: 1,
        seller_id: product.seller_id,
        merchant_name: product.seller?.full_name || 'Unknown Seller',
        image_url: product.images?.[0] || null,
        product_condition: product.condition,
      });

      Alert.alert(
        '🛒 Added to Cart!',
        `${product.title} has been added to your cart.`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'View Cart', onPress: () => {
            // TODO: Navigate to cart tab
            console.log('Navigate to cart');
          }}
        ]
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert(
        'Error',
        'Failed to add item to cart. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAddingToCart(false);
    }
  }, [addToCart]);

  const handleLoadMore = useCallback(() => {
    // TODO: Implement pagination
    console.log('Load more requested');
  }, []);

  // Props for dumb component
  const discoveryListingProps: DiscoveryListingProps = {
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
    onSearchChange: handleSearchChange,
    onSearchSubmit: handleSearchSubmit,
    
    // View controls
    onViewModeChange: handleViewModeChange,
    onContentTypeChange: handleContentTypeChange,
    
    // Actions
    onRefresh: handleRefresh,
    onLoadMore: handleLoadMore,
    
    // Calendar specific
    selectedDate,
    onDateSelect: handleDateSelect,
    eventsForSelectedDate: getEventsForSelectedDate(),
    getMarkedDates,
    
    // Event creation
    isEventModalVisible,
    onShowEventModal: handleShowEventModal,
    onHideEventModal: handleHideEventModal,
    onEventCreate: handleEventCreate,
    
    // Selection handlers
    onProductSelect: handleProductSelect,
    onEventSelect: handleEventSelect,
    
    // Shopping cart
    onAddToCart: handleAddToCart,
    isAddingToCart: isAddingToCart || cartLoading,
    
    // Utility functions
    getEventTypeColor,
    currentLocation,
  };

  return (
    <DiscoveryListingScreen
      viewMode={viewMode}
      contentType={contentType}
      products={products}
      events={events}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      onSearchSubmit={handleSearchSubmit}
      onViewModeChange={handleViewModeChange}
      onContentTypeChange={handleContentTypeChange}
      onRefresh={handleRefresh}
      onProductSelect={handleProductSelect}
      onEventSelect={handleEventSelect}
      onShowEventModal={handleShowEventModal}
      onHideEventModal={handleHideEventModal}
      onEventCreate={handleEventCreate}
      onAddToCart={handleAddToCart}
      isAddingToCart={isAddingToCart || cartLoading}
      currentLocation={currentLocation}
    />
  );
};

export default DiscoveryListingContainer;
