import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { DiscoveryListingProps } from '../containers/DiscoveryListingContainer';
import { appTheme } from '../../theme';
import ListingPanel, { ListingMode } from './ListingPanel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DiscoveryListingScreen: React.FC<any> = ({
  products,
  events,
  isLoading,
  isRefreshing,
  // searches
  searchProducts,
  onProductsSearchChange,
  onProductsSearchSubmit,
  searchEvents,
  onEventsSearchChange,
  onEventsSearchSubmit,
  // actions
  onRefresh,
  onLoadMore,
  onProductSelect,
  onEventSelect,
  onAddToCart,
  selectedDate,
  onDateSelect,
  eventsForSelectedDate,
  getMarkedDates,
  currentLocation,
}) => {
  const [productsMode, setProductsMode] = useState<ListingMode>('list');
  const [eventsMode, setEventsMode] = useState<ListingMode>('calendar');
  const [selectedPanel, setSelectedPanel] = useState<'products' | 'events'>('products');

  const renderProduct = ({ item }: any) => (
    <ListingItemProduct item={item} onSelect={onProductSelect} onAdd={onAddToCart} />
  );

  const renderEvent = ({ item }: any) => (
    <ListingItemEvent item={item} onSelect={onEventSelect} />
  );

  // layout: if wide screen, still allow stacked but show only the selected panel
  const twoColumn = SCREEN_WIDTH > 900;

  return (
    <View style={styles.container}>
      <Text style={styles.heroTitle}>Discover</Text>
      <Text style={styles.heroSubtitle}>Find products and events near you — switch between map, list and calendar views.</Text>

      {/* Pills to switch between panels */}
      <View style={styles.pillsRow}>
        <TouchableOpacity onPress={() => setSelectedPanel('products')} style={[styles.pill, selectedPanel === 'products' && styles.pillActive]}>
          <Text style={[styles.pillText, selectedPanel === 'products' && styles.pillTextActive]}>Products</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedPanel('events')} style={[styles.pill, selectedPanel === 'events' && styles.pillActive]}>
          <Text style={[styles.pillText, selectedPanel === 'events' && styles.pillTextActive]}>Events</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.panelsWrap}>
        {selectedPanel === 'products' ? (
          <View style={styles.panelContainer}>
            <Searchbar placeholder="Search products..." value={searchProducts} onChangeText={onProductsSearchChange} onSubmitEditing={onProductsSearchSubmit} style={styles.search} />
            <ListingPanel
              title="Products"
              items={products}
              modes={[ 'list', 'map' ]}
              mode={productsMode}
              onModeChange={setProductsMode}
              renderItem={renderProduct as any}
              keyExtractor={(item: any) => item.id?.toString() || item._id || Math.random().toString()}
              onSelect={onProductSelect}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onRefresh={onRefresh}
              onLoadMore={onLoadMore}
              currentLocation={currentLocation}
            />
          </View>
        ) : (
          <View style={styles.panelContainer}>
            <Searchbar placeholder="Search events..." value={searchEvents} onChangeText={onEventsSearchChange} onSubmitEditing={onEventsSearchSubmit} style={styles.search} />
            <ListingPanel
              title="Events"
              items={events}
              modes={[ 'calendar', 'map' ]}
              mode={eventsMode}
              onModeChange={setEventsMode}
              renderItem={renderEvent as any}
              keyExtractor={(item: any) => item.id?.toString() || item._id || Math.random().toString()}
              onSelect={onEventSelect}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onRefresh={onRefresh}
              onLoadMore={onLoadMore}
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              eventsForSelectedDate={eventsForSelectedDate}
              getMarkedDates={getMarkedDates}
              currentLocation={currentLocation}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const ListingItemProduct: React.FC<any> = ({ item, onSelect, onAdd }) => (
  <View style={{ marginBottom: 12 }}>
    <CardLike>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={styles.thumbPlaceholder} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: appTheme.colors.textPrimary }}>{item.title || item.name}</Text>
          <Text style={{ color: appTheme.colors.textSecondary, marginTop: 4 }}>{item.merchantName || item.seller?.display_name || ''}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontWeight: '800', color: appTheme.colors.primary }}>${item.price ? Number(item.price).toFixed(2) : '0.00'}</Text>
        </View>
      </View>
      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableSmall onPress={() => onSelect && onSelect(item)} label="View" />
        <TouchableSmall onPress={() => onAdd && onAdd(item)} label="Add" primary />
      </View>
    </CardLike>
  </View>
);

const ListingItemEvent: React.FC<any> = ({ item, onSelect }) => (
  <View style={{ marginBottom: 12 }}>
    <CardLike>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={styles.eventDot} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: appTheme.colors.textPrimary }}>{item.name}</Text>
          <Text style={{ color: appTheme.colors.textSecondary, marginTop: 4 }}>{new Date(item.start_date).toLocaleString()}</Text>
        </View>
        <View>
          <TouchableSmall onPress={() => onSelect && onSelect(item)} label="Open" />
        </View>
      </View>
    </CardLike>
  </View>
);

const CardLike: React.FC<any> = ({ children }) => (
  <View style={{ backgroundColor: appTheme.colors.surface, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 }}>
    {children}
  </View>
);

const TouchableSmall: React.FC<any> = ({ onPress, label, primary }) => (
  <Text onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: primary ? appTheme.colors.primary : appTheme.colors.surfaceElevated, color: primary ? appTheme.colors.surface : appTheme.colors.textPrimary, borderRadius: 8, fontWeight: '700', marginLeft: 8 }}>{label}</Text>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.colors.background, padding: 12 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: appTheme.colors.textPrimary, marginBottom: 4 },
  heroSubtitle: { color: appTheme.colors.textSecondary, marginBottom: 12 },
  panelsWrap: { flex: 1 },
  panelsRow: { flexDirection: 'row' },
  panelContainer: { flex: 1 },
  search: { marginBottom: 8, backgroundColor: appTheme.colors.surfaceElevated },
  thumbPlaceholder: { width: 64, height: 64, borderRadius: 8, backgroundColor: appTheme.colors.surfaceElevated },
  eventDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: appTheme.colors.primary },
  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: appTheme.colors.surfaceElevated },
  pillActive: { backgroundColor: appTheme.colors.primary },
  pillText: { color: appTheme.colors.textSecondary, fontWeight: '700' },
  pillTextActive: { color: appTheme.colors.surface },
});

export default DiscoveryListingScreen;
