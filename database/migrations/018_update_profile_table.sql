-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add additional personal information columns to pg_profiles
ALTER TABLE pg_profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS social_1 TEXT, -- e.g., Instagram handle, Twitter, etc.
ADD COLUMN IF NOT EXISTS social_2 TEXT, -- second social media account
ADD COLUMN IF NOT EXISTS bio TEXT, -- personal bio/description
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{"profile_visible": true, "show_phone": false, "show_email": false}';

-- Create trigger for updated_at (PostgreSQL doesn't support IF NOT EXISTS for triggers)
DROP TRIGGER IF EXISTS update_pg_profiles_updated_at ON pg_profiles;
CREATE TRIGGER update_pg_profiles_updated_at 
    BEFORE UPDATE ON pg_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add missing INSERT policy for pg_profiles table
CREATE POLICY "Users can insert own profile" ON public.pg_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);