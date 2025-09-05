-- Migration: Fix infinite recursion in pg_profiles RLS policy
-- Date: 2025-01-04
-- Description: Remove circular reference in admin policy that causes infinite recursion

-- Drop the problematic admin policy that references itself
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.pg_profiles;

-- Create a simpler admin policy that doesn't cause recursion
-- This checks user_type directly without subquery to pg_profiles
CREATE POLICY "Admins can view all profiles" ON public.pg_profiles
  FOR SELECT USING (
    (SELECT user_type FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = id
  );
