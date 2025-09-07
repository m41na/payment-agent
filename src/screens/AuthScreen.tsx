import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions, StatusBar } from 'react-native';
import { Button, TextInput, Text, Card, Divider, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthScreenProps } from './AuthScreen.container';

const { width, height } = Dimensions.get('window');

const AuthScreen: React.FC<AuthScreenProps> = ({
  email,
  password,
  isSignUp,
  loading,
  showPassword,
  error,
  onEmailChange,
  onPasswordChange,
  onTogglePasswordVisibility,
  onAuth,
  onGoogleSignIn,
  onSwitchMode,
}) => {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#a855f7']}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Surface style={styles.logoContainer} elevation={2}>
              <Text style={styles.logoText}>🏪</Text>
            </Surface>
            <Text style={styles.appTitle}>Marketplace</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </Text>
          </View>

          {/* Auth Form */}
          <Card style={styles.authCard} elevation={8}>
            <Card.Content style={styles.cardContent}>
              <Text variant="headlineSmall" style={styles.formTitle}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
              
              {error ? (
                <Surface style={styles.errorContainer} elevation={1}>
                  <Text style={styles.errorText}>{error}</Text>
                </Surface>
              ) : null}
              
              <TextInput
                label="Email Address"
                value={email}
                onChangeText={onEmailChange}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                left={<TextInput.Icon icon="email-outline" />}
                outlineStyle={styles.inputOutline}
                theme={{
                  colors: {
                    primary: '#6366f1',
                    outline: '#e5e7eb',
                  }
                }}
              />
              
              <TextInput
                label="Password"
                value={password}
                onChangeText={onPasswordChange}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showPassword}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                left={<TextInput.Icon icon="lock-outline" />}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? 'eye-off' : 'eye'} 
                    onPress={onTogglePasswordVisibility}
                  />
                }
                outlineStyle={styles.inputOutline}
                theme={{
                  colors: {
                    primary: '#6366f1',
                    outline: '#e5e7eb',
                  }
                }}
              />
              
              <Button
                mode="contained"
                onPress={onAuth}
                loading={loading}
                disabled={loading}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                buttonColor="#6366f1"
              >
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
              
              <View style={styles.dividerContainer}>
                <Divider style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <Divider style={styles.divider} />
              </View>
              
              <Button
                mode="outlined"
                onPress={onGoogleSignIn}
                loading={loading}
                disabled={loading}
                style={styles.googleButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.googleButtonLabel}
                icon="google"
              >
                Continue with Google
              </Button>
            </Card.Content>
          </Card>

          {/* Switch Mode */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Button
              mode="text"
              onPress={onSwitchMode}
              labelStyle={styles.switchButtonLabel}
              compact
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Button>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  authCard: {
    borderRadius: 24,
    backgroundColor: 'white',
    marginBottom: 24,
  },
  cardContent: {
    padding: 32,
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  inputOutline: {
    borderRadius: 12,
    borderWidth: 1.5,
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 16,
    elevation: 2,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  googleButton: {
    borderRadius: 16,
    borderColor: '#e5e7eb',
    borderWidth: 1.5,
  },
  googleButtonLabel: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  switchButtonLabel: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AuthScreen;