// ============================================================================
// STOREFRONT DISCOVERY HOOK - Location-Based Storefront Search
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { StorefrontDiscoveryService } from '../services/StorefrontDiscoveryService';
import { 
  StorefrontDiscovery,
  StorefrontSearchFilter,
  BusinessLocation,
  StorefrontError,
  STOREFRONT_CONSTANTS
} from '../types';

interface StorefrontDiscoveryState {
  storefronts: StorefrontDiscovery[];
  featuredStorefronts: StorefrontDiscovery[];
  nearbyStorefronts: StorefrontDiscovery[];
  isLoading: boolean;
  isLoadingFeatured: boolean;
  isLoadingNearby: boolean;
  error: StorefrontError | null;
  searchQuery: string;
  currentFilter: StorefrontSearchFilter;
}

interface StorefrontDiscoveryActions {
  // Search & Discovery
  searchStorefronts: (filter: StorefrontSearchFilter) => Promise<void>;
  getNearbyStorefronts: (location: BusinessLocation, radius?: number) => Promise<void>;
  getFeaturedStorefronts: (limit?: number) => Promise<void>;
  getStorefrontById: (storefrontId: string) => Promise<StorefrontDiscovery | null>;
  
  // Filter Management
  updateFilter: (filter: Partial<StorefrontSearchFilter>) => Promise<void>;
  clearFilter: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  
  // Utility
  refreshSearch: () => Promise<void>;
  clearError: () => void;
  clearCache: () => Promise<void>;
}

export interface UseStorefrontDiscoveryReturn extends StorefrontDiscoveryState, StorefrontDiscoveryActions {
  // Computed Values
  hasResults: boolean;
  resultCount: number;
  
  // Helper Functions
  getStorefrontsByCategory: (category: string) => StorefrontDiscovery[];
  getOpenStorefronts: () => StorefrontDiscovery[];
  getStorefrontsWithDelivery: () => StorefrontDiscovery[];
  getStorefrontsByRating: (minRating: number) => StorefrontDiscovery[];
}

export function useStorefrontDiscovery(initialLocation?: BusinessLocation): UseStorefrontDiscoveryReturn {
  const [state, setState] = useState<StorefrontDiscoveryState>({
    storefronts: [],
    featuredStorefronts: [],
    nearbyStorefronts: [],
    isLoading: false,
    isLoadingFeatured: false,
    isLoadingNearby: false,
    error: null,
    searchQuery: '',
    currentFilter: initialLocation ? { location: initialLocation } : {}
  });

  const discoveryService = StorefrontDiscoveryService.getInstance();

  // ============================================================================
  // SEARCH & DISCOVERY ACTIONS
  // ============================================================================

  const searchStorefronts = useCallback(async (filter: StorefrontSearchFilter) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, currentFilter: filter }));

    try {
      const storefronts = await discoveryService.searchStorefronts(filter);
      setState(prev => ({
        ...prev,
        storefronts,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoading: false
      }));
    }
  }, [discoveryService]);

  const getNearbyStorefronts = useCallback(async (location: BusinessLocation, radius?: number) => {
    setState(prev => ({ ...prev, isLoadingNearby: true, error: null }));

    try {
      const nearbyStorefronts = await discoveryService.getNearbyStorefronts(location, radius);
      setState(prev => ({
        ...prev,
        nearbyStorefronts,
        isLoadingNearby: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoadingNearby: false
      }));
    }
  }, [discoveryService]);

  const getFeaturedStorefronts = useCallback(async (limit: number = 10) => {
    setState(prev => ({ ...prev, isLoadingFeatured: true, error: null }));

    try {
      const featuredStorefronts = await discoveryService.getFeaturedStorefronts(limit);
      setState(prev => ({
        ...prev,
        featuredStorefronts,
        isLoadingFeatured: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error as StorefrontError,
        isLoadingFeatured: false
      }));
    }
  }, [discoveryService]);

  const getStorefrontById = useCallback(async (storefrontId: string): Promise<StorefrontDiscovery | null> => {
    try {
      return await discoveryService.getStorefrontById(storefrontId);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error as StorefrontError }));
      return null;
    }
  }, [discoveryService]);

  // ============================================================================
  // FILTER MANAGEMENT ACTIONS
  // ============================================================================

  const updateFilter = useCallback(async (filterUpdate: Partial<StorefrontSearchFilter>) => {
    const newFilter = { ...state.currentFilter, ...filterUpdate };
    await searchStorefronts(newFilter);
  }, [state.currentFilter, searchStorefronts]);

  const clearFilter = useCallback(async () => {
    const baseFilter: StorefrontSearchFilter = initialLocation ? { location: initialLocation } : {};
    await searchStorefronts(baseFilter);
  }, [initialLocation, searchStorefronts]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // ============================================================================
  // UTILITY ACTIONS
  // ============================================================================

  const refreshSearch = useCallback(async () => {
    await searchStorefronts(state.currentFilter);
  }, [searchStorefronts, state.currentFilter]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearCache = useCallback(async () => {
    await discoveryService.clearCache();
  }, [discoveryService]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const hasResults = state.storefronts.length > 0;
  const resultCount = state.storefronts.length;

  const getStorefrontsByCategory = useCallback((category: string) => {
    return state.storefronts.filter(storefront => 
      storefront.categories.includes(category)
    );
  }, [state.storefronts]);

  const getOpenStorefronts = useCallback(() => {
    return state.storefronts.filter(storefront => storefront.is_open);
  }, [state.storefronts]);

  const getStorefrontsWithDelivery = useCallback(() => {
    return state.storefronts.filter(storefront => storefront.delivery_available);
  }, [state.storefronts]);

  const getStorefrontsByRating = useCallback((minRating: number) => {
    return state.storefronts.filter(storefront => 
      (storefront.rating || 0) >= minRating
    );
  }, [state.storefronts]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Load featured storefronts on mount
    getFeaturedStorefronts();
  }, [getFeaturedStorefronts]);

  useEffect(() => {
    // Load nearby storefronts when location is available
    if (initialLocation) {
      getNearbyStorefronts(initialLocation);
    }
  }, [initialLocation, getNearbyStorefronts]);

  useEffect(() => {
    // Perform search when search query changes (with debounce)
    if (state.searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        updateFilter({ 
          search_query: state.searchQuery.trim() 
        });
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [state.searchQuery, updateFilter]);

  return {
    // State
    storefronts: state.storefronts,
    featuredStorefronts: state.featuredStorefronts,
    nearbyStorefronts: state.nearbyStorefronts,
    isLoading: state.isLoading,
    isLoadingFeatured: state.isLoadingFeatured,
    isLoadingNearby: state.isLoadingNearby,
    error: state.error,
    searchQuery: state.searchQuery,
    currentFilter: state.currentFilter,

    // Actions
    searchStorefronts,
    getNearbyStorefronts,
    getFeaturedStorefronts,
    getStorefrontById,
    updateFilter,
    clearFilter,
    setSearchQuery,
    refreshSearch,
    clearError,
    clearCache,

    // Computed Values
    hasResults,
    resultCount,
    getStorefrontsByCategory,
    getOpenStorefronts,
    getStorefrontsWithDelivery,
    getStorefrontsByRating
  };
}
