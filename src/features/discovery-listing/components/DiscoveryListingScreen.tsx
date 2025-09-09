import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Searchbar, SegmentedButtons, Card, IconButton, Button } from 'react-native-paper';
import { DiscoveryListingProps } from '../containers/DiscoveryListingContainer';
import { appTheme } from '../../theme';

const DiscoveryListingScreen: React.FC<DiscoveryListingProps> = ({
  viewMode,
  contentType,
  products,
  events,
  isLoading,
  isRefreshing,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onViewModeChange,
  onContentTypeChange,
  onRefresh,
  onLoadMore,
  onProductSelect,
  onAddToCart,
}) => {
  const renderProduct = ({ item }: any) => (
    <Card style={styles.productCard} onPress={() => onProductSelect?.(item)}>
      <Card.Cover source={{ uri: item.image || 'https://via.placeholder.com/300' }} />
      <Card.Title title={item.title || item.name} subtitle={item.price ? `$${item.price}` : ''} />
      <Card.Actions>
        <Button onPress={() => onAddToCart?.(item)}>Add</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar placeholder={`Search ${contentType}...`} value={searchQuery} onChangeText={onSearchChange} onSubmitEditing={onSearchSubmit} style={styles.search} />
        <SegmentedButtons
          value={contentType}
          onValueChange={(v) => onContentTypeChange(v as any)}
          buttons={[{ value: 'products', label: 'Products' }, { value: 'events', label: 'Events' }]}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color={appTheme.colors.primary} />
      ) : (
        <FlatList
          data={contentType === 'products' ? products : events}
          renderItem={renderProduct}
          keyExtractor={(item: any) => item.id?.toString() || item._id || Math.random().toString()}
          onEndReached={onLoadMore}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: appTheme.colors.background },
  header: { padding: 12, backgroundColor: appTheme.colors.surface, borderBottomWidth: 1, borderBottomColor: appTheme.colors.border },
  search: { marginBottom: 8 },
  list: { padding: 12, gap: 12 },
  productCard: { marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  loader: { marginTop: 40 },
});

export default DiscoveryListingScreen;
