import React from 'react';
import { View, ActivityIndicator, Text, ViewStyle, Modal } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Shared Loading Spinner Component
 * 
 * Provides consistent loading indicators across all features with support for
 * overlay mode and custom messages. Integrates with the theme system for
 * consistent colors and typography.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  message,
  overlay = false,
  style,
  textStyle,
}) => {
  const { theme } = useTheme();

  const getContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (overlay) {
      return {
        ...baseStyle,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      };
    }

    return {
      ...baseStyle,
      padding: theme.spacing.large,
    };
  };

  const getTextStyle = (): TextStyle => {
    return {
      marginTop: theme.spacing.medium,
      fontSize: theme.typography.fontSize.medium,
      color: overlay ? theme.colors.white : theme.colors.text,
      textAlign: 'center',
    };
  };

  return (
    <View style={[getContainerStyle(), style]}>
      <ActivityIndicator
        size={size}
        color={color || (overlay ? theme.colors.white : theme.colors.primary)}
      />
      {message && (
        <Text style={[getTextStyle(), textStyle]}>
          {message}
        </Text>
      )}
    </View>
  );
};

export default LoadingSpinner;
