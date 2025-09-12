-- Migration: Replace DB trigger-based profile creation with service-role edge function
-- Description: Drop the trigger and trigger function that auto-insert into pg_profiles
-- after user creation. An edge function (pg_create_profile_on_signup) will handle profile
-- creation using the Supabase service role key. This avoids RLS/auth context issues.

BEGIN;

-- Drop trigger that used to insert profiles on auth.users insert
DROP TRIGGER IF EXISTS pg_on_auth_user_created ON auth.users;

-- Drop trigger function (if present)
DROP FUNCTION IF EXISTS public.pg_handle_new_user();

COMMIT;

-- NOTE: After applying this migration, deploy the Edge Function 'pg_create_profile_on_signup'
-- and configure an Auth webhook in the Supabase dashboard to call the function when a user is created.
-- This function will run using the Service Role key and will insert into pg_profiles bypassing RLS.
