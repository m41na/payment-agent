import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme configuration
export interface Theme {
  colors: {
    // Primary brand colors
    primary: string;
    primaryDark: string;
    primaryLight: string;
    
    // Secondary colors
    secondary: string;
    accent: string;
    
    // Semantic colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Background colors
    background: string;
    surface: string;
    card: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textDisabled: string;
    
    // Border and divider colors
    border: string;
    divider: string;
    
    // Interactive colors
    link: string;
    linkPressed: string;
    
    // Overlay colors
    overlay: string;
    backdrop: string;
  };
  
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  
  typography: {
    h1: TextStyle;
    h2: TextStyle;
    h3: TextStyle;
    h4: TextStyle;
    body: TextStyle;
    bodySmall: TextStyle;
    caption: TextStyle;
    button: TextStyle;
  };
  
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  
  shadows: {
    sm: object;
    md: object;
    lg: object;
  };
}

interface TextStyle {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
}

// Light theme
const lightTheme: Theme = {
  colors: {
    primary: '#667eea',
    primaryDark: '#5a67d8',
    primaryLight: '#7c3aed',
    
    secondary: '#10b981',
    accent: '#f59e0b',
    
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    background: '#ffffff',
    surface: '#f8fafc',
    card: '#ffffff',
    
    text: '#1f2937',
    textSecondary: '#6b7280',
    textDisabled: '#9ca3af',
    
    border: '#e5e7eb',
    divider: '#f3f4f6',
    
    link: '#3b82f6',
    linkPressed: '#2563eb',
    
    overlay: 'rgba(0, 0, 0, 0.5)',
    backdrop: 'rgba(0, 0, 0, 0.25)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    body: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 },
    bodySmall: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 },
    button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
};

// Dark theme
const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    
    background: '#111827',
    surface: '#1f2937',
    card: '#374151',
    
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    textDisabled: '#9ca3af',
    
    border: '#374151',
    divider: '#4b5563',
    
    overlay: 'rgba(0, 0, 0, 0.7)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
  },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Theme provider that manages light/dark theme switching and provides
 * consistent design tokens across all features.
 * 
 * Features:
 * - Light/dark theme support
 * - System theme detection
 * - Persistent theme preference
 * - Consistent design tokens
 * - Typography and spacing scales
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeMode(savedTheme as 'light' | 'dark' | 'system');
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  // Determine current theme
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  const setTheme = async (newThemeMode: 'light' | 'dark' | 'system') => {
    try {
      setThemeMode(newThemeMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newThemeMode);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const contextValue: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
    themeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
