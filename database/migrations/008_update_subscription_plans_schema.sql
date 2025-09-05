-- Migration: Update subscription plans schema for one-time payments
-- Date: 2025-01-04
-- Description: Modify pg_subscription_plans to support both recurring and one-time payment plans, and rename to pg_merchant_plans

-- Rename table to better reflect its purpose
ALTER TABLE public.pg_subscription_plans RENAME TO pg_merchant_plans;

-- Update billing_interval constraint to include one-time payments
ALTER TABLE public.pg_merchant_plans 
DROP CONSTRAINT IF EXISTS pg_subscription_plans_billing_interval_check;

ALTER TABLE public.pg_merchant_plans 
ADD CONSTRAINT pg_merchant_plans_billing_interval_check 
CHECK (billing_interval IN ('month', 'year', 'one_time'));

-- Add index on stripe_price_id for upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_plans_stripe_price_id 
ON public.pg_merchant_plans(stripe_price_id);

-- Update RLS policies with new table name
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.pg_subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.pg_subscription_plans;

CREATE POLICY "Anyone can view active merchant plans" ON public.pg_merchant_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage merchant plans" ON public.pg_merchant_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pg_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Update realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.pg_subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_merchant_plans;

ALTER TABLE public.pg_merchant_plans 
DROP CONSTRAINT IF EXISTS pg_subscription_plans_stripe_product_id_key;