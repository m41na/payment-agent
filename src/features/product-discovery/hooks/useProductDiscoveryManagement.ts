import { useMemo } from 'react';
import { useProductDiscovery } from './useProductDiscovery';
import { useProductFavorites } from './useProductFavorites';
import { useProductSync } from './useProductSync';
import {
  ProductFilters,
  ProductSortBy,
  ProductSyncEventType,
  Product,
  ProductError,
} from '../types';

interface UseProductDiscoveryManagementOptions {
  userId?: string;
  initialFilters?: ProductFilters;
  enableSync?: boolean;
}

interface UseProductDiscoveryManagementReturn {
  // Product Discovery
  discovery: {
    // Data
    products: Product[];
    totalCount: number;
    hasMore: boolean;
    searchQuery: string;
    searchSuggestions: any[];
    searchHistory: any[];
    filters: ProductFilters;
    sortBy: ProductSortBy;
    
    // Pagination
    currentPage: number;
    pageSize: number;
    
    // Loading states
    isLoading: boolean;
    isSearching: boolean;
    isLoadingMore: boolean;
    isLoadingSuggestions: boolean;
    
    // Computed values
    isEmpty: boolean;
    isFirstLoad: boolean;
    hasFilters: boolean;
    searchMetadata: any;
    
    // Actions
    search: (query: string, resetPagination?: boolean) => Promise<void>;
    clearSearch: () => void;
    loadSearchSuggestions: (query: string) => Promise<void>;
    clearSearchSuggestions: () => void;
    updateFilters: (newFilters: Partial<ProductFilters>) => void;
    clearFilters: () => void;
    setSortBy: (sortBy: ProductSortBy) => void;
    loadMore: () => Promise<void>;
    goToPage: (page: number) => Promise<void>;
    setPageSize: (size: number) => void;
    getProduct: (productId: string, userId?: string) => Promise<any>;
    getTrendingProducts: () => Promise<void>;
    getNearbyProducts: (latitude: number, longitude: number, radius?: number) => Promise<void>;
    getProductsByCategory: (categoryId: string) => Promise<void>;
    loadAnalytics: () => Promise<void>;
    loadSearchHistory: () => Promise<void>;
    clearSearchHistory: () => Promise<void>;
    refresh: () => Promise<void>;
  };
  
  // Favorites Management
  favorites: {
    // Data
    favorites: Product[];
    favoriteIds: Set<string>;
    favoritesCount: number;
    
    // Loading states
    isLoading: boolean;
    isLoadingMore: boolean;
    isToggling: Record<string, boolean>;
    isSyncing: boolean;
    
    // Pagination
    currentPage: number;
    pageSize: number;
    hasMore: boolean;
    
    // Computed values
    isEmpty: boolean;
    isFirstLoad: boolean;
    
    // Actions
    addToFavorites: (productId: string) => Promise<boolean>;
    removeFromFavorites: (productId: string) => Promise<boolean>;
    toggleFavorite: (productId: string) => Promise<boolean>;
    checkFavoriteStatus: (productIds: string[]) => Promise<Record<string, boolean>>;
    clearAllFavorites: () => Promise<boolean>;
    loadFavorites: (reset?: boolean) => Promise<void>;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    isProductFavorited: (productId: string) => boolean;
    syncOfflineFavorites: () => Promise<void>;
  };
  
  // Real-time Sync
  sync: {
    // Connection state
    syncState: any;
    isConnected: boolean;
    isConnecting: boolean;
    hasError: boolean;
    
    // Sync events
    lastSyncEvent: any;
    lastSyncTimestamp: string | null;
    
    // Actions
    initialize: () => Promise<void>;
    cleanup: () => Promise<void>;
    forceSyncRefresh: () => Promise<void>;
    registerCallback: (key: string, callback: any) => void;
    unregisterCallback: (key: string, callback?: any) => void;
  };
  
  // Enhanced Operations
  enhanced: {
    // Combined operations
    searchAndFavoriteCheck: (query: string, resetPagination?: boolean) => Promise<void>;
    toggleFavoriteWithRefresh: (productId: string) => Promise<boolean>;
    refreshAll: () => Promise<void>;
    
    // Batch operations
    loadProductsWithFavoriteStatus: (productIds: string[]) => Promise<void>;
    
    // Analytics with favorites
    getAnalyticsWithFavorites: () => Promise<any>;
  };
  
  // Global state
  error: ProductError | null;
  clearError: () => void;
  isAnyLoading: boolean;
}

export function useProductDiscoveryManagement(
  options: UseProductDiscoveryManagementOptions = {}
): UseProductDiscoveryManagementReturn {
  const { userId = '', initialFilters, enableSync = true } = options;

  // Initialize individual hooks
  const discovery = useProductDiscovery(initialFilters);
  const favorites = useProductFavorites(userId);
  const sync = useProductSync();

  // Enhanced operations that combine multiple hooks
  const enhanced = useMemo(() => ({
    // Search and check favorite status for results
    searchAndFavoriteCheck: async (query: string, resetPagination = true) => {
      await discovery.search(query, resetPagination);
      
      if (userId && discovery.products.length > 0) {
        const productIds = discovery.products.map(p => p.id);
        await favorites.checkFavoriteStatus(productIds);
      }
    },

    // Toggle favorite and refresh discovery if needed
    toggleFavoriteWithRefresh: async (productId: string): Promise<boolean> => {
      const success = await favorites.toggleFavorite(productId);
      
      if (success) {
        // If the product is in current discovery results, we might want to refresh
        // to get updated favorite counts
        const productInResults = discovery.products.some(p => p.id === productId);
        if (productInResults) {
          // Optionally refresh discovery to get updated counts
          // await discovery.refresh();
        }
      }
      
      return success;
    },

    // Refresh all data
    refreshAll: async () => {
      await Promise.all([
        discovery.refresh(),
        favorites.refresh(),
        enableSync ? sync.forceSyncRefresh() : Promise.resolve(),
      ]);
    },

    // Load products and their favorite status
    loadProductsWithFavoriteStatus: async (productIds: string[]) => {
      if (userId && productIds.length > 0) {
        await favorites.checkFavoriteStatus(productIds);
      }
    },

    // Get analytics including favorites data
    getAnalyticsWithFavorites: async () => {
      await discovery.loadAnalytics();
      
      return {
        ...discovery.analytics,
        user_favorites_count: favorites.favoritesCount,
        user_has_favorites: favorites.favoritesCount > 0,
      };
    },
  }), [discovery, favorites, sync, userId, enableSync]);

  // Global error state (prioritize discovery errors, then favorites, then sync)
  const globalError = useMemo(() => {
    return discovery.error || favorites.error || sync.error;
  }, [discovery.error, favorites.error, sync.error]);

  // Global loading state
  const isAnyLoading = useMemo(() => {
    return discovery.isLoading || 
           discovery.isSearching || 
           discovery.isLoadingMore ||
           favorites.isLoading || 
           favorites.isLoadingMore || 
           favorites.isSyncing ||
           sync.isConnecting;
  }, [
    discovery.isLoading,
    discovery.isSearching,
    discovery.isLoadingMore,
    favorites.isLoading,
    favorites.isLoadingMore,
    favorites.isSyncing,
    sync.isConnecting,
  ]);

  // Global error clearing
  const clearError = () => {
    discovery.clearError();
    favorites.clearError();
    sync.clearError();
  };

  // Initialize sync if enabled
  useMemo(() => {
    if (enableSync && !sync.isConnected && !sync.isConnecting) {
      sync.initialize().catch(console.error);
    }
  }, [enableSync, sync]);

  // Register sync callbacks for real-time updates
  useMemo(() => {
    if (enableSync && userId) {
      const handleProductSync = (event: any) => {
        switch (event.type) {
          case ProductSyncEventType.PRODUCT_CREATED:
          case ProductSyncEventType.PRODUCT_UPDATED:
          case ProductSyncEventType.PRODUCT_DELETED:
            // Refresh discovery if we're viewing products
            if (discovery.products.length > 0) {
              discovery.refresh();
            }
            break;
            
          case ProductSyncEventType.PRODUCT_FAVORITED:
          case ProductSyncEventType.PRODUCT_UNFAVORITED:
            // Update favorites if it's for this user
            if (event.user_id === userId) {
              favorites.refresh();
            }
            // Also refresh discovery to update favorite counts
            if (discovery.products.length > 0) {
              discovery.refresh();
            }
            break;
            
          case ProductSyncEventType.PRODUCT_VIEWED:
            // Update view counts in discovery
            if (discovery.products.length > 0) {
              const productInResults = discovery.products.some(p => p.id === event.product_id);
              if (productInResults) {
                // Optionally refresh to get updated view counts
                // discovery.refresh();
              }
            }
            break;
        }
      };

      sync.registerCallback('product_discovery_management', handleProductSync);

      return () => {
        sync.unregisterCallback('product_discovery_management', handleProductSync);
      };
    }
  }, [enableSync, userId, discovery, favorites, sync]);

  return {
    discovery: {
      // Data
      products: discovery.products,
      totalCount: discovery.totalCount,
      hasMore: discovery.hasMore,
      searchQuery: discovery.searchQuery,
      searchSuggestions: discovery.searchSuggestions,
      searchHistory: discovery.searchHistory,
      filters: discovery.filters,
      sortBy: discovery.sortBy,
      
      // Pagination
      currentPage: discovery.currentPage,
      pageSize: discovery.pageSize,
      
      // Loading states
      isLoading: discovery.isLoading,
      isSearching: discovery.isSearching,
      isLoadingMore: discovery.isLoadingMore,
      isLoadingSuggestions: discovery.isLoadingSuggestions,
      
      // Computed values
      isEmpty: discovery.isEmpty,
      isFirstLoad: discovery.isFirstLoad,
      hasFilters: discovery.hasFilters,
      searchMetadata: discovery.searchMetadata,
      
      // Actions
      search: discovery.search,
      clearSearch: discovery.clearSearch,
      loadSearchSuggestions: discovery.loadSearchSuggestions,
      clearSearchSuggestions: discovery.clearSearchSuggestions,
      updateFilters: discovery.updateFilters,
      clearFilters: discovery.clearFilters,
      setSortBy: discovery.setSortBy,
      loadMore: discovery.loadMore,
      goToPage: discovery.goToPage,
      setPageSize: discovery.setPageSize,
      getProduct: discovery.getProduct,
      getTrendingProducts: discovery.getTrendingProducts,
      getNearbyProducts: discovery.getNearbyProducts,
      getProductsByCategory: discovery.getProductsByCategory,
      loadAnalytics: discovery.loadAnalytics,
      loadSearchHistory: discovery.loadSearchHistory,
      clearSearchHistory: discovery.clearSearchHistory,
      refresh: discovery.refresh,
    },
    
    favorites: {
      // Data
      favorites: favorites.favorites,
      favoriteIds: favorites.favoriteIds,
      favoritesCount: favorites.favoritesCount,
      
      // Loading states
      isLoading: favorites.isLoading,
      isLoadingMore: favorites.isLoadingMore,
      isToggling: favorites.isToggling,
      isSyncing: favorites.isSyncing,
      
      // Pagination
      currentPage: favorites.currentPage,
      pageSize: favorites.pageSize,
      hasMore: favorites.hasMore,
      
      // Computed values
      isEmpty: favorites.isEmpty,
      isFirstLoad: favorites.isFirstLoad,
      
      // Actions
      addToFavorites: favorites.addToFavorites,
      removeFromFavorites: favorites.removeFromFavorites,
      toggleFavorite: favorites.toggleFavorite,
      checkFavoriteStatus: favorites.checkFavoriteStatus,
      clearAllFavorites: favorites.clearAllFavorites,
      loadFavorites: favorites.loadFavorites,
      loadMore: favorites.loadMore,
      refresh: favorites.refresh,
      isProductFavorited: favorites.isProductFavorited,
      syncOfflineFavorites: favorites.syncOfflineFavorites,
    },
    
    sync: {
      // Connection state
      syncState: sync.syncState,
      isConnected: sync.isConnected,
      isConnecting: sync.isConnecting,
      hasError: sync.hasError,
      
      // Sync events
      lastSyncEvent: sync.lastSyncEvent,
      lastSyncTimestamp: sync.lastSyncTimestamp,
      
      // Actions
      initialize: sync.initialize,
      cleanup: sync.cleanup,
      forceSyncRefresh: sync.forceSyncRefresh,
      registerCallback: sync.registerCallback,
      unregisterCallback: sync.unregisterCallback,
    },
    
    enhanced,
    
    // Global state
    error: globalError,
    clearError,
    isAnyLoading,
  };
}
