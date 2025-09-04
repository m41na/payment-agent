-- Migration: Create subscription system
-- Date: 2025-01-04
-- Description: Creates subscription plans and user subscriptions tables for merchant plan management

-- Create subscription plans table
CREATE TABLE public.pg_subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT UNIQUE NOT NULL,
  price_amount INTEGER NOT NULL, -- in cents
  price_currency TEXT DEFAULT 'usd',
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user subscriptions table
CREATE TABLE public.pg_user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES pg_subscription_plans(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.pg_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription plans
CREATE POLICY "Anyone can view active subscription plans" ON public.pg_subscription_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage subscription plans" ON public.pg_subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pg_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Create RLS policies for user subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.pg_user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Add foreign key constraint for current_plan_id in pg_profiles
ALTER TABLE public.pg_profiles 
ADD CONSTRAINT fk_current_plan 
FOREIGN KEY (current_plan_id) REFERENCES pg_subscription_plans(id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_user_subscriptions;
