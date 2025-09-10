import React from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Surface,
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  Chip,
  SegmentedButtons,
  FAB,
} from 'react-native-paper';
import { StorefrontProps } from '../containers/StorefrontContainer';
import ProductModal from '../../inventory-management/components/ProductModal';
import BrandLogo from '../../shared/BrandLogo';
import { appTheme } from '../../theme';

const StorefrontScreen: React.FC<StorefrontProps> = ({
  // Tab state
  selectedTab,
  onTabChange,

  // Stats
  stats,

  // Products
  products,
  loadingProducts,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onToggleProductAvailability,
  onRefreshProducts,

  // Events
  events,
  loadingEvents,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onRefreshEvents,

  // Transactions
  transactions,
  loadingTransactions,
  onRefreshTransactions,

  // Modals
  showProductModal,
  showEventModal,
  editingProduct,
  editingEvent,
  onHideProductModal,
  onHideEventModal,
  onCreateProduct,
  onUpdateProduct,
  onCreateEvent,
  onUpdateEvent,

  // Location
  location
}) => {
  // Render components
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    } catch (e) {
      return `$${(value || 0).toFixed(2)}`;
    }
  };

  const formatNumber = (value: number) => {
    try {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
    } catch (e) {
      return String(value || 0);
    }
  };

  const statsList = [
    { key: 'totalRevenue', label: 'Total Revenue', value: stats?.totalRevenue || 0, formatter: formatCurrency },
    { key: 'todayRevenue', label: 'Today Revenue', value: stats?.todayRevenue || 0, formatter: formatCurrency },
    { key: 'totalSales', label: 'Total Sales', value: stats?.totalSales || 0, formatter: formatNumber },
    { key: 'activeProducts', label: 'Active Products', value: stats?.activeProducts || 0, formatter: formatNumber },
  ];

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      {statsList.map((s) => (
        <Surface key={s.key} style={styles.statCard} accessibilityRole="summary" accessibilityLabel={`${s.label}: ${s.formatter(s.value)}`}>
          <View style={styles.statTopRow}>
            <Text style={styles.statValue}>{s.formatter(s.value)}</Text>
          </View>
          <Text style={styles.statLabel}>{s.label}</Text>
        </Surface>
      ))}
    </View>
  );

  const renderProductCard = ({ item: product }: { item: any }) => (
    <Card style={styles.productCard}>
      <Card.Content>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Title style={styles.productTitle}>{product.title}</Title>
            <Paragraph style={styles.productPrice}>${product.price}</Paragraph>
            <Paragraph style={styles.productDescription} numberOfLines={2}>
              {product.description}
            </Paragraph>
          </View>
          <View style={styles.productActions}>
            <Chip 
              mode="flat"
              style={[
                styles.availabilityChip,
                { backgroundColor: product.is_available ? appTheme.colors.success : appTheme.colors.danger }
              ]}
              textStyle={{ color: 'white' }}
            >
              {product.is_available ? 'Available' : 'Unavailable'}
            </Chip>
          </View>
        </View>
        <View style={styles.productFooter}>
          <Button 
            mode="outlined" 
            onPress={() => onToggleProductAvailability(product)}
            style={styles.actionButton}
          >
            {product.is_available ? 'Mark Unavailable' : 'Mark Available'}
          </Button>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => onEditProduct(product)}
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={() => onDeleteProduct(product)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderEventCard = ({ item: event }: { item: any }) => (
    <Card style={styles.eventCard}>
      <Card.Content>
        <View style={styles.eventHeader}>
          <View style={styles.eventInfo}>
            <Title style={styles.eventTitle}>{event.title}</Title>
            <Paragraph style={styles.eventDate}>
              {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
            </Paragraph>
            <Paragraph style={styles.eventDescription} numberOfLines={2}>
              {event.description}
            </Paragraph>
          </View>
          <View style={styles.eventActions}>
            <Chip 
              mode="flat"
              style={styles.eventTypeChip}
            >
              {event.event_type?.replace('_', ' ').toUpperCase()}
            </Chip>
          </View>
        </View>
        <View style={styles.eventFooter}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => onEditEvent(event)}
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={() => onDeleteEvent(event)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderTransactionCard = ({ item: transaction }: { item: any }) => (
    <Card style={styles.transactionCard}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <View>
            <Title style={styles.transactionAmount}>
              +${(transaction.amount / 100).toFixed(2)}
            </Title>
            <Text style={styles.transactionDate}>
              {new Date(transaction.created_at).toLocaleDateString()} {new Date(transaction.created_at).toLocaleTimeString()}
            </Text>
          </View>
          <Chip 
            mode="flat"
            style={[
              styles.statusChip,
              {
                backgroundColor: transaction.status === 'completed' ? appTheme.colors.success :
                                transaction.status === 'pending' ? appTheme.colors.warning : appTheme.colors.danger
              }
            ]}
            textStyle={{ color: 'white' }}
          >
            {transaction.status?.toUpperCase()}
          </Chip>
        </View>
        {transaction.description && (
          <Paragraph style={styles.transactionDescription}>
            {transaction.description}
          </Paragraph>
        )}
      </Card.Content>
    </Card>
  );

  const renderEventModal = () => (
    <ProductModal
      visible={showEventModal}
      onDismiss={onHideEventModal}
      onSubmit={editingEvent ? onUpdateEvent : onCreateEvent}
      initialData={editingEvent}
      location={location}
    />
  );

  const renderListHeader = () => (
    <>
      {renderStatsCards()}
      
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={onTabChange}
          buttons={[
            { value: 'products', label: 'Products' },
            { value: 'events', label: 'Events' },
            { value: 'transactions', label: 'Transactions' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>
    </>
  );

  const getCurrentData = () => {
    switch (selectedTab) {
      case 'products':
        return products;
      case 'events':
        return events;
      case 'transactions':
        return transactions;
      default:
        return [];
    }
  };

  const getCurrentRenderItem = () => {
    switch (selectedTab) {
      case 'products':
        return renderProductCard;
      case 'events':
        return renderEventCard;
      case 'transactions':
        return renderTransactionCard;
      default:
        return () => null;
    }
  };

  const getCurrentRefreshControl = () => {
    switch (selectedTab) {
      case 'products':
        return (
          <RefreshControl
            refreshing={loadingProducts}
            onRefresh={onRefreshProducts}
          />
        );
      case 'events':
        return (
          <RefreshControl
            refreshing={loadingEvents}
            onRefresh={onRefreshEvents}
          />
        );
      case 'transactions':
        return (
          <RefreshControl
            refreshing={loadingTransactions}
            onRefresh={onRefreshTransactions}
          />
        );
      default:
        return undefined;
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={getCurrentData()}
        renderItem={getCurrentRenderItem()}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        refreshControl={getCurrentRefreshControl()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      {selectedTab === 'products' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={onAddProduct}
        />
      )}

      {selectedTab === 'events' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={onAddEvent}
        />
      )}

      <ProductModal
        visible={showProductModal}
        onDismiss={onHideProductModal}
        onSubmit={editingProduct ? onUpdateProduct : onCreateProduct}
        initialData={editingProduct}
        location={location}
      />

      {renderEventModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 12,
    marginBottom: 8,
  },
  statCard: {
    minWidth: 140,
    flexBasis: '48%',
    marginHorizontal: 2,
    marginVertical: 6,
    padding: 14,
    alignItems: 'flex-start',
    borderRadius: 10,
    elevation: 2,
    backgroundColor: appTheme.colors.surface,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: appTheme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: appTheme.colors.textSecondary,
    marginTop: 8,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedButtons: {
    backgroundColor: appTheme.colors.surface,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productCard: {
    marginVertical: 8,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
    marginRight: 16,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: appTheme.colors.success,
    marginVertical: 4,
  },
  productDescription: {
    fontSize: 14,
    color: appTheme.colors.textSecondary,
  },
  productActions: {
    alignItems: 'flex-end',
  },
  availabilityChip: {
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
  },
  eventCard: {
    marginVertical: 8,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventInfo: {
    flex: 1,
    marginRight: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventDate: {
    fontSize: 14,
    color: appTheme.colors.primary,
    marginVertical: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: appTheme.colors.textSecondary,
  },
  eventActions: {
    alignItems: 'flex-end',
  },
  eventTypeChip: {
    backgroundColor: appTheme.colors.warning,
    marginBottom: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
  },
  transactionCard: {
    marginVertical: 8,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: appTheme.colors.success,
  },
  transactionDate: {
    fontSize: 12,
    color: appTheme.colors.textSecondary,
    marginTop: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: appTheme.colors.textSecondary,
    marginTop: 8,
  },
  statusChip: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: appTheme.colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
});

export default StorefrontScreen;
