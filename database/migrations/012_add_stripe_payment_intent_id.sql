-- Migration: Add stripe_payment_intent_id column
-- Date: 2025-01-04
-- Description: Add missing stripe_payment_intent_id column to pg_user_subscriptions for one-time payments

ALTER TABLE public.pg_user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
