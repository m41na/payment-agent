import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BrandLogo from './BrandLogo';
import { appTheme } from '../theme';

const Header: React.FC<{ title?: string; subtitle?: string }> = ({ title, subtitle }) => {
  return (
    <View style={styles.header}>
      <BrandLogo size={40} />
      <View style={styles.textWrap}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: appTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: appTheme.colors.border,
  },
  textWrap: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: appTheme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: appTheme.colors.textSecondary,
  },
});

export default Header;
