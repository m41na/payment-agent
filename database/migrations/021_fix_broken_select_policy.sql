-- Drop the broken admin policy that references non-existent pg_profiles.user_type
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.pg_profiles;

-- The "Users can view own profile" policy is correct and should remain:
-- CREATE POLICY "Users can view own profile" ON public.pg_profiles
--   FOR SELECT USING (auth.uid() = id);
