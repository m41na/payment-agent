import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from './ThemeProvider';

interface LoadingState {
  [key: string]: boolean;
}

interface LoadingContextType {
  // Global loading state
  isLoading: boolean;
  
  // Feature-specific loading states
  loadingStates: LoadingState;
  
  // Loading management
  setLoading: (key: string, loading: boolean) => void;
  setGlobalLoading: (loading: boolean) => void;
  
  // Convenience methods
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  isFeatureLoading: (key: string) => boolean;
  
  // Batch operations
  startMultipleLoading: (keys: string[]) => void;
  stopMultipleLoading: (keys: string[]) => void;
  clearAllLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: React.ReactNode;
  showGlobalLoader?: boolean;
}

/**
 * Loading provider that manages loading states across all features.
 * 
 * Features:
 * - Global loading overlay
 * - Feature-specific loading states
 * - Batch loading operations
 * - Automatic loading state cleanup
 * - Theme-aware loading indicators
 */
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  showGlobalLoader = true 
}) => {
  const { theme } = useTheme();
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});

  // Check if any feature is loading
  const isLoading = globalLoading || Object.values(loadingStates).some(Boolean);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const isFeatureLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const startMultipleLoading = useCallback((keys: string[]) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      keys.forEach(key => {
        newState[key] = true;
      });
      return newState;
    });
  }, []);

  const stopMultipleLoading = useCallback((keys: string[]) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      keys.forEach(key => {
        newState[key] = false;
      });
      return newState;
    });
  }, []);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({});
    setGlobalLoading(false);
  }, []);

  const contextValue: LoadingContextType = {
    isLoading,
    loadingStates,
    setLoading,
    setGlobalLoading,
    startLoading,
    stopLoading,
    isFeatureLoading,
    startMultipleLoading,
    stopMultipleLoading,
    clearAllLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      
      {/* Global loading overlay */}
      {showGlobalLoader && isLoading && (
        <Modal
          transparent
          animationType="fade"
          visible={isLoading}
          statusBarTranslucent
        >
          <View style={[styles.overlay, { backgroundColor: theme.colors.backdrop }]}>
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.card }]}>
              <ActivityIndicator 
                size="large" 
                color={theme.colors.primary}
                style={styles.spinner}
              />
              <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                Loading...
              </Text>
            </View>
          </View>
        </Modal>
      )}
    </LoadingContext.Provider>
  );
};

/**
 * Hook to access loading context
 */
export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

/**
 * Hook for feature-specific loading management
 */
export const useFeatureLoading = (featureName: string) => {
  const { 
    setLoading, 
    isFeatureLoading, 
    startLoading, 
    stopLoading 
  } = useLoading();

  return {
    isLoading: isFeatureLoading(featureName),
    setLoading: (loading: boolean) => setLoading(featureName, loading),
    startLoading: () => startLoading(featureName),
    stopLoading: () => stopLoading(featureName),
  };
};

/**
 * Hook for async operation loading management
 */
export const useAsyncLoading = (featureName: string) => {
  const { setLoading } = useLoading();

  const withLoading = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingKey?: string
  ): Promise<T> => {
    const key = loadingKey || featureName;
    
    try {
      setLoading(key, true);
      const result = await operation();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [featureName, setLoading]);

  return { withLoading };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  spinner: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoadingProvider;
