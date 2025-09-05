import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView } from 'react-native';
import { Text, Card, Button, Chip, FAB, Portal, Modal, Title, Paragraph, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useStripeConnect } from '../contexts/StripeConnectContext';
import { useLocation } from '../contexts/LocationContext';
import { Product } from '../types';
import { supabase } from '../services/supabase';
import { MerchantPlanPurchaseModal } from '../components/MerchantPlanPurchaseModal';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  status: 'active' | 'inactive';
  inventory?: number;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  status: 'completed' | 'pending' | 'refunded';
  customer: string;
  products: string[];
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: string;
  type: 'one_time' | 'recurring';
  description: string;
}

interface Subscription {
  id: string;
  type: 'one_time' | 'recurring';
  expires_at?: string;
  current_period_end?: string;
}

const StorefrontScreen = () => {
  const { user } = useAuth();
  const { 
    hasActiveSubscription, 
    subscriptionPlans, 
    purchaseSubscription, 
    purchaseDailyAccess,
    cancelSubscription, 
    loading: subscriptionLoading, 
    subscription,
    refreshPlans 
  } = useSubscription();
  const { 
    hasCompletedOnboarding, 
    startOnboarding, 
    loading: onboardingLoading 
  } = useStripeConnect();
  const { location } = useLocation();
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: 'good' as const,
    location_name: '',
    address: '',
  });

  // Load user's products from database
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch plans when tab becomes active
  useFocusEffect(
    React.useCallback(() => {
      if (!hasActiveSubscription) {
        refreshPlans();
      }
    }, [hasActiveSubscription])
  );

  useEffect(() => {
    if (user && subscription?.status === 'active') {
      loadUserProducts();
    }
  }, [user, subscription?.status]);

  const loadUserProducts = async () => {
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
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load your products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Transaction data - will be loaded from database
  const [transactions] = useState<Transaction[]>([]);

  const handleSubscribe = async () => {
    // Removed handleSubscribe implementation
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      Alert.alert('Success', 'Subscription cancelled!');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to cancel subscription');
    }
  };

  const handleAddProduct = () => {
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!newProduct.title || !newProduct.price || !location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const product: Partial<Product> = {
        title: newProduct.title,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        category: newProduct.category,
        condition: newProduct.condition,
        seller_id: user!.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        location_name: newProduct.location_name,
        address: newProduct.address,
        images: [],
        tags: [],
        is_available: true,
      };

      const { data, error } = await supabase
        .from('pg_products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      
      Alert.alert('Success', 'Product added to your inventory!');
      setShowProductModal(false);
      setNewProduct({
        title: '',
        description: '',
        price: '',
        category: '',
        condition: 'good',
        location_name: '',
        address: '',
      });
      
      // Refresh products list
      loadUserProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    }
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowPlanSelection(false);
    setShowPurchaseModal(true);
  };

  const handleClosePurchaseModal = () => {
    setShowPurchaseModal(false);
    setSelectedPlan(null);
  };

  const renderSubscriptionWall = () => (
    <View style={styles.subscriptionWall}>
      <Card style={styles.subscriptionCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.cardTitle}>
            Merchant Features
          </Text>
          
          <Text variant="bodyLarge" style={styles.cardDescription}>
            Choose your merchant access option to unlock inventory management, transaction history, and storefront customization.
          </Text>

          <Button
            mode="contained"
            onPress={() => setShowPlanSelection(true)}
            style={styles.subscribeButton}
            icon="store"
          >
            Choose Merchant Plan
          </Button>
        </Card.Content>
      </Card>
    </View>
  );

  const renderPlanSelection = () => (
    <Modal 
      visible={showPlanSelection} 
      onDismiss={() => setShowPlanSelection(false)}
      contentContainerStyle={styles.subscriptionModal}
    >
      <ScrollView style={styles.scrollView}>
        <Card>
          <Card.Content>
            <Title style={styles.modalTitle}>Choose Your Plan</Title>
            <Paragraph style={styles.modalDescription}>
              Select a subscription plan to unlock merchant features and start selling.
            </Paragraph>
            
            {subscriptionPlans.map((plan) => (
              <Card 
                key={plan.id}
                style={styles.modalPlanCard}
              >
                <Card.Content style={styles.planContent}>
                  <View style={styles.planHeader}>
                    <Title style={styles.planTitle}>{plan.name}</Title>
                    <Text style={styles.planPrice}>
                      ${(plan.price_amount / 100).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.planInterval}>
                    {plan.billing_interval === 'one_time' ? 'One-time payment' : `per ${plan.billing_interval}`}
                  </Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                  {plan.billing_interval === 'one_time' && (
                    <Text style={styles.planNote}>
                      • Access expires after 24 hours{'\n'}
                      • Perfect for garage sales & auctions{'\n'}
                      • No cancellation needed
                    </Text>
                  )}
                  {plan.billing_interval !== 'one_time' && (
                    <Text style={styles.planNote}>
                      • Recurring billing{'\n'}
                      • Cancel anytime{'\n'}
                      • Full merchant features
                    </Text>
                  )}
                  <Button
                    mode="contained"
                    onPress={() => handleSelectPlan(plan)}
                    style={styles.selectButton}
                  >
                    Select Plan
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </Modal>
  );

  const renderActiveSubscription = () => (
    <ScrollView style={styles.container}>
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Title style={styles.statusTitle}>
              {subscription?.type === 'one_time' ? 'Daily Access Active' : 'Subscription Active'}
            </Title>
            <Chip 
              mode="flat" 
              style={[styles.statusChip, { backgroundColor: '#e8f5e8' }]}
              textStyle={{ color: '#2e7d32' }}
            >
              Active
            </Chip>
          </View>
          
          <Text style={styles.statusDescription}>
            {subscription?.type === 'one_time' 
              ? `Your daily access expires at ${new Date(subscription.expires_at).toLocaleString()}`
              : `Your subscription renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`
            }
          </Text>

          {subscription?.type === 'recurring' && (
            <Button
              mode="outlined"
              onPress={handleCancelSubscription}
              style={styles.cancelButton}
              textColor="#d32f2f"
            >
              Cancel Subscription
            </Button>
          )}
          
          {subscription?.type === 'one_time' && (
            <Text style={styles.dailyAccessNote}>
              Daily access cannot be cancelled as it expires automatically after 24 hours.
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <Card.Content>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text variant="titleMedium">{item.title}</Text>
            <Text variant="bodySmall" style={styles.productCategory}>
              {item.category}
            </Text>
          </View>
          <View style={styles.productRight}>
            <Chip 
              mode="outlined" 
              compact
              style={[
                styles.statusChip,
                item.status === 'active' && styles.activeChip
              ]}
            >
              {item.status}
            </Chip>
            <Text variant="titleMedium" style={styles.productPrice}>
              ${item.price.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <Text variant="bodyMedium" style={styles.productDescription}>
          {item.description}
        </Text>
        
        {item.inventory !== undefined && (
          <Text variant="bodySmall" style={styles.inventoryText}>
            {item.inventory} in stock
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Card style={styles.transactionCard}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <View>
            <Text variant="titleMedium">#{item.id}</Text>
            <Text variant="bodySmall" style={styles.transactionDate}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.transactionRight}>
            <Chip 
              mode="outlined" 
              compact
              style={[
                styles.statusChip,
                item.status === 'completed' && styles.completedChip
              ]}
            >
              {item.status}
            </Chip>
            <Text variant="titleMedium" style={styles.transactionAmount}>
              ${item.amount.toFixed(2)}
            </Text>
          </View>
        </View>
        
        <Text variant="bodySmall" style={styles.customerText}>
          Customer: {item.customer}
        </Text>
        
        <View style={styles.productsSection}>
          {item.products.map((product, index) => (
            <Text key={index} variant="bodySmall" style={styles.productText}>
              • {product}
            </Text>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const InventoryView = () => (
    <View style={styles.inventoryContainer}>
      <Card style={styles.inventoryCard}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Inventory Management</Title>
            <Button
              mode="contained"
              onPress={handleAddProduct}
              style={styles.addButton}
              icon="plus"
            >
              Add Product
            </Button>
          </View>
          
          <Text style={styles.sectionDescription}>
            Manage your products and services. All items are automatically geotagged with your current location for proximity-based discovery.
          </Text>

          {loadingProducts ? (
            <Text style={styles.loadingText}>Loading your products...</Text>
          ) : products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <Text style={styles.emptyText}>No products yet. Add your first product to get started!</Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const TransactionsView = () => (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );

  if (!hasActiveSubscription) {
    return (
      <>
        {renderSubscriptionWall()}
        {renderPlanSelection()}
        <MerchantPlanPurchaseModal
          visible={showPurchaseModal}
          onClose={handleClosePurchaseModal}
          selectedPlan={selectedPlan}
        />
        <Portal>
          <Modal 
            visible={showProductModal} 
            onDismiss={() => setShowProductModal(false)}
            contentContainerStyle={styles.productModal}
          >
            <ScrollView style={styles.modalScrollView}>
              <Card>
                <Card.Content>
                  <Title style={styles.modalTitle}>Add New Product</Title>
                  
                  <TextInput
                    label="Product Title *"
                    value={newProduct.title}
                    onChangeText={(text) => setNewProduct(prev => ({ ...prev, title: text }))}
                    style={styles.modalInput}
                    mode="outlined"
                  />

                  <TextInput
                    label="Description"
                    value={newProduct.description}
                    onChangeText={(text) => setNewProduct(prev => ({ ...prev, description: text }))}
                    style={styles.modalInput}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                  />

                  <TextInput
                    label="Price *"
                    value={newProduct.price}
                    onChangeText={(text) => setNewProduct(prev => ({ ...prev, price: text }))}
                    style={styles.modalInput}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    left={<TextInput.Affix text="$" />}
                  />

                  <TextInput
                    label="Category"
                    value={newProduct.category}
                    onChangeText={(text) => setNewProduct(prev => ({ ...prev, category: text }))}
                    style={styles.modalInput}
                    mode="outlined"
                    placeholder="e.g., Electronics, Furniture, Clothing"
                  />

                  <View style={styles.conditionSection}>
                    <Text style={styles.conditionLabel}>Condition</Text>
                    <View style={styles.conditionChips}>
                      {['new', 'like_new', 'good', 'fair', 'poor'].map((condition) => (
                        <Chip
                          key={condition}
                          mode={newProduct.condition === condition ? 'flat' : 'outlined'}
                          selected={newProduct.condition === condition}
                          onPress={() => setNewProduct(prev => ({ ...prev, condition: condition as any }))}
                          style={styles.conditionChip}
                        >
                          {condition.replace('_', ' ').toUpperCase()}
                        </Chip>
                      ))}
                    </View>
                  </View>

                  <View style={styles.locationSection}>
                    <Text style={styles.locationLabel}>📍 Location (Auto-detected)</Text>
                    {location ? (
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationCoords}>
                          {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                        </Text>
                        <TextInput
                          label="Location Name (Optional)"
                          value={newProduct.location_name}
                          onChangeText={(text) => setNewProduct(prev => ({ ...prev, location_name: text }))}
                          style={styles.modalInput}
                          mode="outlined"
                          placeholder="e.g., Downtown Store, Home"
                        />
                        <TextInput
                          label="Address (Optional)"
                          value={newProduct.address}
                          onChangeText={(text) => setNewProduct(prev => ({ ...prev, address: text }))}
                          style={styles.modalInput}
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
                      disabled={!newProduct.title || !newProduct.price || !location}
                    >
                      Add Product
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </ScrollView>
          </Modal>
        </Portal>
      </>
    );
  }

  if (hasActiveSubscription && !hasCompletedOnboarding) {
    return (
      <View style={styles.container}>
        <Card style={styles.statusCard}>
          <Card.Content>
            <Title style={styles.statusTitle}>Complete Stripe Connect Onboarding</Title>
            <Text style={styles.statusDescription}>
              To access merchant features, please complete the Stripe Connect onboarding process.
            </Text>
            <Button
              mode="contained"
              onPress={startOnboarding}
              loading={onboardingLoading}
              disabled={onboardingLoading}
              style={styles.subscribeButton}
            >
              Start Onboarding
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          My Storefront
        </Text>
        
        <View style={styles.tabButtons}>
          <Button
            mode={activeTab === 'inventory' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('inventory')}
            style={styles.tabButton}
          >
            Inventory ({products.length})
          </Button>
          <Button
            mode={activeTab === 'transactions' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('transactions')}
            style={styles.tabButton}
          >
            Transactions
          </Button>
        </View>
      </View>

      {activeTab === 'inventory' ? <InventoryView /> : <TransactionsView />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  subscriptionWall: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  subscriptionCard: {
    margin: 16,
    padding: 16,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  cardDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  scrollView: {
    flexGrow: 1,
  },
  subscriptionModal: {
    padding: 16,
    maxHeight: '80%',
  },
  planCard: {
    marginVertical: 8,
    padding: 8,
    elevation: 2,
  },
  selectedPlan: {
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  planContent: {
    padding: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  planInterval: {
    textAlign: 'center',
    color: '#666',
  },
  planDescription: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  planNote: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  selectButton: {
    marginTop: 8,
  },
  subscribeButton: {
    marginTop: 24,
    paddingVertical: 8,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  modalPlanCard: {
    marginVertical: 8,
    padding: 8,
  },
  statusCard: {
    margin: 16,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusDescription: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  dailyAccessNote: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  cancelButton: {
    marginTop: 16,
  },
  inventoryCard: {
    margin: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
  },
  addButton: {
    paddingHorizontal: 16,
  },
  productModal: {
    margin: 20,
    maxHeight: '90%',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalInput: {
    marginBottom: 12,
  },
  conditionSection: {
    marginBottom: 16,
  },
  conditionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  conditionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    marginRight: 4,
    marginBottom: 4,
  },
  locationSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  inventoryContainer: {
    flex: 1,
  },
  listContainer: {
    padding: 8,
  },
  productCard: {
    margin: 8,
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
  productCategory: {
    color: '#666',
    marginTop: 2,
  },
  productRight: {
    alignItems: 'flex-end',
  },
  statusChip: {
    marginBottom: 4,
  },
  activeChip: {
    backgroundColor: '#e8f5e8',
  },
  productPrice: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  productDescription: {
    marginBottom: 8,
    color: '#666',
  },
  inventoryText: {
    color: '#999',
    fontStyle: 'italic',
  },
  transactionCard: {
    margin: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionDate: {
    color: '#666',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  completedChip: {
    backgroundColor: '#e8f5e8',
  },
  transactionAmount: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  customerText: {
    color: '#666',
    marginBottom: 8,
  },
  productsSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  productText: {
    color: '#666',
    marginBottom: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default StorefrontScreen;
