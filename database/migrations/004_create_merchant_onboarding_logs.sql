-- Migration: Create merchant onboarding logs
-- Date: 2025-01-04
-- Description: Creates table to track merchant onboarding events and state changes

-- Create merchant onboarding logs table
CREATE TABLE public.pg_merchant_onboarding_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pg_merchant_onboarding_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own onboarding logs" ON public.pg_merchant_onboarding_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert onboarding logs" ON public.pg_merchant_onboarding_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_merchant_onboarding_logs;
