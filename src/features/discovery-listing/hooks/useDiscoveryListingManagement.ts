import { useMemo } from 'react';
import { useDiscoveryListing } from './useDiscoveryListing';
import {
  ProductFilters,
  ProductSortBy,
  Product,
} from '../types';

interface UseDiscoveryListingManagementOptions {
  userId?: string;
  initialFilters?: ProductFilters;
}

interface UseDiscoveryListingManagementReturn {
  // Discovery Listing
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
  error: any;
  clearError: () => void;
  isAnyLoading: boolean;
}

export function useDiscoveryListingManagement(
  options: UseDiscoveryListingManagementOptions = {}
): UseDiscoveryListingManagementReturn {
  const { userId = '', initialFilters } = options;

  // Initialize individual hooks
  const discovery = useDiscoveryListing(initialFilters);

  // Enhanced operations that combine multiple hooks
  const enhanced = useMemo(() => ({
    // Search and check favorite status for results
    searchAndFavoriteCheck: async (query: string, resetPagination = true) => {
      await discovery.search(query, resetPagination);
    },

    // Toggle favorite and refresh discovery if needed
    toggleFavoriteWithRefresh: async (productId: string): Promise<boolean> => {
      // If the product is in current discovery results, we might want to refresh
      // to get updated favorite counts
      const productInResults = discovery.products.some(p => p.id === productId);
      if (productInResults) {
        // Optionally refresh discovery to get updated counts
        // await discovery.refresh();
      }
      
      return true;
    },

    // Refresh all data
    refreshAll: async () => {
      await discovery.refresh();
    },

    // Load products and their favorite status
    loadProductsWithFavoriteStatus: async (productIds: string[]) => {
    },

    // Get analytics including favorites data
    getAnalyticsWithFavorites: async () => {
      await discovery.loadAnalytics();
      
      return {
        ...discovery.analytics,
      };
    },
  }), [discovery]);

  // Global error state
  const globalError = useMemo(() => {
    return discovery.error;
  }, [discovery.error]);

  // Global loading state
  const isAnyLoading = useMemo(() => {
    return discovery.isLoading || 
           discovery.isSearching || 
           discovery.isLoadingMore;
  }, [
    discovery.isLoading,
    discovery.isSearching,
    discovery.isLoadingMore,
  ]);

  // Global error clearing
  const clearError = () => {
    discovery.clearError();
  };

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
    
    enhanced,
    
    // Global state
    error: globalError,
    clearError,
    isAnyLoading,
  };
}
