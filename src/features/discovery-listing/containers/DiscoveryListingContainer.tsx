import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocationServicesContext } from '../../../providers/LocationServicesProvider';
import { useShoppingCart } from '../../shopping-cart';
import { supabase } from '../../../services/supabase';
import { Product, Event } from '../../../types';
import DiscoveryListingScreen from '../components/DiscoveryListingScreen';
import { appTheme } from '../../theme';

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
  
  // Search (separate for products & events)
  searchProducts: string;
  onProductsSearchChange: (query: string) => void;
  onProductsSearchSubmit: () => void;

  searchEvents: string;
  onEventsSearchChange: (query: string) => void;
  onEventsSearchSubmit: () => void;

  // View controls (UI-managed per panel)
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
  const [searchProducts, setSearchProducts] = useState('');
  const [searchEvents, setSearchEvents] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isEventModalVisible, setIsEventModalVisible] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleProductsSearchChange = useCallback((q: string) => setSearchProducts(q), []);
  const handleEventsSearchChange = useCallback((q: string) => setSearchEvents(q), []);
  const handleProductsSearchSubmit = useCallback(() => {
    console.log('Products search:', searchProducts);
    // TODO: integrate product search filtering on server or client
  }, [searchProducts]);
  const handleEventsSearchSubmit = useCallback(() => {
    console.log('Events search:', searchEvents);
    // TODO: integrate event search filtering on server or client
  }, [searchEvents]);
  
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
      garage_sale: appTheme.colors.warning,
      auction: appTheme.colors.danger,
      farmers_market: appTheme.colors.success,
      flea_market: appTheme.colors.accent,
      estate_sale: appTheme.colors.textSecondary,
      country_fair: appTheme.colors.warning,
      craft_fair: appTheme.colors.accent,
      food_truck: appTheme.colors.warning,
      pop_up_shop: appTheme.colors.primary,
      other: appTheme.colors.muted,
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

  // Event handlers - route search input to the appropriate search state
  const handleSearchChange = useCallback((query: string) => {
    if (contentType === 'products') setSearchProducts(query);
    else setSearchEvents(query);
  }, [contentType]);

  const handleSearchSubmit = useCallback(() => {
    if (contentType === 'products') {
      console.log('Products search submitted:', searchProducts);
      // TODO: trigger product search/filtering
    } else {
      console.log('Events search submitted:', searchEvents);
      // TODO: trigger event search/filtering
    }
  }, [contentType, searchProducts, searchEvents]);

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
    
    // Search (separate)
    searchProducts,
    onProductsSearchChange: handleProductsSearchChange,
    onProductsSearchSubmit: handleProductsSearchSubmit,

    searchEvents,
    onEventsSearchChange: handleEventsSearchChange,
    onEventsSearchSubmit: handleEventsSearchSubmit,

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
      // searches
      searchProducts={searchProducts}
      onProductsSearchChange={handleProductsSearchChange}
      onProductsSearchSubmit={handleProductsSearchSubmit}
      searchEvents={searchEvents}
      onEventsSearchChange={handleEventsSearchChange}
      onEventsSearchSubmit={handleEventsSearchSubmit}
      // view controls
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
