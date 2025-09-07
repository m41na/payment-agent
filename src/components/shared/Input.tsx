import React, { useState } from 'react';
import { View, TextInput, Text, ViewStyle, TextStyle, TextInputProps } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  required?: boolean;
}

/**
 * Shared Input Component
 * 
 * Provides consistent text input styling across all features with support for
 * labels, validation states, and multiple variants. Integrates with the theme
 * system for consistent colors and typography.
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'md',
  fullWidth = true,
  containerStyle,
  inputStyle,
  labelStyle,
  required = false,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getContainerStyle = (): ViewStyle => {
    return {
      width: fullWidth ? '100%' : 'auto',
      marginBottom: theme.spacing.sm,
    };
  };

  const getLabelStyle = (): TextStyle => {
    return {
      ...theme.typography.body,
      fontWeight: '500',
      color: error ? theme.colors.error : theme.colors.text,
      marginBottom: theme.spacing.xs,
    };
  };

  const getInputStyle = (): ViewStyle & TextStyle => {
    const baseStyle: ViewStyle & TextStyle = {
      ...theme.typography.body,
      color: theme.colors.text,
    };

    // Size variations
    const sizeStyles: Record<string, ViewStyle> = {
      sm: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        minHeight: 36,
      },
      md: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 44,
      },
      lg: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 52,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      default: {
        borderBottomWidth: 1,
        borderBottomColor: error 
          ? theme.colors.error 
          : isFocused 
            ? theme.colors.primary 
            : theme.colors.border,
        backgroundColor: 'transparent',
      },
      outlined: {
        borderWidth: 1,
        borderColor: error 
          ? theme.colors.error 
          : isFocused 
            ? theme.colors.primary 
            : theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: 'transparent',
      },
      filled: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: error 
          ? theme.colors.error 
          : isFocused 
            ? theme.colors.primary 
            : 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getHelperTextStyle = (): TextStyle => {
    return {
      ...theme.typography.caption,
      color: error ? theme.colors.error : theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    };
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    textInputProps.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    textInputProps.onBlur?.(e);
  };

  return (
    <View style={[getContainerStyle(), containerStyle]}>
      {label && (
        <Text style={[getLabelStyle(), labelStyle]}>
          {label}
          {required && <Text style={{ color: theme.colors.error }}> *</Text>}
        </Text>
      )}
      
      <TextInput
        {...textInputProps}
        style={[getInputStyle(), inputStyle]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={theme.colors.textSecondary}
      />
      
      {(error || helperText) && (
        <Text style={getHelperTextStyle()}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

export default Input;
