-- Migration: Recreate pg_handle_new_user trigger function and on_auth_user_created trigger
-- This restores the original DB trigger that creates/updates rows in public.pg_profiles
-- when a new row is inserted into auth.users. The function is defensive (ON CONFLICT DO NOTHING)
-- and uses SECURITY DEFINER to allow server-side inserts that bypass RLS.

BEGIN;

-- Create trigger function to insert profile after user creation
CREATE OR REPLACE FUNCTION public.pg_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try inserting a profile row for the newly created auth user. If the profile
  -- already exists, do nothing. Use raw_user_meta_data JSON fields if present.
  INSERT INTO public.pg_profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      -- Supabase stores arbitrary metadata in raw_user_meta_data or user_metadata
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', '') ,
      NULLIF(NEW.raw_user_meta_data ->> 'fullName', ''),
      NULLIF(NEW.user_metadata ->> 'full_name', ''),
      NULLIF(NEW.user_metadata ->> 'fullName', ''),
      NULL
    ),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Don't fail the auth.users insert; log a notice for investigation
  RAISE NOTICE 'pg_handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.pg_handle_new_user();

COMMIT;
