-- Migration: Update transactions for marketplace
-- Date: 2025-01-04
-- Description: Updates pg_transactions table to support marketplace transactions with buyers and sellers

-- Add new columns for marketplace functionality
ALTER TABLE public.pg_transactions 
ADD COLUMN buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN stripe_connect_account_id TEXT,
ADD COLUMN transaction_type TEXT DEFAULT 'payment' CHECK (transaction_type IN ('payment', 'subscription', 'payout')),
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Migrate existing data: copy user_id to buyer_id
UPDATE public.pg_transactions 
SET buyer_id = user_id 
WHERE buyer_id IS NULL;

-- Make buyer_id NOT NULL after migration
ALTER TABLE public.pg_transactions 
ALTER COLUMN buyer_id SET NOT NULL;

-- Drop the old RLS policy
DROP POLICY "Users can view own transactions" ON public.pg_transactions;

-- Create new RLS policies for marketplace
CREATE POLICY "Buyers can view their purchases" ON public.pg_transactions
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their sales" ON public.pg_transactions
  FOR SELECT USING (auth.uid() = seller_id);

-- Note: Keep user_id column for backward compatibility during transition
-- It can be dropped in a future migration once all code is updated
