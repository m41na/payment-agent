import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useInventory } from '../../inventory-management';
import { usePayment } from '../../payment-processing';
import { useLocation } from '../../location-services';
import { useAuth } from '../../../shared/auth/AuthContext';
import { supabase } from '../../../shared/data/supabase';
import { Event } from '../../events-management/types';
import StorefrontScreen from '../components/StorefrontScreen';

export interface StorefrontProps {
  // Tab state
  selectedTab: 'products' | 'events' | 'transactions';
  onTabChange: (tab: 'products' | 'events' | 'transactions') => void;

  // Stats
  stats: {
    totalRevenue: number;
    todayRevenue: number;
    totalSales: number;
    activeProducts: number;
  };

  // Products
  products: any[];
  loadingProducts: boolean;
  onAddProduct: () => void;
  onEditProduct: (product: any) => void;
  onDeleteProduct: (product: any) => void;
  onToggleProductAvailability: (product: any) => void;
  onRefreshProducts: () => void;

  // Events
  events: Event[];
  loadingEvents: boolean;
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (event: Event) => void;
  onRefreshEvents: () => void;

  // Transactions
  transactions: any[];
  loadingTransactions: boolean;
  onRefreshTransactions: () => void;

  // Modals
  showProductModal: boolean;
  showEventModal: boolean;
  editingProduct: any;
  editingEvent: Event | null;
  onHideProductModal: () => void;
  onHideEventModal: () => void;
  onCreateProduct: (productData: any) => void;
  onUpdateProduct: (productData: any) => void;
  onCreateEvent: (eventData: any) => void;
  onUpdateEvent: (eventData: any) => void;

  // Location
  location: any;
}

const StorefrontContainer: React.FC = () => {
  const { currentLocation: location } = useLocation();
  const { user } = useAuth();

  // Use new feature hooks only
  const { 
    products, 
    loading: loadingProducts, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    toggleProductAvailability,
    refreshProducts 
  } = useInventory();
  
  const { 
    transactions, 
    loading: loadingTransactions, 
    fetchTransactions 
  } = usePayment();

  // Events management - direct state instead of hook
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Load events directly like old StorefrontScreen
  const loadEvents = useCallback(async () => {
    if (!user) return;
    
    setLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('pg_events')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load events');
    } finally {
      setLoadingEvents(false);
    }
  }, [user]);

  // Event CRUD operations
  const createEvent = useCallback(async (eventData: any) => {
    try {
      const { error } = await supabase
        .from('pg_events')
        .insert([{ ...eventData, seller_id: user!.id }]);
      
      if (error) throw error;
      Alert.alert('Success', 'Event created!');
      loadEvents();
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
    }
  }, [user, loadEvents]);

  const updateEvent = useCallback(async (id: string, eventData: any) => {
    try {
      const { error } = await supabase
        .from('pg_events')
        .update(eventData)
        .eq('id', id);
      
      if (error) throw error;
      Alert.alert('Success', 'Event updated!');
      loadEvents();
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
    }
  }, [loadEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('pg_events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      Alert.alert('Success', 'Event deleted');
      loadEvents();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete event');
    }
  }, [loadEvents]);

  const refreshEvents = useCallback(() => {
    loadEvents();
  }, [loadEvents]);

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // State management
  const [selectedTab, setSelectedTab] = useState<'products' | 'events' | 'transactions'>('products');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Load transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 100;
    const today = new Date().toDateString();
    const todayRevenue = transactions
      .filter(t => new Date(t.created_at).toDateString() === today)
      .reduce((sum, t) => sum + (t.amount || 0), 0) / 100;
    const totalSales = transactions.filter(t => t.status === 'completed').length;
    const activeProducts = products.filter(p => p.is_available).length;

    return {
      totalRevenue,
      todayRevenue,
      totalSales,
      activeProducts
    };
  }, [transactions, products]);

  // Product handlers
  const handleAddProduct = useCallback(() => {
    setEditingProduct(null);
    setShowProductModal(true);
  }, []);

  const handleEditProduct = useCallback((product: any) => {
    setEditingProduct(product);
    setShowProductModal(true);
  }, []);

  const handleDeleteProduct = useCallback(async (product: any) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  }, [deleteProduct]);

  const handleToggleProductAvailability = useCallback(async (product: any) => {
    try {
      await toggleProductAvailability(product.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to update product availability');
    }
  }, [toggleProductAvailability]);

  const handleCreateProduct = useCallback(async (productData: any) => {
    try {
      await createProduct({
        ...productData,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || 'Current Location'
        } : null
      });
      setShowProductModal(false);
      Alert.alert('Success', 'Product created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create product');
    }
  }, [createProduct, location]);

  const handleUpdateProduct = useCallback(async (productData: any) => {
    try {
      await updateProduct(editingProduct.id, productData);
      setShowProductModal(false);
      setEditingProduct(null);
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update product');
    }
  }, [updateProduct, editingProduct]);

  // Event handlers
  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setShowEventModal(true);
  }, []);

  const handleEditEvent = useCallback((event: Event) => {
    setEditingEvent(event);
    setShowEventModal(true);
  }, []);

  const handleDeleteEvent = useCallback(async (event: Event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              Alert.alert('Success', 'Event deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  }, [deleteEvent]);

  const handleCreateEvent = useCallback(async (eventData: any) => {
    try {
      await createEvent({
        ...eventData,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || 'Current Location'
        } : null
      });
      setShowEventModal(false);
      Alert.alert('Success', 'Event created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create event');
    }
  }, [createEvent, location]);

  const handleUpdateEvent = useCallback(async (eventData: any) => {
    try {
      await updateEvent(editingEvent!.id, eventData);
      setShowEventModal(false);
      setEditingEvent(null);
      Alert.alert('Success', 'Event updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
    }
  }, [updateEvent, editingEvent]);

  // Modal handlers
  const handleHideProductModal = useCallback(() => {
    setShowProductModal(false);
    setEditingProduct(null);
  }, []);

  const handleHideEventModal = useCallback(() => {
    setShowEventModal(false);
    setEditingEvent(null);
  }, []);

  // Refresh handlers
  const handleRefreshProducts = useCallback(() => {
    refreshProducts();
  }, [refreshProducts]);

  const handleRefreshEvents = useCallback(() => {
    refreshEvents();
  }, [refreshEvents]);

  const handleRefreshTransactions = useCallback(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Props for dumb component
  const storefrontProps: StorefrontProps = {
    // Tab state
    selectedTab,
    onTabChange: setSelectedTab,

    // Stats
    stats,

    // Products
    products,
    loadingProducts,
    onAddProduct: handleAddProduct,
    onEditProduct: handleEditProduct,
    onDeleteProduct: handleDeleteProduct,
    onToggleProductAvailability: handleToggleProductAvailability,
    onRefreshProducts: handleRefreshProducts,

    // Events
    events,
    loadingEvents,
    onAddEvent: handleAddEvent,
    onEditEvent: handleEditEvent,
    onDeleteEvent: handleDeleteEvent,
    onRefreshEvents: handleRefreshEvents,

    // Transactions
    transactions,
    loadingTransactions,
    onRefreshTransactions: handleRefreshTransactions,

    // Modals
    showProductModal,
    showEventModal,
    editingProduct,
    editingEvent,
    onHideProductModal: handleHideProductModal,
    onHideEventModal: handleHideEventModal,
    onCreateProduct: handleCreateProduct,
    onUpdateProduct: handleUpdateProduct,
    onCreateEvent: handleCreateEvent,
    onUpdateEvent: handleUpdateEvent,

    // Location
    location
  };

  return <StorefrontScreen {...storefrontProps} />;
};

export default StorefrontContainer;
