import React, { useState, useEffect, useCallback } from 'react';
import { FlatList, View, Text, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEventListener, useEventEmitter, EVENT_TYPES } from '../../../events';
import { useLocationServicesContext } from '../../../providers/LocationServicesProvider';
import { useDiscoveryListingContext } from '../../../providers/DiscoveryListingProvider';
import { useReferralSystemContext } from '../../../providers/ReferralSystemProvider';
import { appTheme } from '../../theme';

interface Product {
  id: string;
  name: string;
  price: number;
  merchantId: string;
  merchantName: string;
  distance?: number;
  referralBoost?: number;
  category: string;
  imageUrl?: string;
  description: string;
}

/**
 * Location-Aware Product Discovery Component
 * 
 * Integrates multiple features for intelligent product discovery:
 * - Location Services: Proximity-based filtering and sorting
 * - Referral System: Referral boost scoring for recommendations
 * - Product Discovery: Advanced sorting algorithms
 * - Event System: Real-time updates and cross-feature communication
 */
export const LocationAwareProductList: React.FC = () => {
  const { location, loading: locationLoading } = useLocationServicesContext();
  const { products, searchProducts, isLoading, refreshProducts } = useDiscoveryListingContext();
  const { getUserReferralBoosts } = useReferralSystemContext();
  const emitEvent = useEventEmitter();

  const [refreshing, setRefreshing] = useState(false);
  const [referralBoosts, setReferralBoosts] = useState<Record<string, number>>({});

  // Listen for location updates to refresh product discovery
  useEventListener(EVENT_TYPES.LOCATION_UPDATE, async (locationData) => {
    console.log('Location updated, refreshing product discovery:', locationData);
    await handleLocationBasedRefresh();
  });

  // Listen for referral updates to recalculate product scores
  useEventListener(EVENT_TYPES.REFERRAL_REWARD_EARNED, async (referralData) => {
    console.log('Referral reward earned, updating product boosts:', referralData);
    await loadReferralBoosts();
  });

  // Listen for product purchases to emit analytics events
  useEventListener(EVENT_TYPES.PRODUCT_PURCHASED, async (purchaseData) => {
    console.log('Product purchased, updating recommendations:', purchaseData);
    // Trigger recommendation refresh based on purchase behavior
    await refreshProducts();
  });

  // Enhanced product list with location and referral integration
  const enhancedProducts = useCallback(() => {
    if (!products || products.length === 0) return [];

    return products.map(product => {
      const enhanced = { ...product };

      // Add distance calculation if location is available
      if (location && product.location) {
        enhanced.distance = calculateDistance(
          location.latitude,
          location.longitude,
          product.location.latitude,
          product.location.longitude
        );
      }

      // Add referral boost scoring
      enhanced.referralBoost = referralBoosts[product.merchantId] || 0;

      return enhanced;
    }).sort((a, b) => {
      // Multi-criteria sorting: proximity + referral boost + price
      const aScore = calculateProductScore(a);
      const bScore = calculateProductScore(b);
      return bScore - aScore; // Higher score first
    });
  }, [products, location, referralBoosts]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const calculateProductScore = (product: Product): number => {
    let score = 100; // Base score

    // Proximity bonus (closer = higher score)
    if (product.distance !== undefined) {
      const proximityBonus = Math.max(0, 50 - (product.distance * 2));
      score += proximityBonus;
    }

    // Referral boost bonus
    if (product.referralBoost) {
      score += product.referralBoost * 10;
    }

    // Price competitiveness (lower price = slight bonus)
    const priceBonus = Math.max(0, 20 - (product.price / 10));
    score += priceBonus;

    return score;
  };

  const loadReferralBoosts = async () => {
    try {
      const boosts = await getUserReferralBoosts();
      setReferralBoosts(boosts);
    } catch (error) {
      console.error('Failed to load referral boosts:', error);
    }
  };

  const handleLocationBasedRefresh = async () => {
    if (!location) return;

    try {
      await searchProducts({
        location,
        radius: 10, // 10km radius
        sortBy: 'proximity',
      });
    } catch (error) {
      console.error('Location-based refresh failed:', error);
    }
  };

  const handleProductPress = async (product: Product) => {
    // Emit product viewed event for analytics
    await emitEvent(EVENT_TYPES.PRODUCT_VIEWED, {
      userId: 'current-user', // Would come from auth context
      productId: product.id,
      merchantId: product.merchantId,
      category: product.category,
      timestamp: new Date(),
    });

    // Navigate to product details (would integrate with navigation)
    console.log('Navigate to product:', product.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProducts(),
        loadReferralBoosts(),
      ]);
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReferralBoosts();
  }, []);

  const renderProduct = ({ item: product }: { item: Product }) => (
    <TouchableOpacity
      style={{ marginBottom: 12 }}
      onPress={() => handleProductPress(product)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 4 }}>
            {product.name}
          </Text>
          <Text style={{ fontSize: 14, color: appTheme.colors.textSecondary, marginBottom: 4 }}>
            {product.merchantName}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '500', color: appTheme.colors.primary }}>
            ${product.price.toFixed(2)}
          </Text>
        </View>
        
        <View style={{ alignItems: 'flex-end' }}>
          {product.distance !== undefined && (
            <Text style={{ fontSize: 12, color: appTheme.colors.textSecondary, marginBottom: 2 }}>
              {product.distance.toFixed(1)} km away
            </Text>
          )}
          {product.referralBoost && product.referralBoost > 0 && (
            <View style={{ 
              backgroundColor: appTheme.colors.success, 
              paddingHorizontal: 6, 
              paddingVertical: 2, 
              borderRadius: 4 
            }}>
              <Text style={{ fontSize: 10, color: appTheme.colors.surface, fontWeight: '500' }}>
                +{product.referralBoost}% boost
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <Text style={{ fontSize: 14, color: appTheme.colors.textSecondary, marginTop: 8 }}>
        {product.description}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <ActivityIndicator 
        size="large" 
        color="#2196F3" 
        style={{ flex: 1 }}
      />
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {locationLoading && (
        <View style={{ marginBottom: 16, backgroundColor: appTheme.colors.warning, padding: 16 }}>
          <Text style={{ color: appTheme.colors.warning, textAlign: 'center' }}>
            Loading location...
          </Text>
        </View>
      )}

      <FlatList
        data={enhancedProducts()}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 16, color: appTheme.colors.textSecondary, textAlign: 'center' }}>
              No products found in your area.{'\n'}
              Try expanding your search radius or check back later.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default LocationAwareProductList;
