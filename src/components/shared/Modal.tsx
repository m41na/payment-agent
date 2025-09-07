import React from 'react';
import { Modal as RNModal, View, Text, TouchableOpacity, ViewStyle, TextStyle, Dimensions } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import Button from './Button';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  actions?: Array<{
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  }>;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Shared Modal Component
 * 
 * Provides consistent modal styling across all features with support for
 * multiple sizes, actions, and customization options. Integrates with the
 * theme system for consistent colors and spacing.
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnBackdrop = true,
  actions,
  style,
  contentStyle,
}) => {
  const { theme } = useTheme();

  const getModalStyle = (): ViewStyle => {
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        width: screenWidth * 0.8,
        maxHeight: screenHeight * 0.6,
      },
      medium: {
        width: screenWidth * 0.9,
        maxHeight: screenHeight * 0.8,
      },
      large: {
        width: screenWidth * 0.95,
        maxHeight: screenHeight * 0.9,
      },
      fullscreen: {
        width: screenWidth,
        height: screenHeight,
        margin: 0,
        borderRadius: 0,
      },
    };

    return {
      backgroundColor: theme.colors.surface,
      borderRadius: size === 'fullscreen' ? 0 : theme.borderRadius.lg,
      ...theme.shadows.lg,
      ...sizeStyles[size],
    };
  };

  const getOverlayStyle = (): ViewStyle => {
    return {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: size === 'fullscreen' ? 0 : theme.spacing.md,
    };
  };

  const getHeaderStyle = (): ViewStyle => {
    return {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    };
  };

  const getTitleStyle = (): TextStyle => {
    return {
      ...theme.typography.h3,
      color: theme.colors.text,
      flex: 1,
    };
  };

  const getContentStyle = (): ViewStyle => {
    return {
      flex: 1,
      padding: theme.spacing.lg,
    };
  };

  const getActionsStyle = (): ViewStyle => {
    return {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.md,
    };
  };

  const handleBackdropPress = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={getOverlayStyle()}
        activeOpacity={1}
        onPress={handleBackdropPress}
      >
        <TouchableOpacity
          style={[getModalStyle(), style]}
          activeOpacity={1}
          onPress={() => {}} // Prevent backdrop close when touching modal content
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View style={getHeaderStyle()}>
              {title && <Text style={getTitleStyle()}>{title}</Text>}
              {showCloseButton && (
                <TouchableOpacity onPress={onClose} style={{ padding: theme.spacing.sm }}>
                  <Text style={{ fontSize: 18, color: theme.colors.textSecondary }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Content */}
          <View style={[getContentStyle(), contentStyle]}>
            {children}
          </View>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <View style={getActionsStyle()}>
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onPress={action.onPress}
                  variant={action.variant || 'primary'}
                  size="md"
                  title={action.title}
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </RNModal>
  );
};

export default Modal;
