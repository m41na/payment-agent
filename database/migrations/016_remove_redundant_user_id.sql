-- Migration: Remove redundant user_id column from pg_transactions
-- Date: 2025-09-05
-- Description: Remove user_id column since buyer_id and seller_id provide proper marketplace semantics

-- Drop the old user_id column
ALTER TABLE public.pg_transactions 
DROP COLUMN user_id;
