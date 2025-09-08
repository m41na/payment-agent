import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductFavoritesService } from '../services/ProductFavoritesService';
import {
  Product,
  ProductFavorite,
  ProductFavoriteOperationResult,
  ProductError,
  PRODUCT_CONSTANTS,
} from '../types';

interface UseProductFavoritesState {
  // Favorites data
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
  
  // Error state
  error: ProductError | null;
}

interface UseProductFavoritesActions {
  // Favorite operations
  addToFavorites: (productId: string) => Promise<boolean>;
  removeFromFavorites: (productId: string) => Promise<boolean>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  
  // Batch operations
  checkFavoriteStatus: (productIds: string[]) => Promise<Record<string, boolean>>;
  clearAllFavorites: () => Promise<boolean>;
  
  // Data loading
  loadFavorites: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Utility
  isProductFavorited: (productId: string) => boolean;
  syncOfflineFavorites: () => Promise<void>;
  clearError: () => void;
}

interface UseProductFavoritesReturn extends UseProductFavoritesState, UseProductFavoritesActions {
  // Computed values
  isEmpty: boolean;
  isFirstLoad: boolean;
}

export function useProductFavorites(userId: string): UseProductFavoritesReturn {
  const [state, setState] = useState<UseProductFavoritesState>({
    favorites: [],
    favoriteIds: new Set(),
    favoritesCount: 0,
    isLoading: false,
    isLoadingMore: false,
    isToggling: {},
    isSyncing: false,
    currentPage: 0,
    pageSize: PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
    hasMore: false,
    error: null,
  });

  const favoritesService = useMemo(() => new ProductFavoritesService(), []);

  // Add product to favorites
  const addToFavorites = useCallback(async (productId: string): Promise<boolean> => {
    if (!userId || state.isToggling[productId]) return false;

    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        favoriteIds: new Set([...prev.favoriteIds, productId]),
        isToggling: { ...prev.isToggling, [productId]: true },
        error: null,
      }));

      const result = await favoritesService.addToFavorites(productId, userId);

      if (result.success) {
        setState(prev => ({
          ...prev,
          favoritesCount: prev.favoritesCount + 1,
          isToggling: { ...prev.isToggling, [productId]: false },
        }));
        return true;
      } else {
        // Revert optimistic update
        setState(prev => ({
          ...prev,
          favoriteIds: new Set([...prev.favoriteIds].filter(id => id !== productId)),
          isToggling: { ...prev.isToggling, [productId]: false },
          error: result.error || null,
        }));
        return false;
      }
    } catch (error: any) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        favoriteIds: new Set([...prev.favoriteIds].filter(id => id !== productId)),
        isToggling: { ...prev.isToggling, [productId]: false },
        error: error,
      }));
      return false;
    }
  }, [favoritesService, userId, state.isToggling]);

  // Remove product from favorites
  const removeFromFavorites = useCallback(async (productId: string): Promise<boolean> => {
    if (!userId || state.isToggling[productId]) return false;

    try {
      // Optimistic update
      setState(prev => ({
        ...prev,
        favoriteIds: new Set([...prev.favoriteIds].filter(id => id !== productId)),
        favorites: prev.favorites.filter(product => product.id !== productId),
        isToggling: { ...prev.isToggling, [productId]: true },
        error: null,
      }));

      const result = await favoritesService.removeFromFavorites(productId, userId);

      if (result.success) {
        setState(prev => ({
          ...prev,
          favoritesCount: Math.max(0, prev.favoritesCount - 1),
          isToggling: { ...prev.isToggling, [productId]: false },
        }));
        return true;
      } else {
        // Revert optimistic update - would need to reload favorites to restore product
        setState(prev => ({
          ...prev,
          favoriteIds: new Set([...prev.favoriteIds, productId]),
          isToggling: { ...prev.isToggling, [productId]: false },
          error: result.error || null,
        }));
        // Reload favorites to restore the removed product
        await loadFavorites(true);
        return false;
      }
    } catch (error: any) {
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        favoriteIds: new Set([...prev.favoriteIds, productId]),
        isToggling: { ...prev.isToggling, [productId]: false },
        error: error,
      }));
      // Reload favorites to restore the removed product
      await loadFavorites(true);
      return false;
    }
  }, [favoritesService, userId, state.isToggling, state.favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    const isFavorited = state.favoriteIds.has(productId);
    
    if (isFavorited) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId);
    }
  }, [state.favoriteIds, addToFavorites, removeFromFavorites]);

  // Check favorite status for multiple products
  const checkFavoriteStatus = useCallback(async (productIds: string[]): Promise<Record<string, boolean>> => {
    if (!userId || productIds.length === 0) return {};

    try {
      const statusMap = await favoritesService.getProductsFavoriteStatus(productIds, userId);
      
      // Update local state with the results
      setState(prev => {
        const newFavoriteIds = new Set(prev.favoriteIds);
        Object.entries(statusMap).forEach(([productId, isFavorited]) => {
          if (isFavorited) {
            newFavoriteIds.add(productId);
          } else {
            newFavoriteIds.delete(productId);
          }
        });
        
        return {
          ...prev,
          favoriteIds: newFavoriteIds,
        };
      });

      return statusMap;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return {};
    }
  }, [favoritesService, userId]);

  // Clear all favorites
  const clearAllFavorites = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const success = await favoritesService.clearAllFavorites(userId);

      if (success) {
        setState(prev => ({
          ...prev,
          favorites: [],
          favoriteIds: new Set(),
          favoritesCount: 0,
          currentPage: 0,
          hasMore: false,
          isLoading: false,
        }));
        return true;
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
      }));
      return false;
    }
  }, [favoritesService, userId]);

  // Load favorites
  const loadFavorites = useCallback(async (reset = false) => {
    if (!userId) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: reset || prev.favorites.length === 0,
        error: null,
        ...(reset && { currentPage: 0, favorites: [] }),
      }));

      const page = reset ? 0 : state.currentPage;
      const favorites = await favoritesService.getUserFavorites(
        userId,
        state.pageSize,
        page * state.pageSize
      );

      const favoriteIds = new Set(favorites.map(product => product.id));

      setState(prev => ({
        ...prev,
        favorites: reset ? favorites : [...prev.favorites, ...favorites],
        favoriteIds: reset ? favoriteIds : new Set([...prev.favoriteIds, ...favoriteIds]),
        hasMore: favorites.length === prev.pageSize,
        currentPage: reset ? 1 : prev.currentPage + 1,
        isLoading: false,
      }));

      // Load favorites count
      if (reset || state.favoritesCount === 0) {
        const count = await favoritesService.getUserFavoritesCount(userId);
        setState(prev => ({ ...prev, favoritesCount: count }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error,
      }));
    }
  }, [favoritesService, userId, state.currentPage, state.pageSize, state.favoritesCount]);

  // Load more favorites
  const loadMore = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore || !userId) return;

    try {
      setState(prev => ({ ...prev, isLoadingMore: true, error: null }));

      const favorites = await favoritesService.getUserFavorites(
        userId,
        state.pageSize,
        state.currentPage * state.pageSize
      );

      const favoriteIds = new Set(favorites.map(product => product.id));

      setState(prev => ({
        ...prev,
        favorites: [...prev.favorites, ...favorites],
        favoriteIds: new Set([...prev.favoriteIds, ...favoriteIds]),
        hasMore: favorites.length === prev.pageSize,
        currentPage: prev.currentPage + 1,
        isLoadingMore: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoadingMore: false,
        error: error,
      }));
    }
  }, [favoritesService, userId, state.isLoadingMore, state.hasMore, state.pageSize, state.currentPage]);

  // Refresh favorites
  const refresh = useCallback(async () => {
    await loadFavorites(true);
  }, [loadFavorites]);

  // Check if product is favorited
  const isProductFavorited = useCallback((productId: string): boolean => {
    return state.favoriteIds.has(productId);
  }, [state.favoriteIds]);

  // Sync offline favorites
  const syncOfflineFavorites = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isSyncing: true }));
      
      await favoritesService.syncOfflineFavorites();
      
      // Refresh favorites after sync
      await loadFavorites(true);
      
      setState(prev => ({ ...prev, isSyncing: false }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: error,
      }));
    }
  }, [favoritesService, loadFavorites]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Computed values
  const isEmpty = useMemo(() => 
    state.favorites.length === 0 && !state.isLoading,
    [state.favorites.length, state.isLoading]
  );

  const isFirstLoad = useMemo(() => 
    state.favorites.length === 0 && state.currentPage === 0,
    [state.favorites.length, state.currentPage]
  );

  // Load favorites on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadFavorites(true);
    } else {
      // Clear state when no user
      setState({
        favorites: [],
        favoriteIds: new Set(),
        favoritesCount: 0,
        isLoading: false,
        isLoadingMore: false,
        isToggling: {},
        isSyncing: false,
        currentPage: 0,
        pageSize: PRODUCT_CONSTANTS.DEFAULT_PAGE_SIZE,
        hasMore: false,
        error: null,
      });
    }
  }, [userId, loadFavorites]);

  return {
    // State
    ...state,
    
    // Actions
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    checkFavoriteStatus,
    clearAllFavorites,
    loadFavorites,
    loadMore,
    refresh,
    isProductFavorited,
    syncOfflineFavorites,
    clearError,
    
    // Computed values
    isEmpty,
    isFirstLoad,
  };
}

// Hook for checking single product favorite status
export function useProductFavoriteStatus(productId: string, userId: string) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const favoritesService = useMemo(() => new ProductFavoritesService(), []);

  const checkStatus = useCallback(async () => {
    if (!productId || !userId) return;

    try {
      setIsLoading(true);
      const status = await favoritesService.isProductFavorited(productId, userId);
      setIsFavorited(status);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [favoritesService, productId, userId]);

  const toggleFavorite = useCallback(async (): Promise<boolean> => {
    if (!productId || !userId) return false;

    try {
      const result = await favoritesService.toggleFavorite(productId, userId);
      if (result.success) {
        setIsFavorited(!isFavorited);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }, [favoritesService, productId, userId, isFavorited]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isFavorited,
    isLoading,
    toggleFavorite,
    refresh: checkStatus,
  };
}
