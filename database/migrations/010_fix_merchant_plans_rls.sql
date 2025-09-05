-- Migration: Fix RLS policies for pg_merchant_plans
-- Date: 2025-01-04
-- Description: Simplify RLS policies to avoid permission denied errors on auth.users table

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active merchant plans" ON public.pg_merchant_plans;
DROP POLICY IF EXISTS "Admins can manage merchant plans" ON public.pg_merchant_plans;

-- Create simplified policies that don't reference other tables
CREATE POLICY "Public can view active merchant plans" ON public.pg_merchant_plans
  FOR SELECT USING (is_active = TRUE);

-- Allow service role to manage all merchant plans (for sync operations)
CREATE POLICY "Service role can manage merchant plans" ON public.pg_merchant_plans
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to view all merchant plans (for admin operations)
CREATE POLICY "Authenticated users can view all merchant plans" ON public.pg_merchant_plans
  FOR SELECT TO authenticated USING (true);
