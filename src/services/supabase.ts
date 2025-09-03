import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database type definitions
export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
          default_payment_method_id: string | null;
          user_type: 'customer' | 'agent' | 'buyer';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
          default_payment_method_id?: string | null;
          user_type: 'customer' | 'agent' | 'buyer';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
          default_payment_method_id?: string | null;
          user_type?: 'customer' | 'agent' | 'buyer';
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_methods: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_method_id: string;
          type: 'card' | 'bank_account';
          last_four: string;
          expire_month: number | null;
          expire_year: number | null;
          brand: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_method_id: string;
          type: 'card' | 'bank_account';
          last_four: string;
          expire_month?: number | null;
          expire_year?: number | null;
          brand: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_method_id?: string;
          type?: 'card' | 'bank_account';
          last_four?: string;
          expire_month?: number | null;
          expire_year?: number | null;
          brand?: string;
          is_default?: boolean;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          stripe_payment_intent_id: string;
          amount: number;
          currency: string;
          status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
          payment_method_used: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_payment_intent_id: string;
          amount: number;
          currency: string;
          status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
          payment_method_used: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_payment_intent_id?: string;
          amount?: number;
          currency?: string;
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
          payment_method_used?: string;
          created_at?: string;
        };
      };
    };
  };
}
