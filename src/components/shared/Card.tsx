import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Shared Card Component
 * 
 * Provides consistent card styling across all features with support for
 * multiple variants and interactive states. Integrates with the theme system
 * for consistent shadows, colors, and spacing.
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  onPress,
  style,
  testID,
}) => {
  const { theme } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.large,
      backgroundColor: theme.colors.surface,
    };

    // Padding variations
    const paddingStyles: Record<string, ViewStyle> = {
      none: {},
      small: {
        padding: theme.spacing.small,
      },
      medium: {
        padding: theme.spacing.medium,
      },
      large: {
        padding: theme.spacing.large,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      default: {
        backgroundColor: theme.colors.surface,
      },
      elevated: {
        backgroundColor: theme.colors.surface,
        shadowColor: theme.colors.shadow,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      outlined: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
      filled: {
        backgroundColor: theme.colors.background,
      },
    };

    return {
      ...baseStyle,
      ...paddingStyles[padding],
      ...variantStyles[variant],
    };
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[getCardStyle(), style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      testID={testID}
    >
      {children}
    </CardComponent>
  );
};

export default Card;
