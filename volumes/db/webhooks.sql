-- Webhooks configuration
CREATE SCHEMA IF NOT EXISTS supabase_functions;

-- Create webhook function placeholder
CREATE OR REPLACE FUNCTION supabase_functions.http_request()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Webhook functionality will be handled by Edge Functions
  RETURN COALESCE(NEW, OLD);
END;
$$;
