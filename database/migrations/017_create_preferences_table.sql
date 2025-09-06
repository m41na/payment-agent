-- Create preferences table for storefront and business settings
CREATE TABLE IF NOT EXISTS pg_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Storefront settings
    storefront_name TEXT,
    storefront_logo_svg TEXT, -- SVG as text or URL to stored SVG
    storefront_description TEXT,
    primary_color VARCHAR(7) DEFAULT '#6200ee', -- hex color
    accent_color VARCHAR(7) DEFAULT '#03dac6', -- hex color
    storefront_latitude DECIMAL(10, 8),
    storefront_longitude DECIMAL(11, 8),
    
    -- Business information
    business_hours JSONB DEFAULT '{}', -- {"monday": {"open": "09:00", "close": "17:00", "closed": false}, ...}
    business_street TEXT,
    business_city TEXT,
    business_state TEXT,
    business_zip VARCHAR(10),
    business_country VARCHAR(2) DEFAULT 'US',
    
    -- Contact information
    business_contact_name TEXT,
    business_phone VARCHAR(20),
    business_email TEXT,
    business_website TEXT,
    
    -- Additional business settings
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000, -- e.g., 0.0875 for 8.75%
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    auto_accept_orders BOOLEAN DEFAULT false,
    delivery_radius_miles INTEGER DEFAULT 10,
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preference record per user
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE pg_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own preferences" ON pg_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON pg_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON pg_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON pg_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pg_preferences_updated_at 
    BEFORE UPDATE ON pg_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
