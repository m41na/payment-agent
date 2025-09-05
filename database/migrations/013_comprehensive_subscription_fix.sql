-- Migration: Comprehensive subscription system fix
-- Date: 2025-01-04
-- Description: Fix all subscription system issues proactively

-- 1. Drop existing foreign key constraints
ALTER TABLE public.pg_profiles 
DROP CONSTRAINT IF EXISTS fk_current_plan;

-- 2. Fix pg_merchant_plans table structure
ALTER TABLE public.pg_merchant_plans 
ALTER COLUMN id TYPE TEXT;

-- 3. Fix pg_profiles to match
ALTER TABLE public.pg_profiles 
ALTER COLUMN current_plan_id TYPE TEXT;

-- 4. Add missing columns to pg_user_subscriptions
ALTER TABLE public.pg_user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('one_time', 'recurring')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Fix plan_id type in pg_user_subscriptions
ALTER TABLE public.pg_user_subscriptions 
ALTER COLUMN plan_id TYPE TEXT;

-- 6. Make stripe_subscription_id nullable for one-time payments
ALTER TABLE public.pg_user_subscriptions 
ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- 7. Update status constraint to include all needed statuses
ALTER TABLE public.pg_user_subscriptions 
DROP CONSTRAINT IF EXISTS pg_user_subscriptions_status_check;

ALTER TABLE public.pg_user_subscriptions 
ADD CONSTRAINT pg_user_subscriptions_status_check 
CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'expired', 'pending'));

-- 8. Recreate foreign key constraint with correct types
ALTER TABLE public.pg_profiles 
ADD CONSTRAINT fk_current_plan 
FOREIGN KEY (current_plan_id) REFERENCES pg_merchant_plans(id);

-- 9. Add RLS policies for user subscriptions operations
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.pg_user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.pg_user_subscriptions;

CREATE POLICY "Users can insert own subscriptions" ON public.pg_user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.pg_user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- 10. Populate merchant plans with correct data
INSERT INTO public.pg_merchant_plans (id, name, description, price_amount, price_currency, billing_interval, stripe_product_id, stripe_price_id, is_active) VALUES
('daily', 'Daily Access', '24-hour merchant access for garage sales and temporary selling', 499, 'usd', 'one_time', 'prod_daily_access', 'price_daily_access', true),
('monthly', 'Monthly Plan', 'Monthly merchant subscription for regular sellers', 2999, 'usd', 'month', 'prod_monthly_merchant', 'price_monthly_merchant', true),
('yearly', 'Yearly Plan', 'Yearly merchant subscription with savings', 29999, 'usd', 'year', 'prod_yearly_merchant', 'price_yearly_merchant', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_amount = EXCLUDED.price_amount,
  price_currency = EXCLUDED.price_currency,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  is_active = EXCLUDED.is_active;
