-- Migration: Enable RLS on pg_profiles and add policies to allow trigger-based and owner-based operations
-- This migration ensures the existing DB trigger that inserts into pg_profiles will be allowed
-- while keeping row-level security enforced for normal client operations.

BEGIN;

-- Safety: ensure the table exists before making changes
-- If the table doesn't exist, this migration will fail early.

-- Enable Row Level Security on pg_profiles
ALTER TABLE IF EXISTS public.pg_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: allow inserts performed inside server-side triggers/functions
-- pg_trigger_depth() > 0 when the INSERT is executed from within a trigger context.
DROP POLICY IF EXISTS insert_by_trigger ON public.pg_profiles;
CREATE POLICY insert_by_trigger
  ON public.pg_profiles
  FOR INSERT
  WITH CHECK (pg_trigger_depth() > 0);

-- Policy: allow authenticated users to insert their own profile (useful for some flows)
DROP POLICY IF EXISTS insert_by_owner ON public.pg_profiles;
CREATE POLICY insert_by_owner
  ON public.pg_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: allow users to SELECT their own profile
DROP POLICY IF EXISTS select_own ON public.pg_profiles;
CREATE POLICY select_own
  ON public.pg_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: allow users to UPDATE their own profile
DROP POLICY IF EXISTS update_own ON public.pg_profiles;
CREATE POLICY update_own
  ON public.pg_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optionally allow deletes only from server-side triggers (keep deletes restricted)
DROP POLICY IF EXISTS delete_by_trigger ON public.pg_profiles;
CREATE POLICY delete_by_trigger
  ON public.pg_profiles
  FOR DELETE
  USING (pg_trigger_depth() > 0);

COMMIT;
