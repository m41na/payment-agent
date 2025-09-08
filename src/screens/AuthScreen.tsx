import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput, Text, Card, Divider } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen = () => {
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
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
          />
          
          <Button
            mode="contained"
            onPress={handleAuth}
            loading={loading}
            style={styles.button}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
          
          <Divider style={styles.divider} />
          
          <Button
            mode="outlined"
            onPress={handleGoogleSignIn}
            loading={loading}
            style={styles.button}
            icon="google"
          >
            Continue with Google
          </Button>
          
          <Button
            mode="text"
            onPress={() => setIsSignUp(!isSignUp)}
            style={styles.switchButton}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 16,
  },
  switchButton: {
    marginTop: 8,
  },
});

export default AuthScreen;
