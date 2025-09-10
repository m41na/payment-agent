import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, View, Text } from 'react-native';
import { useInventory } from '../../inventory-management/hooks/useInventory';
import { usePayment } from '../../payment-processing';
import { useLocation } from '../../location-services';
import { useAuth } from '../../../features/user-auth/context/AuthContext';
import { supabase } from '../../../services/supabase';
import { Event } from '../../events-management/types';
import StorefrontScreen from '../components/StorefrontScreen';
import { useFocusEffect } from '@react-navigation/native';
import MerchantPlanPurchaseModal from '../../merchant-onboarding/components/MerchantPlanPurchaseModal';
import MerchantOnboardingContainer from '../../merchant-onboarding/containers/MerchantOnboardingContainer';
import { useSubscription as useSubscriptionHook } from '../../payment-processing/hooks/useSubscription';

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

  // Subscription hook (used to determine merchant status and purchases)
  const subscription = useSubscriptionHook();

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

  // When the storefront tab is focused, check if user needs to purchase a merchant plan
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const checkMerchantStatus = async () => {
        if (!user) return;
        try {
          const { data: profile } = await supabase
            .from('pg_profiles')
            .select('subscription_status, merchant_status, current_plan_id')
            .eq('user_id', user.id)
            .single();

          if (!mounted) return;

          const needsMerchantPlan = profile &&
            profile.subscription_status === 'none' &&
            profile.merchant_status === 'none' &&
            (profile.current_plan_id === null || profile.current_plan_id === undefined);

          if (needsMerchantPlan) {
            // Fetch plans and present modal
            await subscription.refreshPlans();
            const plans = subscription.subscriptionPlans || [];
            setSelectedPlan(plans[0] || null);
            setShowPlanModal(true);
          }
        } catch (err) {
          // Ignore silently
          console.error('Error checking merchant status:', err);
        }
      };

      checkMerchantStatus();
      return () => { mounted = false; };
    }, [user, subscription])
  );

  // When subscription status updates (e.g. user purchased a plan), open onboarding if needed
  React.useEffect(() => {
    if (subscription.hasActiveSubscription && showPlanModal) {
      // Close plan modal and start onboarding
      setShowPlanModal(false);
      setShowOnboardingScreen(true);
    }
  }, [subscription.hasActiveSubscription, showPlanModal]);

  // State management
  const [selectedTab, setSelectedTab] = useState<'products' | 'events' | 'transactions'>('products');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Merchant onboarding modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [showOnboardingScreen, setShowOnboardingScreen] = useState(false);

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

  const merchantOnboarding = require('../../../providers/MerchantOnboardingProvider').useMerchantOnboardingContext();

  const isStripeOnboarded = merchantOnboarding?.onboardingStatus?.stripeOnboardingComplete;

  return (
    <>
      {!isStripeOnboarded ? (
        // Gate: show onboarding flow / modal until Stripe Connect onboarding complete
        <>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666', padding: 16, textAlign: 'center' }}>
              To access your Storefront you must complete merchant onboarding.
              Tap the button below to get started.
            </Text>
          </View>

          <MerchantPlanPurchaseModal
            visible={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            selectedPlan={selectedPlan}
          />

          {showOnboardingScreen && (
            <MerchantOnboardingContainer onComplete={async () => {
              setShowOnboardingScreen(false);
              try { await subscription.refreshSubscription(); } catch (e) {}
            }} />
          )}
        </>
      ) : (
        <>
          <StorefrontScreen {...storefrontProps} />

          {/* Still keep modal available in case user needs to purchase/upgrade */}
          <MerchantPlanPurchaseModal
            visible={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            selectedPlan={selectedPlan}
          />

          {showOnboardingScreen && (
            <MerchantOnboardingContainer onComplete={async () => {
              setShowOnboardingScreen(false);
              try { await subscription.refreshSubscription(); } catch (e) {}
            }} />
          )}
        </>
      )}
    </>
  );
};

export default StorefrontContainer;
