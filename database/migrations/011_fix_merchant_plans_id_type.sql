-- Migration: Fix pg_merchant_plans id field type
-- Date: 2025-01-04
-- Description: Change id field from UUID to TEXT to support string identifiers like 'daily', 'monthly'

-- Drop foreign key constraints that reference the id field
ALTER TABLE public.pg_profiles 
DROP CONSTRAINT IF EXISTS fk_current_plan;

-- Change id field from UUID to TEXT
ALTER TABLE public.pg_merchant_plans 
ALTER COLUMN id TYPE TEXT;

-- Also change current_plan_id in pg_profiles from UUID to TEXT to match
ALTER TABLE public.pg_profiles 
ALTER COLUMN current_plan_id TYPE TEXT;

-- Recreate foreign key constraint
ALTER TABLE public.pg_profiles 
ADD CONSTRAINT fk_current_plan 
FOREIGN KEY (current_plan_id) REFERENCES pg_merchant_plans(id);
