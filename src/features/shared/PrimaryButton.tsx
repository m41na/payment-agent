import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { appTheme } from '../theme';

type Props = React.ComponentProps<typeof Button> & { fullWidth?: boolean };

const PrimaryButton: React.FC<Props> = ({ children, style, fullWidth, ...rest }) => {
  return (
    <Button
      mode="contained"
      style={[styles.button, fullWidth && styles.fullWidth, style]}
      labelStyle={styles.label}
      buttonColor={appTheme.colors.primary}
      textColor={appTheme.colors.surface}
      {...rest}
    >
      {children}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 10,
  },
  label: {
    fontWeight: '700',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});

export default PrimaryButton;
