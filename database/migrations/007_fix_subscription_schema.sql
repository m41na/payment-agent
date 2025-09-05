-- Migration: Fix subscription schema for daily access support
-- Date: 2025-01-04
-- Description: Adds missing columns to pg_user_subscriptions table to support daily access and one-time purchases

-- Drop the foreign key constraint on plan_id first (before changing column type)
ALTER TABLE public.pg_user_subscriptions 
DROP CONSTRAINT IF EXISTS pg_user_subscriptions_plan_id_fkey;

-- Add missing columns to pg_user_subscriptions table
ALTER TABLE public.pg_user_subscriptions 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('one_time', 'recurring')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status check constraint to include 'expired'
ALTER TABLE public.pg_user_subscriptions 
DROP CONSTRAINT IF EXISTS pg_user_subscriptions_status_check;

ALTER TABLE public.pg_user_subscriptions 
ADD CONSTRAINT pg_user_subscriptions_status_check 
CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'expired'));

-- Make stripe_subscription_id nullable for one-time purchases
ALTER TABLE public.pg_user_subscriptions 
ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Change plan_id to TEXT to support hardcoded plan IDs (constraint already dropped above)
ALTER TABLE public.pg_user_subscriptions 
ALTER COLUMN plan_id TYPE TEXT;

-- Update RLS policies to handle the new schema
CREATE POLICY "Users can insert own subscriptions" ON public.pg_user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.pg_user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
