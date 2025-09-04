-- Create pg_profiles table
CREATE TABLE public.pg_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pg_payment_methods table
CREATE TABLE public.pg_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'card', 'bank_account', etc.
  brand TEXT, -- 'visa', 'mastercard', etc.
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pg_transactions table
CREATE TABLE public.pg_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- 'succeeded', 'pending', 'failed'
  payment_method_id UUID REFERENCES pg_payment_methods(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger function for new user profiles
CREATE OR REPLACE FUNCTION public.pg_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pg_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER pg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.pg_handle_new_user();

-- Enable RLS
ALTER TABLE public.pg_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON public.pg_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.pg_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own payment methods" ON public.pg_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON public.pg_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON public.pg_payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON public.pg_payment_methods
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON public.pg_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Realtime configuration
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Enable realtime for our tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_transactions;
