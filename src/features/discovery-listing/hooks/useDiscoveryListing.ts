import { useState, useEffect, useCallback, useMemo } from 'react';
import { DiscoveryListingService } from '../services/DiscoveryListingService';
import {
  Product,
  ProductSearchQuery,
  ProductSearchResult,
  ProductFilters,
  ProductSortBy,
  ProductError,
  ProductAnalytics,
  ViewMode,
  ProductAvailability,
  ProductCondition,
  PRODUCT_CONSTANTS,
  DISCOVERY_CONSTANTS,
} from '../types';

interface UseDiscoveryListingState {
  // Products data
  products: Product[];
  totalCount: number;
  hasMore: boolean;
  
  // Search state
  searchQuery: string;
  filters: ProductFilters;
  sortBy: ProductSortBy;
  viewMode: ViewMode;
  
  // Pagination
  currentPage: number;
  pageSize: number;
  
  // Loading states
  isLoading: boolean;
  isSearching: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  
  // Error state
  error: ProductError | null;
  
  // Analytics
  analytics: ProductAnalytics | null;
  isLoadingAnalytics: boolean;
}

interface UseDiscoveryListingActions {
  // Search operations
  search: (query: string, resetPagination?: boolean) => Promise<void>;
  clearSearch: () => void;
  
  // Filter operations
  updateFilters: (filters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  
  // Sort operations
  updateSort: (sortBy: ProductSortBy) => void;
  
  // View operations
  setViewMode: (mode: ViewMode) => void;
  
  // Pagination
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Product operations
  getProduct: (id: string) => Promise<Product | null>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  
  // Analytics
  loadAnalytics: () => Promise<void>;
  
  // Utility
  clearError: () => void;
}

interface UseDiscoveryListingReturn extends UseDiscoveryListingState, UseDiscoveryListingActions {
  // Computed values
  isEmpty: boolean;
  isFirstLoad: boolean;
  hasFilters: boolean;
  searchMetadata: ProductSearchResult['search_metadata'] | null;
}

export function useDiscoveryListing(initialFilters?: ProductFilters): UseDiscoveryListingReturn {
  const [state, setState] = useState<UseDiscoveryListingState>({
    products: [],
    totalCount: 0,
    hasMore: false,
    searchQuery: '',
    filters: initialFilters || {},
    sortBy: ProductSortBy.NEWEST,
    viewMode: ViewMode.GRID,
    currentPage: 0,
    pageSize: PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
    isLoading: false,
    isSearching: false,
    isLoadingMore: false,
    isRefreshing: false,
    error: null,
    analytics: null,
    isLoadingAnalytics: false,
  });

  const discoveryListingService = useMemo(() => new DiscoveryListingService(), []);

  // Search products
  const search = useCallback(async (query: string, resetPagination = true) => {
    try {
      setState(prev => ({
        ...prev,
        isSearching: true,
        error: null,
        searchQuery: query,
        ...(resetPagination && { currentPage: 0, products: [] }),
      }));

      const searchQuery: ProductSearchQuery = {
        query: query || undefined,
        ...state.filters,
        sort_by: state.sortBy,
        limit: state.pageSize,
        offset: resetPagination ? 0 : state.currentPage * state.pageSize,
      };

      const result = await discoveryListingService.searchProducts(searchQuery);

      setState(prev => ({
        ...prev,
        products: resetPagination ? result.products : [...prev.products, ...result.products],
        totalCount: result.total_count,
        hasMore: result.has_more,
        searchResults: result,
        isSearching: false,
        currentPage: resetPagination ? 1 : prev.currentPage + 1,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: error,
      }));
    }
  }, [discoveryListingService, state.filters, state.sortBy, state.pageSize, state.currentPage]);

  // Clear search
  const clearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQuery: '',
      searchResults: null,
      products: [],
      totalCount: 0,
      hasMore: false,
      currentPage: 0,
      error: null,
    }));
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      currentPage: 0,
      products: [],
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      currentPage: 0,
      products: [],
    }));
  }, []);

  // Set sort by
  const updateSort = useCallback((sortBy: ProductSortBy) => {
    setState(prev => ({
      ...prev,
      sortBy,
      currentPage: 0,
      products: [],
    }));
  }, []);

  // Set view mode
  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  // Load more products
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return;

    try {
      setState(prev => ({ ...prev, isLoadingMore: true, error: null }));

      const searchQuery: ProductSearchQuery = {
        query: state.searchQuery || undefined,
        ...state.filters,
        sort_by: state.sortBy,
        limit: state.pageSize,
        offset: state.currentPage * state.pageSize,
      };

      const result = await discoveryListingService.searchProducts(searchQuery);

      setState(prev => ({
        ...prev,
        products: [...prev.products, ...result.products],
        hasMore: result.has_more,
        isLoadingMore: false,
        currentPage: prev.currentPage + 1,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
        error: error,
      }));
    }
  }, [discoveryListingService, state.searchQuery, state.filters, state.sortBy, state.pageSize, state.currentPage, state.isLoadingMore, state.hasMore]);

  // Get single product
  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    return await discoveryListingService.getProduct(id);
  }, [discoveryListingService]);

  // Update product
  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<boolean> => {
    try {
      const result = await discoveryListingService.updateProduct(id, updates);
      if (result.success) {
        // Update local state if product is in current results
        setState(prev => ({
          ...prev,
          products: prev.products.map(p => p.id === id ? { ...p, ...updates } : p),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    }
  }, [discoveryListingService]);

  // Delete product
  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await discoveryListingService.deleteProduct(id);
      if (result.success) {
        // Remove from local state
        setState(prev => ({
          ...prev,
          products: prev.products.filter(p => p.id !== id),
          totalCount: prev.totalCount - 1,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  }, [discoveryListingService]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoadingAnalytics: true }));
      
      const analytics = await discoveryListingService.getProductAnalytics();
      
      setState(prev => ({
        ...prev,
        analytics,
        isLoadingAnalytics: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoadingAnalytics: false,
        error: error,
      }));
    }
  }, [discoveryListingService]);

  // Refresh current view
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      if (state.searchQuery) {
        await search(state.searchQuery, true);
      } else {
        // Refresh with current filters
        const searchQuery: ProductSearchQuery = {
          ...state.filters,
          sort_by: state.sortBy,
          limit: state.pageSize,
          offset: 0,
        };

        const result = await discoveryListingService.searchProducts(searchQuery);

        setState(prev => ({
          ...prev,
          products: result.products,
          totalCount: result.total_count,
          hasMore: result.has_more,
          currentPage: 0,
          isRefreshing: false,
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: error,
      }));
    }
  }, [discoveryListingService, state.searchQuery, state.filters, state.sortBy, state.pageSize, search]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Computed values
  const isEmpty = useMemo(() => state.products.length === 0 && !state.isLoading, [state.products.length, state.isLoading]);
  const isFirstLoad = useMemo(() => state.products.length === 0 && state.isLoading, [state.products.length, state.isLoading]);
  const hasFilters = useMemo(() => {
    return Object.keys(state.filters).length > 0;
  }, [state.filters]);

  const searchMetadata = useMemo(() => {
    if (!state.searchQuery) return null;
    return {
      query: state.searchQuery,
      filters_applied: state.filters,
      search_time_ms: 0, // Would be populated by actual search
      result_count: state.totalCount,
    };
  }, [state.searchQuery, state.filters, state.totalCount]);

  return {
    // State
    ...state,
    
    // Actions
    search,
    clearSearch,
    updateFilters,
    clearFilters,
    updateSort,
    setViewMode,
    loadMore,
    refresh,
    getProduct,
    updateProduct,
    deleteProduct,
    loadAnalytics,
    clearError,
    
    // Computed values
    isEmpty,
    isFirstLoad,
    hasFilters,
    searchMetadata,
  };
}
