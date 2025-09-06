import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

/**
 * Shared Button Component
 * 
 * Provides consistent button styling across all features with support for
 * multiple variants, sizes, and states. Integrates with the theme system
 * for consistent colors and spacing.
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}) => {
  const { theme } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size variations
    const sizeStyles: Record<string, ViewStyle> = {
      xs: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: theme.spacing.xs,
        minHeight: 24,
      },
      sm: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        minHeight: 32,
      },
      md: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        minHeight: 40,
      },
      lg: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        minHeight: 48,
      },
      xl: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.xl,
        minHeight: 56,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: disabled ? theme.colors.textDisabled : theme.colors.primary,
      },
      secondary: {
        backgroundColor: disabled ? theme.colors.textDisabled : theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? theme.colors.textDisabled : theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: disabled ? theme.colors.textDisabled : theme.colors.error,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.6 }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size text styles
    const sizeTextStyles: Record<string, TextStyle> = {
      xs: {
        fontSize: 12,
      },
      sm: {
        fontSize: 14,
      },
      md: {
        fontSize: 16,
      },
      lg: {
        fontSize: 18,
      },
      xl: {
        fontSize: 20,
      },
    };

    // Variant text colors
    const variantTextStyles: Record<string, TextStyle> = {
      primary: {
        color: '#ffffff',
      },
      secondary: {
        color: '#ffffff',
      },
      outline: {
        color: disabled ? theme.colors.textDisabled : theme.colors.primary,
      },
      ghost: {
        color: disabled ? theme.colors.textDisabled : theme.colors.primary,
      },
      danger: {
        color: '#ffffff',
      },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#ffffff'}
          style={{ marginRight: theme.spacing.sm }}
        />
      ) : null}
      <Text style={[getTextStyle(), textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default Button;
