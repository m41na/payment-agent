-- Migration: Fix plan_id column type back to UUID
-- Date: 2025-09-04
-- Description: Revert plan_id in pg_user_subscriptions back to UUID and restore foreign key to pg_merchant_plans

-- 1. Drop any existing foreign key constraints on plan_id
ALTER TABLE public.pg_user_subscriptions 
DROP CONSTRAINT IF EXISTS pg_user_subscriptions_plan_id_fkey;

-- 2. Clear any existing data that might conflict with UUID conversion
-- (This is safe for development/testing - adjust for production)
DELETE FROM public.pg_user_subscriptions;

-- 3. Change plan_id column back to UUID
ALTER TABLE public.pg_user_subscriptions 
ALTER COLUMN plan_id TYPE UUID USING plan_id::UUID;

-- 4. Add proper foreign key constraint to pg_merchant_plans
ALTER TABLE public.pg_user_subscriptions 
ADD CONSTRAINT pg_user_subscriptions_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES pg_merchant_plans(id) ON DELETE CASCADE;

-- 5. Also fix pg_profiles.current_plan_id if it was corrupted
ALTER TABLE public.pg_profiles 
DROP CONSTRAINT IF EXISTS fk_current_plan;

-- Clear any invalid current_plan_id values
UPDATE public.pg_profiles 
SET current_plan_id = NULL 
WHERE current_plan_id IS NOT NULL;

-- Change current_plan_id back to UUID if it was changed to TEXT
ALTER TABLE public.pg_profiles 
ALTER COLUMN current_plan_id TYPE UUID USING current_plan_id::UUID;

-- Restore foreign key constraint
ALTER TABLE public.pg_profiles 
ADD CONSTRAINT fk_current_plan 
FOREIGN KEY (current_plan_id) REFERENCES pg_merchant_plans(id) ON DELETE SET NULL;
