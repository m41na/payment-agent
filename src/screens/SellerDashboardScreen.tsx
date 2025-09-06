import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useInventory } from '../contexts/InventoryContext';
import { useTransactionHistory } from '../contexts/TransactionHistoryContext';
import { Product } from '../contexts/InventoryContext';
import AddProductModal from '../components/AddProductModal';

const SellerDashboardScreen: React.FC = () => {
  const { products, loading: inventoryLoading, deleteProduct, toggleProductAvailability, refreshProducts } = useInventory();
  const { transactions, totalRevenue, monthlyRevenue, loading: transactionLoading, refreshTransactions } = useTransactionHistory();
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const handleRefresh = async () => {
    await Promise.all([refreshProducts(), refreshTransactions()]);
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
          onPress: () => deleteProduct(product.id),
        },
      ]
    );
  };

  const handleToggleAvailability = (product: Product) => {
    toggleProductAvailability(product.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header with Revenue Stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Seller Dashboard</Text>
        <View style={styles.revenueStats}>
          <View style={styles.revenueStat}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueAmount}>{formatCurrency(totalRevenue)}</Text>
          </View>
          <View style={styles.revenueStat}>
            <Text style={styles.revenueLabel}>This Month</Text>
            <Text style={styles.revenueAmount}>{formatCurrency(monthlyRevenue)}</Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            Inventory ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
            Transactions ({transactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={inventoryLoading || transactionLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        {activeTab === 'inventory' && (
          <View style={styles.inventorySection}>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No products yet</Text>
                <Text style={styles.emptyStateSubtext}>Add your first product to get started</Text>
              </View>
            ) : (
              products.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productTitle}>{product.title}</Text>
                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={[
                          styles.availabilityButton,
                          product.is_available ? styles.availableButton : styles.unavailableButton,
                        ]}
                        onPress={() => handleToggleAvailability(product)}
                      >
                        <Text style={styles.availabilityButtonText}>
                          {product.is_available ? 'Available' : 'Unavailable'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteProduct(product)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                  <Text style={styles.productCondition}>Condition: {product.condition}</Text>
                  {product.category && (
                    <Text style={styles.productCategory}>Category: {product.category}</Text>
                  )}
                  {product.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}
                  <Text style={styles.productDate}>
                    Created: {formatDate(product.created_at)}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'transactions' && (
          <View style={styles.transactionsSection}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No transactions yet</Text>
                <Text style={styles.emptyStateSubtext}>Sales will appear here once customers purchase your products</Text>
              </View>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.transactionAmount}>
                      {formatCurrency(transaction.amount / 100)}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      transaction.status === 'succeeded' ? styles.successBadge : styles.pendingBadge,
                    ]}>
                      <Text style={styles.statusText}>{transaction.status}</Text>
                    </View>
                  </View>
                  
                  {transaction.buyer_profile && (
                    <Text style={styles.buyerInfo}>
                      Buyer: {transaction.buyer_profile.full_name}
                    </Text>
                  )}
                  
                  <Text style={styles.transactionType}>
                    Type: {transaction.transaction_type}
                  </Text>
                  
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.created_at)}
                  </Text>
                  
                  {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                    <Text style={styles.transactionMeta} numberOfLines={1}>
                      {JSON.stringify(transaction.metadata)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => setShowAddProductModal(true)}
      >
        <Text style={styles.floatingActionButtonText}>+</Text>
      </TouchableOpacity>

      <AddProductModal
        visible={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueStat: {
    flex: 1,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  revenueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  inventorySection: {
    padding: 15,
  },
  transactionsSection: {
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  availabilityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  availableButton: {
    backgroundColor: '#e8f5e8',
  },
  unavailableButton: {
    backgroundColor: '#ffeaea',
  },
  availabilityButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#d32f2f',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  productCondition: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  productDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  productDate: {
    fontSize: 12,
    color: '#999',
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  successBadge: {
    backgroundColor: '#e8f5e8',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  buyerInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  transactionType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  transactionMeta: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  floatingActionButtonText: {
    fontSize: 24,
    color: '#fff',
  },
});

export default SellerDashboardScreen;
