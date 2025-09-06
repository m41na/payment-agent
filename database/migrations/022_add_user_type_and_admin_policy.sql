-- Add user_type field to pg_profiles table
ALTER TABLE pg_profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'user' CHECK (user_type IN ('user', 'admin', 'merchant'));

-- Drop the broken admin policy first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.pg_profiles;

-- Create correct admin policy that checks user_type in pg_profiles (not auth.users)
CREATE POLICY "Admins can view all profiles" ON public.pg_profiles
  FOR SELECT USING (
    (SELECT user_type FROM pg_profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = id
  );

-- Create admin policies for other operations
CREATE POLICY "Admins can update all profiles" ON public.pg_profiles
  FOR UPDATE USING (
    (SELECT user_type FROM pg_profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = id
  );

-- Note: We keep INSERT restricted to own profile only for security
-- Admins should not be able to create profiles for other users
