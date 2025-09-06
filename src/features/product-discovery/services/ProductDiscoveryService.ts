import { supabase } from '../../../shared/data/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Product,
  ProductSearchQuery,
  ProductFilters,
  ProductSearchResult,
  ProductOperationResult,
  ProductAnalytics,
  ProductError,
  ProductSortBy,
  ProductCondition,
  ProductAvailability,
  SearchSuggestion,
  SearchHistory,
  SavedSearch,
  SmartRankingConfig,
  PRODUCT_CONSTANTS,
  DISCOVERY_CONSTANTS,
} from '../types';
import { SortingService } from './SortingService';

export class ProductDiscoveryService {
  private static readonly STORAGE_KEYS = {
    SEARCH_HISTORY: '@product_search_history',
    DISCOVERY_PREFERENCES: '@product_discovery_preferences',
    CACHED_CATEGORIES: '@product_categories_cache',
  };

  /**
   * Search products with comprehensive filtering and sorting
   */
  async searchProducts(searchQuery: ProductSearchQuery): Promise<ProductSearchResult> {
    const startTime = Date.now();
    
    try {
      let query = supabase
        .from('pg_products')
        .select(`
          *,
          seller:pg_profiles!seller_id(
            id,
            full_name,
            avatar_url
          )
        `);

      // Apply availability filter
      if (searchQuery.availability === ProductAvailability.AVAILABLE) {
        query = query.eq('is_available', true);
      } else if (searchQuery.availability === ProductAvailability.SOLD) {
        query = query.eq('is_available', false);
      }

      // Apply text search
      if (searchQuery.query) {
        query = query.or(`title.ilike.%${searchQuery.query}%,description.ilike.%${searchQuery.query}%,tags.cs.{${searchQuery.query}}`);
      }

      // Apply category filter
      if (searchQuery.category_id) {
        query = query.eq('category', searchQuery.category_id);
      }

      // Apply condition filter
      if (searchQuery.condition && searchQuery.condition.length > 0) {
        query = query.in('condition', searchQuery.condition);
      }

      // Apply price range filter
      if (searchQuery.price_min !== undefined) {
        query = query.gte('price', searchQuery.price_min);
      }
      if (searchQuery.price_max !== undefined) {
        query = query.lte('price', searchQuery.price_max);
      }

      // Apply seller filter
      if (searchQuery.seller_id) {
        query = query.eq('seller_id', searchQuery.seller_id);
      }

      // Apply tags filter
      if (searchQuery.tags && searchQuery.tags.length > 0) {
        query = query.overlaps('tags', searchQuery.tags);
      }

      // Apply geographic filtering
      if (searchQuery.location) {
        const { latitude, longitude, radius_km } = searchQuery.location;
        // Use PostGIS for distance calculation
        query = query.rpc('products_within_radius', {
          lat: latitude,
          lng: longitude,
          radius_km: radius_km,
        });
      }

      // Apply sorting
      switch (searchQuery.sort_by) {
        case ProductSortBy.PRICE_LOW_TO_HIGH:
          query = query.order('price', { ascending: true });
          break;
        case ProductSortBy.PRICE_HIGH_TO_LOW:
          query = query.order('price', { ascending: false });
          break;
        case ProductSortBy.NEWEST:
          query = query.order('created_at', { ascending: false });
          break;
        case ProductSortBy.OLDEST:
          query = query.order('created_at', { ascending: true });
          break;
        case ProductSortBy.MOST_VIEWED:
          query = query.order('view_count', { ascending: false, nullsLast: true });
          break;
        case ProductSortBy.MOST_FAVORITED:
          query = query.order('favorite_count', { ascending: false, nullsLast: true });
          break;
        case ProductSortBy.DISTANCE:
          if (searchQuery.location) {
            query = query.order('distance', { ascending: true });
          } else {
            query = query.order('created_at', { ascending: false });
          }
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const limit = Math.min(searchQuery.limit || PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE, PRODUCT_CONSTANTS.MAX_PAGE_SIZE);
      const offset = searchQuery.offset || 0;
      
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        throw this.createError('SEARCH_ERROR', error.message, { error });
      }

      const searchTime = Date.now() - startTime;
      const transformedProducts = (products || []).map(product => this.transformProductData(product));

      // Save search to history
      if (searchQuery.query) {
        await this.saveSearchToHistory(searchQuery, transformedProducts.length);
      }

      return {
        products: transformedProducts,
        total_count: count || 0,
        has_more: transformedProducts.length === limit,
        search_metadata: {
          query: searchQuery.query || '',
          filters_applied: this.extractFiltersFromQuery(searchQuery),
          search_time_ms: searchTime,
          result_count: transformedProducts.length,
        },
      };
    } catch (error: any) {
      console.error('Error searching products:', error);
      throw error instanceof Error ? this.createError('SEARCH_ERROR', error.message) : error;
    }
  }

  /**
   * Get product by ID with view tracking
   */
  async getProduct(productId: string, userId?: string): Promise<ProductOperationResult> {
    try {
      const { data: product, error } = await supabase
        .from('pg_products')
        .select(`
          *,
          seller:pg_profiles!seller_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw this.createError('NOT_FOUND', 'Product not found');
        }
        throw this.createError('NETWORK_ERROR', error.message, { error });
      }

      // Track product view
      if (userId) {
        await this.trackProductView(productId, userId);
      }

      return {
        success: true,
        product: this.transformProductData(product),
      };
    } catch (error: any) {
      console.error('Error fetching product:', error);
      return {
        success: false,
        error: error instanceof Error ? this.createError('NETWORK_ERROR', error.message) : error,
      };
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categoryId: string,
    filters?: ProductFilters,
    limit: number = PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
    offset: number = 0
  ): Promise<Product[]> {
    try {
      let query = supabase
        .from('pg_products')
        .select(`
          *,
          seller:pg_profiles!seller_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('category', categoryId)
        .eq('is_available', true);

      // Apply additional filters
      if (filters) {
        query = this.applyFiltersToQuery(query, filters);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: products, error } = await query;

      if (error) {
        console.error('Error fetching products by category:', error);
        return [];
      }

      return (products || []).map(product => this.transformProductData(product));
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  }

  /**
   * Get trending/popular products
   */
  async getTrendingProducts(limit: number = DISCOVERY_CONSTANTS.POPULAR_PRODUCTS_LIMIT): Promise<Product[]> {
    try {
      const { data: products, error } = await supabase
        .from('pg_products')
        .select(`
          *,
          seller:pg_profiles!seller_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('is_available', true)
        .order('view_count', { ascending: false, nullsLast: true })
        .order('favorite_count', { ascending: false, nullsLast: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching trending products:', error);
        return [];
      }

      return (products || []).map(product => this.transformProductData(product));
    } catch (error) {
      console.error('Error fetching trending products:', error);
      return [];
    }
  }

  /**
   * Get nearby products based on user location
   */
  async getNearbyProducts(
    latitude: number,
    longitude: number,
    radiusKm: number = PRODUCT_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM,
    limit: number = PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE
  ): Promise<Product[]> {
    try {
      const { data: products, error } = await supabase
        .rpc('products_within_radius', {
          lat: latitude,
          lng: longitude,
          radius_km: radiusKm,
        })
        .select(`
          *,
          seller:pg_profiles!seller_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('is_available', true)
        .order('distance', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching nearby products:', error);
        return [];
      }

      return (products || []).map(product => this.transformProductData(product));
    } catch (error) {
      console.error('Error fetching nearby products:', error);
      return [];
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, limit: number = DISCOVERY_CONSTANTS.MAX_SUGGESTIONS): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];

      // Get category suggestions
      const { data: categories } = await supabase
        .from('pg_product_categories')
        .select('id, name, slug')
        .ilike('name', `%${query}%`)
        .limit(Math.floor(limit / 2));

      if (categories) {
        categories.forEach(category => {
          suggestions.push({
            id: `category_${category.id}`,
            text: category.name,
            type: 'category',
            popularity_score: 0.8,
            metadata: { category_id: category.id, slug: category.slug },
          });
        });
      }

      // Get tag suggestions from popular searches
      const { data: popularTags } = await supabase
        .from('pg_product_search_history')
        .select('tags')
        .not('tags', 'is', null)
        .limit(100);

      if (popularTags) {
        const tagCounts: Record<string, number> = {};
        popularTags.forEach(record => {
          if (record.tags) {
            record.tags.forEach((tag: string) => {
              if (tag.toLowerCase().includes(query.toLowerCase())) {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
              }
            });
          }
        });

        Object.entries(tagCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, Math.floor(limit / 2))
          .forEach(([tag, count]) => {
            suggestions.push({
              id: `tag_${tag}`,
              text: tag,
              type: 'tag',
              popularity_score: Math.min(count / 10, 1),
              metadata: { tag },
            });
          });
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      return [];
    }
  }

  /**
   * Track product view
   */
  async trackProductView(productId: string, userId: string): Promise<void> {
    try {
      // Insert view record
      await supabase
        .from('pg_product_views')
        .insert({
          product_id: productId,
          user_id: userId,
          viewed_at: new Date().toISOString(),
        });

      // Update product view count
      await supabase.rpc('increment_product_view_count', {
        product_id: productId,
      });
    } catch (error) {
      console.error('Error tracking product view:', error);
      // Don't throw error for view tracking failures
    }
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(): Promise<ProductAnalytics> {
    try {
      const [
        { data: totalStats },
        { data: categoryStats },
        { data: conditionStats },
        { data: priceStats },
        { data: trendingSearches },
      ] = await Promise.all([
        supabase.rpc('get_product_total_stats'),
        supabase.rpc('get_product_category_distribution'),
        supabase.rpc('get_product_condition_distribution'),
        supabase.rpc('get_product_price_distribution'),
        supabase.rpc('get_trending_product_searches', { limit_count: DISCOVERY_CONSTANTS.TRENDING_SEARCHES_LIMIT }),
      ]);

      const popularProducts = await this.getTrendingProducts();

      return {
        total_products: totalStats?.total_products || 0,
        available_products: totalStats?.available_products || 0,
        sold_products: totalStats?.sold_products || 0,
        categories_distribution: categoryStats || {},
        conditions_distribution: conditionStats || {},
        price_distribution: priceStats || {
          min: 0,
          max: 0,
          average: 0,
          median: 0,
        },
        geographic_distribution: [], // Would need separate query for geo data
        trending_searches: trendingSearches || [],
        popular_products: popularProducts,
      };
    } catch (error) {
      console.error('Error fetching product analytics:', error);
      throw this.createError('NETWORK_ERROR', 'Failed to fetch analytics data');
    }
  }

  /**
   * Save search to history
   */
  private async saveSearchToHistory(searchQuery: ProductSearchQuery, resultCount: number): Promise<void> {
    try {
      const historyItem: Omit<SearchHistory, 'id'> = {
        user_id: '', // Would be set from auth context
        query: searchQuery.query || '',
        filters: this.extractFiltersFromQuery(searchQuery),
        result_count: resultCount,
        searched_at: new Date().toISOString(),
      };

      // Save to local storage
      const existingHistory = await this.getSearchHistory();
      const updatedHistory = [historyItem, ...existingHistory.slice(0, DISCOVERY_CONSTANTS.MAX_SEARCH_HISTORY - 1)];
      
      await AsyncStorage.setItem(
        ProductDiscoveryService.STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error('Error saving search to history:', error);
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(): Promise<SearchHistory[]> {
    try {
      const historyData = await AsyncStorage.getItem(ProductDiscoveryService.STORAGE_KEYS.SEARCH_HISTORY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Error fetching search history:', error);
      return [];
    }
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ProductDiscoveryService.STORAGE_KEYS.SEARCH_HISTORY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }

  /**
   * Apply filters to Supabase query
   */
  private applyFiltersToQuery(query: any, filters: ProductFilters): any {
    if (filters.conditions && filters.conditions.length > 0) {
      query = query.in('condition', filters.conditions);
    }

    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined) {
        query = query.gte('price', filters.priceRange.min);
      }
      if (filters.priceRange.max !== undefined) {
        query = query.lte('price', filters.priceRange.max);
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.availability === ProductAvailability.AVAILABLE) {
      query = query.eq('is_available', true);
    } else if (filters.availability === ProductAvailability.SOLD) {
      query = query.eq('is_available', false);
    }

    return query;
  }

  /**
   * Extract filters from search query
   */
  private extractFiltersFromQuery(searchQuery: ProductSearchQuery): ProductFilters {
    return {
      categories: searchQuery.category_id ? [searchQuery.category_id] : undefined,
      conditions: searchQuery.condition,
      priceRange: (searchQuery.price_min !== undefined || searchQuery.price_max !== undefined) ? {
        min: searchQuery.price_min || 0,
        max: searchQuery.price_max || PRODUCT_CONSTANTS.MAX_PRICE,
      } : undefined,
      location: searchQuery.location ? {
        latitude: searchQuery.location.latitude,
        longitude: searchQuery.location.longitude,
        radius: searchQuery.location.radius_km,
      } : undefined,
      tags: searchQuery.tags,
      availability: searchQuery.availability,
    };
  }

  /**
   * Transform raw product data from database
   */
  private transformProductData(rawProduct: any): Product {
    return {
      id: rawProduct.id,
      seller_id: rawProduct.seller_id,
      title: rawProduct.title,
      description: rawProduct.description,
      price: rawProduct.price,
      category: rawProduct.category,
      condition: rawProduct.condition,
      images: rawProduct.images || [],
      latitude: rawProduct.latitude,
      longitude: rawProduct.longitude,
      location_name: rawProduct.location_name,
      address: rawProduct.address,
      tags: rawProduct.tags || [],
      is_available: rawProduct.is_available,
      inventory_count: rawProduct.inventory_count,
      created_at: rawProduct.created_at,
      updated_at: rawProduct.updated_at,
      distance: rawProduct.distance,
      view_count: rawProduct.view_count || 0,
      favorite_count: rawProduct.favorite_count || 0,
      seller: rawProduct.seller ? {
        id: rawProduct.seller.id,
        full_name: rawProduct.seller.full_name,
        avatar_url: rawProduct.seller.avatar_url,
        rating: rawProduct.seller.rating,
        total_sales: rawProduct.seller.total_sales,
        member_since: rawProduct.seller.created_at || rawProduct.seller.member_since,
      } : undefined,
    };
  }

  /**
   * Create standardized error
   */
  private createError(
    code: ProductError['code'],
    message: string,
    details?: Record<string, any>
  ): ProductError {
    return {
      code,
      message,
      details,
    };
  }
}
