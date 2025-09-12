import React, { createContext, useContext, useState, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { supabase } from '../../../services/supabase';

export interface AuthUser {
  id: string;
  email: string;
  profile?: any;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle?: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle incoming OAuth deep links (mobile) and complete the Supabase session
  useEffect(() => {
    const extractFromHash = (hash: string) => {
      // hash could be like '#access_token=...&refresh_token=...&expires_in=3600&token_type=bearer'
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const provider_token = params.get('provider_token');
      const expires_in = params.get('expires_in');
      return { access_token, refresh_token, provider_token, expires_in };
    };

    const handleUrl = async (event: { url: string } | string) => {
      const url = typeof event === 'string' ? event : event.url;
      if (!url) return;
      try {
        console.log('Handling OAuth redirect URL:', url);

        // First try the SDK helper if available
        // @ts-ignore
        if (typeof supabase.auth.getSessionFromUrl === 'function') {
          try {
            // @ts-ignore
            const result = await supabase.auth.getSessionFromUrl({ url });
            console.log('getSessionFromUrl result:', result);
            return;
          } catch (err) {
            console.warn('getSessionFromUrl failed, attempting manual session parse', err);
          }
        }

        // Manual parsing fallback: look for tokens in URL fragment or query
        const parsed = new URL(url);
        let tokens = { access_token: null, refresh_token: null } as any;

        if (parsed.hash && parsed.hash.length > 1) {
          tokens = extractFromHash(parsed.hash);
        } else if (parsed.search && parsed.search.length > 1) {
          // Some flows may return tokens in the querystring
          const params = new URLSearchParams(parsed.search.replace(/^\?/, ''));
          tokens.access_token = params.get('access_token');
          tokens.refresh_token = params.get('refresh_token');
        }

        if (tokens.access_token) {
          try {
            console.log('Completing session with tokens from deep link');
            // @ts-ignore
            const setResult = await supabase.auth.setSession({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token || undefined,
            });
            console.log('setSession result:', setResult);
          } catch (err) {
            console.error('Failed to set session from deep link tokens', err);
          }
        } else {
          console.warn('No tokens found in redirect URL; ensure redirect contains auth fragment', { url });
        }
      } catch (err) {
        console.error('Error handling OAuth redirect URL', err);
      }
    };

    // Check if the app was opened with a URL
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleUrl(initialUrl);
    }).catch(err => console.warn('Linking.getInitialURL error', err));

    // Subscribe to incoming links
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      try { subscription.remove(); } catch (e) { /* ignore */ }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        console.error('SignUp error object:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Log created user/session data for debugging (avoid logging sensitive tokens in production)
      console.log('SignUp success:', data);

      return data;
    } catch (err: any) {
      console.error('SignUp exception:', err);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectTo = process.env.EXPO_PUBLIC_OAUTH_REDIRECT || undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) {
        console.error('Google sign-in error:', error);
        throw error;
      }

      console.log('Google sign-in initiated:', data, 'redirectTo=', redirectTo);

      // If SDK returned a URL (web flow), open it appropriately.
      if (data?.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          // Open in external browser; ensure deep-link redirect URIs are configured in Supabase and Google
          await Linking.openURL(data.url);
        }
      }

      return data;
    } catch (err: any) {
      console.error('Google sign-in exception:', err);
      throw err;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
