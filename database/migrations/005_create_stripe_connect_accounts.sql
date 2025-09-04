-- Migration: Create Stripe Connect accounts table
-- This table stores merchant account information for Stripe Connect onboarding

CREATE TABLE IF NOT EXISTS pg_stripe_connect_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_account_id TEXT NOT NULL UNIQUE,
    onboarding_status TEXT NOT NULL DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'in_progress', 'completed', 'restricted')),
    charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    requirements JSONB NOT NULL DEFAULT '{"currently_due": [], "eventually_due": [], "past_due": []}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pg_stripe_connect_accounts_user_id ON pg_stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_stripe_connect_accounts_stripe_account_id ON pg_stripe_connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_pg_stripe_connect_accounts_onboarding_status ON pg_stripe_connect_accounts(onboarding_status);

-- Enable Row Level Security
ALTER TABLE pg_stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own Stripe Connect accounts" ON pg_stripe_connect_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Stripe Connect accounts" ON pg_stripe_connect_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe Connect accounts" ON pg_stripe_connect_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_pg_stripe_connect_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pg_stripe_connect_accounts_updated_at
    BEFORE UPDATE ON pg_stripe_connect_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_pg_stripe_connect_accounts_updated_at();

-- Add comments for documentation
COMMENT ON TABLE pg_stripe_connect_accounts IS 'Stores Stripe Connect merchant account information and onboarding status';
COMMENT ON COLUMN pg_stripe_connect_accounts.stripe_account_id IS 'Stripe Connect account ID (acct_xxx)';
COMMENT ON COLUMN pg_stripe_connect_accounts.onboarding_status IS 'Current onboarding status: pending, in_progress, completed, restricted';
COMMENT ON COLUMN pg_stripe_connect_accounts.charges_enabled IS 'Whether the account can accept payments';
COMMENT ON COLUMN pg_stripe_connect_accounts.payouts_enabled IS 'Whether the account can receive payouts';
COMMENT ON COLUMN pg_stripe_connect_accounts.requirements IS 'JSON object containing Stripe account requirements (currently_due, eventually_due, past_due)';
