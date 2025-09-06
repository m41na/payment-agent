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
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../services/supabase';

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

const StorefrontScreen = () => {
  const { user } = useAuth();
  const { location } = useLocation();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'good' as const,
  });

  // Stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayRevenue: 0,
    totalSales: 0,
    activeProducts: 0,
  });

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
    }, [loadProducts, loadTransactions])
  );

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadTransactions()]);
    setRefreshing(false);
  }, [loadProducts, loadTransactions]);

  // Product CRUD operations
  const handleSaveProduct = async () => {
    if (!productForm.title || !productForm.price || !location) {
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
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
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

        {/* Inventory */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Your Products</Title>
            <Badge style={styles.badge}>{products.length}</Badge>
          </View>
          
          {loadingProducts ? (
            <ProgressBar indeterminate style={styles.loader} />
          ) : products.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No products yet. Add your first product to start selling!</Text>
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
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Product"
        onPress={() => {
          setEditingProduct(null);
          setProductForm({
            title: '',
            description: '',
            price: '',
            category: '',
            condition: 'good',
          });
          setShowProductModal(true);
        }}
      />

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
              label="Price ($) *"
              value={productForm.price}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, price: text }))}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
            />
            
            <TextInput
              label="Category"
              value={productForm.category}
              onChangeText={(text) => setProductForm(prev => ({ ...prev, category: text }))}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., Electronics, Clothing, Books"
            />
            
            <Text style={styles.conditionLabel}>Condition</Text>
            <View style={styles.conditionChips}>
              {['new', 'like_new', 'good', 'fair', 'poor'].map((condition) => (
                <Chip
                  key={condition}
                  mode={productForm.condition === condition ? 'flat' : 'outlined'}
                  selected={productForm.condition === condition}
                  onPress={() => setProductForm(prev => ({ ...prev, condition: condition as any }))}
                  style={styles.conditionChip}
                >
                  {condition.replace('_', ' ').toUpperCase()}
                </Chip>
              ))}
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
  conditionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  conditionChip: {
    marginRight: 8,
    marginBottom: 8,
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
});

export default StorefrontScreen;
