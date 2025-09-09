import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Searchbar, SegmentedButtons, Card, IconButton, Button } from 'react-native-paper';
import { DiscoveryListingProps } from '../containers/DiscoveryListingContainer';
import { appTheme } from '../../theme';
import PrimaryButton from '../../shared/PrimaryButton';

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
      <Card.Content>
        <Card.Cover source={{ uri: item.image || 'https://via.placeholder.com/300' }} style={styles.cardImage} />
        <View style={styles.cardBody}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title || item.name}</Text>
          <Text style={styles.productPrice}>{item.price ? `$${item.price}` : ''}</Text>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button mode="outlined" onPress={() => onProductSelect?.(item)}>View</Button>
        <PrimaryButton onPress={() => onAddToCart?.(item)}>Add</PrimaryButton>
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
  cardImage: { height: 180, borderRadius: 12 },
  cardBody: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productTitle: { fontSize: 16, fontWeight: '600', color: appTheme.colors.textPrimary, flex: 1 },
  productPrice: { fontSize: 16, fontWeight: '700', color: appTheme.colors.primary, marginLeft: 12 },
  cardActions: { justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 },
  loader: { marginTop: 40 },
});

export default DiscoveryListingScreen;
