import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthScreen from './AuthScreen';

export interface AuthScreenProps {
  email: string;
  password: string;
  isSignUp: boolean;
  loading: boolean;
  showPassword: boolean;
  error: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onTogglePasswordVisibility: () => void;
  onAuth: () => void;
  onGoogleSignIn: () => void;
  onSwitchMode: () => void;
}

const AuthScreenContainer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (error) setError('');
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (error) setError('');
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const authScreenProps: AuthScreenProps = {
    email,
    password,
    isSignUp,
    loading,
    showPassword,
    error,
    onEmailChange: handleEmailChange,
    onPasswordChange: handlePasswordChange,
    onTogglePasswordVisibility: handleTogglePasswordVisibility,
    onAuth: handleAuth,
    onGoogleSignIn: handleGoogleSignIn,
    onSwitchMode: handleSwitchMode,
  };

  return <AuthScreen {...authScreenProps} />;
};

export default AuthScreenContainer;
