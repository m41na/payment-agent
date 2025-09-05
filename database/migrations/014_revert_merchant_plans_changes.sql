-- Migration: Revert pg_merchant_plans changes
-- Date: 2025-01-04
-- Description: Restore pg_merchant_plans table to original UUID schema for Stripe sync compatibility

-- Drop foreign key constraint
ALTER TABLE public.pg_profiles 
DROP CONSTRAINT IF EXISTS fk_current_plan;

-- Remove any manually inserted records that break the schema
DELETE FROM public.pg_merchant_plans WHERE id IN ('daily', 'monthly', 'yearly');

-- Restore id column to UUID type
ALTER TABLE public.pg_merchant_plans 
ALTER COLUMN id TYPE UUID USING gen_random_uuid();

-- Restore current_plan_id in pg_profiles to UUID
ALTER TABLE public.pg_profiles 
ALTER COLUMN current_plan_id TYPE UUID USING NULL;

-- Recreate foreign key constraint with proper UUID types
ALTER TABLE public.pg_profiles 
ADD CONSTRAINT fk_current_plan 
FOREIGN KEY (current_plan_id) REFERENCES pg_merchant_plans(id);
