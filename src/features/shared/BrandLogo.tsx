import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

const BrandLogo: React.FC<{ size?: number }> = ({ size = 48 }) => {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}> 
      <Text style={styles.letter}>M</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    color: 'white',
    fontWeight: '800',
    fontSize: 20,
  },
});

export default BrandLogo;
