import React, { useState } from 'react';
import { View, TextInput, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
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
  size = 'medium',
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
      marginBottom: theme.spacing.small,
    };
  };

  const getLabelStyle = (): TextStyle => {
    return {
      fontSize: theme.typography.fontSize.small,
      fontWeight: '500',
      color: error ? theme.colors.error : theme.colors.text,
      marginBottom: theme.spacing.xsmall,
    };
  };

  const getInputStyle = (): ViewStyle & TextStyle => {
    const baseStyle: ViewStyle & TextStyle = {
      fontSize: theme.typography.fontSize.medium,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
    };

    // Size variations
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingHorizontal: theme.spacing.medium,
        paddingVertical: theme.spacing.small,
        minHeight: 36,
      },
      medium: {
        paddingHorizontal: theme.spacing.medium,
        paddingVertical: theme.spacing.medium,
        minHeight: 44,
      },
      large: {
        paddingHorizontal: theme.spacing.large,
        paddingVertical: theme.spacing.large,
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
        borderRadius: theme.borderRadius.medium,
        backgroundColor: 'transparent',
      },
      filled: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.medium,
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
      fontSize: theme.typography.fontSize.xsmall,
      color: error ? theme.colors.error : theme.colors.textSecondary,
      marginTop: theme.spacing.xsmall,
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
