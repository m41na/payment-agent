-- Migration: Add user roles and merchant status
-- Date: 2025-01-04
-- Description: Extends pg_profiles table to support marketplace functionality with user roles and merchant onboarding states

-- Add new columns to pg_profiles table
ALTER TABLE public.pg_profiles 
ADD COLUMN user_type TEXT DEFAULT 'buyer' CHECK (user_type IN ('buyer', 'seller', 'admin', 'support')),
ADD COLUMN merchant_status TEXT DEFAULT 'none' CHECK (merchant_status IN ('none', 'payment_added', 'plan_selected', 'plan_purchased', 'onboarding_started', 'onboarding_completed', 'active', 'suspended')),
ADD COLUMN stripe_connect_account_id TEXT UNIQUE,
ADD COLUMN onboarding_url TEXT,
ADD COLUMN subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'unpaid')),
ADD COLUMN current_plan_id UUID;

-- Add new RLS policy for admin access
CREATE POLICY "Admins can view all profiles" ON public.pg_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pg_profiles 
      WHERE id = auth.uid() AND user_type IN ('admin', 'support')
    )
  );

-- Update existing users to have default buyer role
UPDATE public.pg_profiles 
SET user_type = 'buyer', 
    merchant_status = 'none', 
    subscription_status = 'none'
WHERE user_type IS NULL;
