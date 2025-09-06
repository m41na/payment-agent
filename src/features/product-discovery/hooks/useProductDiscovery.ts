import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductDiscoveryService } from '../services/ProductDiscoveryService';
import {
  Product,
  ProductSearchQuery,
  ProductFilters,
  ProductSearchResult,
  ProductOperationResult,
  ProductAnalytics,
  ProductError,
  ProductSortBy,
  ProductAvailability,
  SearchSuggestion,
  SearchHistory,
  PRODUCT_CONSTANTS,
  DISCOVERY_CONSTANTS,
} from '../types';

interface UseProductDiscoveryState {
  // Products data
  products: Product[];
  totalCount: number;
  hasMore: boolean;
  
  // Search state
  searchQuery: string;
  searchResults: ProductSearchResult | null;
  searchSuggestions: SearchSuggestion[];
  searchHistory: SearchHistory[];
  
  // Filters and sorting
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
  
  // Error state
  error: ProductError | null;
  
  // Analytics
  analytics: ProductAnalytics | null;
  isLoadingAnalytics: boolean;
}

interface UseProductDiscoveryActions {
  // Search operations
  search: (query: string, resetPagination?: boolean) => Promise<void>;
  clearSearch: () => void;
  loadSearchSuggestions: (query: string) => Promise<void>;
  clearSearchSuggestions: () => void;
  
  // Filter operations
  updateFilters: (newFilters: Partial<ProductFilters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: ProductSortBy) => void;
  
  // Pagination
  loadMore: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setPageSize: (size: number) => void;
  
  // Product operations
  getProduct: (productId: string, userId?: string) => Promise<ProductOperationResult>;
  getTrendingProducts: () => Promise<void>;
  getNearbyProducts: (latitude: number, longitude: number, radius?: number) => Promise<void>;
  getProductsByCategory: (categoryId: string) => Promise<void>;
  
  // Analytics
  loadAnalytics: () => Promise<void>;
  
  // Search history
  loadSearchHistory: () => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  
  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

interface UseProductDiscoveryReturn extends UseProductDiscoveryState, UseProductDiscoveryActions {
  // Computed values
  isEmpty: boolean;
  isFirstLoad: boolean;
  hasFilters: boolean;
  searchMetadata: ProductSearchResult['search_metadata'] | null;
}

export function useProductDiscovery(initialFilters?: ProductFilters): UseProductDiscoveryReturn {
  const [state, setState] = useState<UseProductDiscoveryState>({
    products: [],
    totalCount: 0,
    hasMore: false,
    searchQuery: '',
    searchResults: null,
    searchSuggestions: [],
    searchHistory: [],
    filters: initialFilters || {},
    sortBy: ProductSortBy.NEWEST,
    currentPage: 0,
    pageSize: PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
    isLoading: false,
    isSearching: false,
    isLoadingMore: false,
    isLoadingSuggestions: false,
    error: null,
    analytics: null,
    isLoadingAnalytics: false,
  });

  const productService = useMemo(() => new ProductDiscoveryService(), []);

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

      const result = await productService.searchProducts(searchQuery);

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
  }, [productService, state.filters, state.sortBy, state.pageSize, state.currentPage]);

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

  // Load search suggestions
  const loadSearchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchSuggestions: [] }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoadingSuggestions: true }));
      
      const suggestions = await productService.getSearchSuggestions(query);
      
      setState(prev => ({
        ...prev,
        searchSuggestions: suggestions,
        isLoadingSuggestions: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoadingSuggestions: false,
        searchSuggestions: [],
      }));
    }
  }, [productService]);

  // Clear search suggestions
  const clearSearchSuggestions = useCallback(() => {
    setState(prev => ({ ...prev, searchSuggestions: [] }));
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
  const setSortBy = useCallback((sortBy: ProductSortBy) => {
    setState(prev => ({
      ...prev,
      sortBy,
      currentPage: 0,
      products: [],
    }));
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

      const result = await productService.searchProducts(searchQuery);

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
  }, [productService, state.searchQuery, state.filters, state.sortBy, state.pageSize, state.currentPage, state.isLoadingMore, state.hasMore]);

  // Go to specific page
  const goToPage = useCallback(async (page: number) => {
    if (page < 0) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const searchQuery: ProductSearchQuery = {
        query: state.searchQuery || undefined,
        ...state.filters,
        sort_by: state.sortBy,
        limit: state.pageSize,
        offset: page * state.pageSize,
      };

      const result = await productService.searchProducts(searchQuery);

      setState(prev => ({
        ...prev,
        products: result.products,
        totalCount: result.total_count,
        hasMore: result.has_more,
        currentPage: page,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
      }));
    }
  }, [productService, state.searchQuery, state.filters, state.sortBy, state.pageSize]);

  // Set page size
  const setPageSize = useCallback((size: number) => {
    const newSize = Math.min(size, PRODUCT_CONSTANTS.MAX_PAGE_SIZE);
    setState(prev => ({
      ...prev,
      pageSize: newSize,
      currentPage: 0,
      products: [],
    }));
  }, []);

  // Get single product
  const getProduct = useCallback(async (productId: string, userId?: string): Promise<ProductOperationResult> => {
    return await productService.getProduct(productId, userId);
  }, [productService]);

  // Get trending products
  const getTrendingProducts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const products = await productService.getTrendingProducts();
      
      setState(prev => ({
        ...prev,
        products,
        totalCount: products.length,
        hasMore: false,
        currentPage: 0,
        searchQuery: '',
        searchResults: null,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
      }));
    }
  }, [productService]);

  // Get nearby products
  const getNearbyProducts = useCallback(async (
    latitude: number,
    longitude: number,
    radius = PRODUCT_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const products = await productService.getNearbyProducts(latitude, longitude, radius);
      
      setState(prev => ({
        ...prev,
        products,
        totalCount: products.length,
        hasMore: false,
        currentPage: 0,
        searchQuery: '',
        searchResults: null,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
      }));
    }
  }, [productService]);

  // Get products by category
  const getProductsByCategory = useCallback(async (categoryId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const products = await productService.getProductsByCategory(
        categoryId,
        state.filters,
        state.pageSize,
        state.currentPage * state.pageSize
      );
      
      setState(prev => ({
        ...prev,
        products: prev.currentPage === 0 ? products : [...prev.products, ...products],
        hasMore: products.length === prev.pageSize,
        isLoading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
      }));
    }
  }, [productService, state.filters, state.pageSize, state.currentPage]);

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoadingAnalytics: true }));
      
      const analytics = await productService.getProductAnalytics();
      
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
  }, [productService]);

  // Load search history
  const loadSearchHistory = useCallback(async () => {
    try {
      const history = await productService.getSearchHistory();
      setState(prev => ({ ...prev, searchHistory: history }));
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  }, [productService]);

  // Clear search history
  const clearSearchHistory = useCallback(async () => {
    try {
      await productService.clearSearchHistory();
      setState(prev => ({ ...prev, searchHistory: [] }));
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  }, [productService]);

  // Refresh current view
  const refresh = useCallback(async () => {
    if (state.searchQuery) {
      await search(state.searchQuery, true);
    } else {
      // Refresh based on current context
      setState(prev => ({ ...prev, currentPage: 0, products: [] }));
      await search('', true);
    }
  }, [search, state.searchQuery]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Computed values
  const isEmpty = useMemo(() => state.products.length === 0 && !state.isLoading && !state.isSearching, [state.products.length, state.isLoading, state.isSearching]);
  
  const isFirstLoad = useMemo(() => state.products.length === 0 && state.currentPage === 0, [state.products.length, state.currentPage]);
  
  const hasFilters = useMemo(() => {
    return Object.keys(state.filters).some(key => {
      const value = state.filters[key as keyof ProductFilters];
      return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
    });
  }, [state.filters]);

  const searchMetadata = useMemo(() => state.searchResults?.search_metadata || null, [state.searchResults]);

  // Auto-search when filters or sort changes
  useEffect(() => {
    if (state.searchQuery || hasFilters) {
      const timeoutId = setTimeout(() => {
        search(state.searchQuery, true);
      }, DISCOVERY_CONSTANTS.SEARCH_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [state.filters, state.sortBy]); // Intentionally not including search to avoid infinite loop

  // Load search history on mount
  useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);

  return {
    // State
    ...state,
    
    // Actions
    search,
    clearSearch,
    loadSearchSuggestions,
    clearSearchSuggestions,
    updateFilters,
    clearFilters,
    setSortBy,
    loadMore,
    goToPage,
    setPageSize,
    getProduct,
    getTrendingProducts,
    getNearbyProducts,
    getProductsByCategory,
    loadAnalytics,
    loadSearchHistory,
    clearSearchHistory,
    refresh,
    clearError,
    
    // Computed values
    isEmpty,
    isFirstLoad,
    hasFilters,
    searchMetadata,
  };
}
