-- Migration: Ensure create_referral_points_for_user uses schema-qualified table and sets search_path
-- This prevents "relation does not exist" errors when trigger runs with different search_path.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_referral_points_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  -- Insert a referral points row for the newly created user if one doesn't exist
  INSERT INTO public.pg_referral_points (user_id, total_points, lifetime_points, current_tier, created_at, updated_at)
  VALUES (NEW.id, 0, 0, 'BRONZE', now(), now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Don't fail user creation; log a notice for debugging
  RAISE NOTICE 'create_referral_points_for_user error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

COMMIT;
