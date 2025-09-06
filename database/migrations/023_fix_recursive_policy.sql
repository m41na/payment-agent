-- Drop all existing policies to fix recursion issue
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.pg_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.pg_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.pg_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.pg_profiles;

-- Create simple, non-recursive policies
-- Users can always view and update their own profile
CREATE POLICY "Users can view own profile" ON public.pg_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.pg_profiles
  FOR UPDATE USING (auth.uid() = id);

-- For admin functionality, we'll handle this at the application level
-- or create a separate admin function rather than using RLS policies
-- This avoids the recursion issue entirely
