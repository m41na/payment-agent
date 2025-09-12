import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import BrandLogo from '../../shared/BrandLogo';
import PrimaryButton from '../../shared/PrimaryButton';
import { appTheme } from '../../theme';
import { useAuth } from '../context/AuthContext';

const AuthenticationScreen: React.FC = () => {
  console.log('Rendering AuthenticationScreen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (e) {
      console.warn('Auth error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.brandWrap}>
          <BrandLogo size={96} />
          <Text style={styles.appName}>Marketplace</Text>
          <Text style={styles.lead}>{isSignUp ? 'Create your merchant account' : 'Welcome back — sign in to continue'}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            mode="outlined"
          />

          <PrimaryButton onPress={handleAuth} loading={loading} fullWidth>
            {isSignUp ? 'Create account' : 'Sign in'}
          </PrimaryButton>

          <PrimaryButton
            mode="outlined"
            onPress={() => signInWithGoogle?.()}
            style={styles.googleButton}
            fullWidth
          >
            Continue with Google
          </PrimaryButton>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.switchAction}>{isSignUp ? 'Sign in' : 'Sign up'}</Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appTheme.colors.background,
  },
  inner: { flex: 1, padding: 16, justifyContent: 'center' },
  brandWrap: { alignItems: 'center', marginBottom: 24 },
  appName: { fontSize: 22, fontWeight: '800', marginTop: 12, color: appTheme.colors.textPrimary },
  lead: { fontSize: 14, color: appTheme.colors.textSecondary, marginTop: 6, textAlign: 'center', maxWidth: 320 },
  form: { marginTop: 8 },
  input: { marginBottom: 12 },
  googleButton: { marginTop: 12, borderWidth: 1, borderColor: appTheme.colors.border, backgroundColor: appTheme.colors.surface },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 8 },
  switchText: { color: appTheme.colors.textSecondary },
  switchAction: { color: appTheme.colors.primary, fontWeight: '700' },
});

export default AuthenticationScreen;
