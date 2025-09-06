import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  TextInput,
  Modal,
  Portal,
  FAB,
  Chip,
  Surface,
  Text,
  IconButton,
  Divider,
  ProgressBar,
  Badge,
  Menu,
  SegmentedButtons,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';
import MapLocationPicker from '../components/MapLocationPicker';
import EventCreationModal from '../components/EventCreationModal';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  seller_id: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  address?: string;
  images: string[];
  tags: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'refunded';
  customer: string;
  products: string[];
  buyer_id: string;
  seller_id: string;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  created_at: string;
  updated_at: string;
}

const StorefrontScreen = () => {
  const { user } = useAuth();
  const { location } = useLocation();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showConditionMenu, setShowConditionMenu] = useState(false);
  
  // Form state
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'good' as const,
    useStoreLocation: true,
    customLocation: {
      latitude: 0,
      longitude: 0,
      address: '',
      locationName: '',
    },
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
  });

  // Store location state
  const [storeLocation, setStoreLocation] = useState({
    latitude: 0,
    longitude: 0,
    address: '',
    locationName: 'My Store',
  });

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    totalSales: 0,
    activeProducts: 0,
  });

  // Content type state
  const [contentType, setContentType] = useState<'products' | 'events'>('products');

  // Load products
  const loadProducts = useCallback(async () => {
    if (!user) return;
    
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('pg_products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      
      // Update stats
      const activeCount = (data || []).filter(p => p.is_available).length;
      setStats(prev => ({ ...prev, activeProducts: activeCount }));
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  }, [user]);

  // Load transactions with real-time updates
  const loadTransactions = useCallback(async () => {
    if (!user) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('pg_transactions')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const transformedTransactions = (data || []).map(t => ({
        id: t.id,
        amount: t.amount / 100,
        date: t.created_at,
        status: t.status,
        customer: 'Customer',
        products: t.metadata?.product_names || [],
        buyer_id: t.buyer_id,
        seller_id: t.seller_id,
        created_at: t.created_at,
      }));
      
      setTransactions(transformedTransactions);
      
      // Calculate stats
      const totalRevenue = transformedTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const today = new Date().toDateString();
      const todayRevenue = transformedTransactions
        .filter(t => t.status === 'completed' && new Date(t.date).toDateString() === today)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalSales = transformedTransactions.filter(t => t.status === 'completed').length;
      
      setStats(prev => ({
        ...prev,
        totalRevenue,
        todayRevenue,
        totalSales,
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoadingTransactions(false);
    }
  }, [user]);

  // Load events
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

  // Set up real-time subscription for transactions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('seller-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pg_transactions',
          filter: `seller_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(' New transaction update:', payload);
          loadTransactions(); // Refresh transactions on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadTransactions]);

  // Initial load
  useFocusEffect(
    useCallback(() => {
      loadProducts();
      loadTransactions();
      loadEvents();
    }, [loadProducts, loadTransactions, loadEvents])
  );

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadTransactions(), loadEvents()]);
    setRefreshing(false);
  }, [loadProducts, loadTransactions, loadEvents]);

  // Product CRUD operations
  const handleSaveProduct = async () => {
    if (!productForm.title || !productForm.price || (!productForm.useStoreLocation && (!productForm.customLocation.latitude || !productForm.customLocation.longitude))) {
      Alert.alert('Error', 'Please fill in required fields and enable location');
      return;
    }

    try {
      const productData = {
        title: productForm.title,
        description: productForm.description,
        price: Math.round(parseFloat(productForm.price) * 100), // Convert to cents
        category: productForm.category,
        condition: productForm.condition,
        seller_id: user!.id,
        latitude: productForm.useStoreLocation ? storeLocation.latitude : productForm.customLocation.latitude,
        longitude: productForm.useStoreLocation ? storeLocation.longitude : productForm.customLocation.longitude,
        location_name: productForm.useStoreLocation ? storeLocation.locationName : productForm.customLocation.locationName,
        address: productForm.useStoreLocation ? storeLocation.address : productForm.customLocation.address,
        is_available: true,
        images: [],
        tags: [],
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('pg_products')
          .update(productData)
          .eq('id', editingProduct.id);
        
        if (error) throw error;
        Alert.alert('Success', 'Product updated!');
      } else {
        // Create new product
        const { error } = await supabase
          .from('pg_products')
          .insert([productData]);
        
        if (error) throw error;
        Alert.alert('Success', 'Product added to your store!');
      }

      // Reset form and close modal
      setProductForm({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: 'good',
        useStoreLocation: true,
        customLocation: {
          latitude: 0,
          longitude: 0,
          address: '',
          locationName: '',
        },
      });
      setEditingProduct(null);
      setShowProductModal(false);
      loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      title: product.title,
      description: product.description,
      price: (product.price / 100).toString(),
      category: product.category,
      condition: product.condition,
      useStoreLocation: true,
      customLocation: {
        latitude: product.latitude,
        longitude: product.longitude,
        address: product.address || '',
        locationName: product.location_name || '',
      },
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pg_products')
                .delete()
                .eq('id', product.id);
              
              if (error) throw error;
              Alert.alert('Success', 'Product deleted');
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const toggleProductAvailability = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('pg_products')
        .update({ is_available: !product.is_available })
        .eq('id', product.id);
      
      if (error) throw error;
      loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to update product');
    }
  };

  // Event CRUD operations
  const handleSaveEvent = async () => {
    if (!eventForm.title || !eventForm.date || !eventForm.location) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        location: eventForm.location,
        seller_id: user!.id,
      };

      if (editingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('pg_events')
          .update(eventData)
          .eq('id', editingEvent.id);
        
        if (error) throw error;
        Alert.alert('Success', 'Event updated!');
      } else {
        // Create new event
        const { error } = await supabase
          .from('pg_events')
          .insert([eventData]);
        
        if (error) throw error;
        Alert.alert('Success', 'Event added to your store!');
      }

      // Reset form and close modal
      setEventForm({
        title: '',
        description: '',
        date: '',
        location: '',
      });
      setEditingEvent(null);
      setShowEventModal(false);
      loadEvents();
    } catch (error) {
      Alert.alert('Error', 'Failed to save event');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('pg_events')
                .delete()
                .eq('id', event.id);
              
              if (error) throw error;
              Alert.alert('Success', 'Event deleted');
              loadEvents();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  // Render components
  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <Surface style={styles.statCard}>
        <Text style={styles.statValue}>${stats.totalRevenue.toFixed(2)}</Text>
        <Text style={styles.statLabel}>Total Revenue</Text>
      </Surface>
      <Surface style={styles.statCard}>
        <Text style={styles.statValue}>${stats.todayRevenue.toFixed(2)}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </Surface>
      <Surface style={styles.statCard}>
        <Text style={styles.statValue}>{stats.totalSales}</Text>
        <Text style={styles.statLabel}>Sales</Text>
      </Surface>
      <Surface style={styles.statCard}>
        <Text style={styles.statValue}>{stats.activeProducts}</Text>
        <Text style={styles.statLabel}>Active Products</Text>
      </Surface>
    </View>
  );

  const renderProductCard = ({ item: product }: { item: Product }) => (
    <Card style={styles.productCard}>
      <Card.Content>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Title style={styles.productTitle}>{product.title}</Title>
            <Text style={styles.productPrice}>${(product.price / 100).toFixed(2)}</Text>
          </View>
          <View style={styles.productActions}>
            <Chip 
              mode={product.is_available ? 'flat' : 'outlined'}
              style={[
                styles.statusChip,
                { backgroundColor: product.is_available ? '#4CAF50' : '#FF9800' }
              ]}
              textStyle={{ color: 'white' }}
            >
              {product.is_available ? 'Active' : 'Inactive'}
            </Chip>
          </View>
        </View>
        
        {product.description && (
          <Paragraph style={styles.productDescription}>{product.description}</Paragraph>
        )}
        
        <View style={styles.productMeta}>
          <Chip mode="outlined" compact>{product.category}</Chip>
          <Chip mode="outlined" compact>{product.condition.replace('_', ' ')}</Chip>
        </View>
        
        <View style={styles.productButtons}>
          <Button 
            mode="outlined" 
            onPress={() => handleEditProduct(product)}
            style={styles.actionButton}
            compact
          >
            Edit
          </Button>
          <Button 
            mode={product.is_available ? 'outlined' : 'contained'}
            onPress={() => toggleProductAvailability(product)}
            style={styles.actionButton}
            compact
          >
            {product.is_available ? 'Deactivate' : 'Activate'}
          </Button>
          <IconButton 
            icon="delete" 
            size={20}
            onPress={() => handleDeleteProduct(product)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderTransactionCard = ({ item: transaction }: { item: Transaction }) => (
    <Card style={styles.transactionCard}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <View>
            <Title style={styles.transactionAmount}>
              +${transaction.amount.toFixed(2)}
            </Title>
            <Text style={styles.transactionDate}>
              {new Date(transaction.date).toLocaleDateString()} {new Date(transaction.date).toLocaleTimeString()}
            </Text>
          </View>
          <Chip 
            mode="flat"
            style={[
              styles.statusChip,
              { 
                backgroundColor: transaction.status === 'completed' ? '#4CAF50' : 
                                transaction.status === 'pending' ? '#FF9800' : '#F44336'
              }
            ]}
            textStyle={{ color: 'white' }}
          >
            {transaction.status}
          </Chip>
        </View>
        
        {transaction.products.length > 0 && (
          <Text style={styles.transactionProducts}>
            Products: {transaction.products.join(', ')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderEventCard = ({ item: event }: { item: Event }) => (
    <Card style={styles.eventCard}>
      <Card.Content>
        <View style={styles.eventHeader}>
          <View>
            <Title style={styles.eventTitle}>{event.title}</Title>
            <Text style={styles.eventDate}>
              {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString()}
            </Text>
          </View>
        </View>
        
        {event.description && (
          <Paragraph style={styles.eventDescription}>{event.description}</Paragraph>
        )}
        
        <View style={styles.eventButtons}>
          <Button 
            mode="outlined" 
            onPress={() => handleEditEvent(event)}
            style={styles.actionButton}
            compact
          >
            Edit
          </Button>
          <IconButton 
            icon="delete" 
            size={20}
            onPress={() => handleDeleteEvent(event)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderEventsTab = () => (
    <View style={styles.eventsTab}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Event"
        onPress={() => {
          setEditingEvent(null);
          setEventForm({
            title: '',
            description: '',
            date: '',
            location: '',
          });
          setShowEventModal(true);
        }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Your Store</Title>
          <Text style={styles.headerSubtitle}>Manage your inventory and track sales</Text>
        </View>

        {/* Stats Cards */}
        {renderStatsCards()}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Recent Sales</Title>
            <Badge style={styles.badge}>{transactions.length}</Badge>
          </View>
          
          {loadingTransactions ? (
            <ProgressBar indeterminate style={styles.loader} />
          ) : transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No sales yet. Your transactions will appear here in real-time! </Text>
              </Card.Content>
            </Card>
          ) : (
            <FlatList
              data={transactions.slice(0, 5)}
              keyExtractor={(item) => item.id}
              renderItem={renderTransactionCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Content Type Selector */}
        <View style={styles.contentSelector}>
          <SegmentedButtons
            value={contentType}
            onValueChange={(value) => setContentType(value as 'products' | 'events')}
            buttons={[
              { value: 'products', label: 'Products' },
              { value: 'events', label: 'Events' },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Products Section */}
        {contentType === 'products' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Products</Title>
              <Badge style={styles.badge}>{products.length}</Badge>
            </View>
            
            {loadingProducts ? (
              <ProgressBar indeterminate style={styles.loader} />
            ) : products.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No products yet</Text>
                </Card.Content>
              </Card>
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item.id}
                renderItem={renderProductCard}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
            
            <Button
              mode="contained"
              onPress={() => {
                setEditingProduct(null);
                setProductForm({
                  title: '',
                  description: '',
                  price: '',
                  category: '',
                  condition: 'new',
                  location_name: '',
                  latitude: 0,
                  longitude: 0,
                });
                setShowProductModal(true);
              }}
              style={styles.addButton}
            >
              Add Product
            </Button>
          </View>
        )}

        {/* Events Section */}
        {contentType === 'events' && (
          <View style={styles.contentSection}>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Events</Title>
              <Badge style={styles.badge}>{events.length}</Badge>
            </View>
            
            {loadingEvents ? (
              <ProgressBar indeterminate style={styles.loader} />
            ) : events.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No events yet</Text>
                </Card.Content>
              </Card>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={renderEventCard}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
            
            <Button
              mode="contained"
              onPress={() => setShowEventModal(true)}
              style={styles.addButton}
            >
              Create Event
            </Button>
            
            <EventCreationModal
              visible={showEventModal}
              onDismiss={() => setShowEventModal(false)}
              onSave={async (eventData) => {
                try {
                  const { error } = await supabase
                    .from('pg_events')
                    .insert([eventData]);
                  
                  if (error) throw error;
                  Alert.alert('Success', 'Event created!');
                  setShowEventModal(false);
                  loadEvents();
                } catch (error) {
                  Alert.alert('Error', 'Failed to create event');
                }
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Product Modal */}
      <Portal>
        <Modal
          visible={showProductModal}
          onDismiss={() => setShowProductModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Title style={styles.modalTitle}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </Title>
            
            <TextInput
              label="Product Title *"
              value={productForm.title}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, title: text }))}
              style={styles.input}
              mode="outlined"
            />
            
            <TextInput
              label="Description"
              value={productForm.description}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, description: text }))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              label="Price (USD) *"
              value={productForm.price}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, price: text }))}
              style={styles.input}
              mode="outlined"
              keyboardType="decimal-pad"
            />
            
            <TextInput
              label="Category"
              value={productForm.category}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, category: text }))}
              style={styles.input}
              mode="outlined"
            />
            
            <View style={styles.conditionSection}>
              <Text style={styles.label}>Condition *</Text>
              <Menu
                visible={showConditionMenu}
                onDismiss={() => setShowConditionMenu(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setShowConditionMenu(true)}
                    style={styles.conditionButton}
                  >
                    {productForm.condition}
                  </Button>
                }
              >
                {['new', 'like_new', 'good', 'fair', 'poor'].map((condition) => (
                  <Menu.Item
                    key={condition}
                    onPress={() => {
                      setProductForm(prev => ({ ...prev, condition: condition as any }));
                      setShowConditionMenu(false);
                    }}
                    title={condition.replace('_', ' ')}
                  />
                ))}
              </Menu>
            </View>
            
            <View style={styles.locationSection}>
              <Text style={styles.label}>Product Location</Text>
              <View style={styles.locationToggle}>
                <Button
                  mode={productForm.useStoreLocation ? 'contained' : 'outlined'}
                  onPress={() => setProductForm(prev => ({ ...prev, useStoreLocation: true }))}
                  style={styles.locationButton}
                  compact
                >
                  Store Location
                </Button>
                <Button
                  mode={!productForm.useStoreLocation ? 'contained' : 'outlined'}
                  onPress={() => setProductForm(prev => ({ ...prev, useStoreLocation: false }))}
                  style={styles.locationButton}
                  compact
                >
                  Custom Location
                </Button>
              </View>
              
              {!productForm.useStoreLocation && (
                <MapLocationPicker
                  location={productForm.customLocation}
                  onLocationChange={(location) => 
                    setProductForm(prev => ({ 
                      ...prev, 
                      customLocation: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: location.address || '',
                        locationName: location.locationName || '',
                      }
                    }))
                  }
                  editable={true}
                />
              )}
            </View>
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowProductModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveProduct}
                style={styles.modalButton}
              >
                {editingProduct ? 'Update' : 'Add'} Product
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#6200ea',
  },
  divider: {
    marginVertical: 20,
    marginHorizontal: 20,
  },
  productCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 2,
  },
  productActions: {
    alignItems: 'flex-end',
  },
  productDescription: {
    color: '#666',
    marginBottom: 12,
  },
  productMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 8,
  },
  transactionCard: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionProducts: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statusChip: {
    borderRadius: 16,
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ea',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
    maxHeight: '90%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  conditionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  conditionButton: {
    width: '100%',
    justifyContent: 'space-between',
  },
  conditionButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    marginBottom: 20,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  locationOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationChip: {
    marginRight: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  eventsTab: {
    padding: 20,
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  eventDescription: {
    color: '#666',
    marginBottom: 12,
  },
  eventButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentSelector: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  segmentedButtons: {
    width: '100%',
  },
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addButton: {
    marginTop: 16,
  },
});

export default StorefrontScreen;
