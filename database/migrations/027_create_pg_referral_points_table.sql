-- Migration: Create pg_referral_points table required by referral trigger
-- This table stores referral points per user. The existing trigger function
-- create_referral_points_for_user() expects to INSERT into this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.pg_referral_points (
  user_id uuid NOT NULL PRIMARY KEY,
  total_points integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  current_tier text NOT NULL DEFAULT 'BRONZE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_pg_referral_points_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMIT;
