import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const colors = {
  primary: '#3B82F6', // blue-500
  primaryVariant: '#2563EB',
  accent: '#06B6D4', // teal-400
  background: '#F8FAFC', // gray-50
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  border: '#E2E8F0',
  textPrimary: '#0F172A', // slate-900
  textSecondary: '#475569', // slate-600
  muted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const typography = {
  h1: 32,
  h2: 24,
  h3: 20,
  body: 16,
  small: 14,
};

export const appTheme = {
  colors,
  spacing,
  typography,
};

// Create a react-native-paper theme based on MD3 Light and our colors
export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.accent,
    background: colors.background,
    surface: colors.surface,
    onSurface: colors.textPrimary,
    outline: colors.border,
  },
};

export default appTheme;
