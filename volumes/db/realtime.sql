-- Realtime configuration
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Enable realtime for our tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
