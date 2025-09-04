-- Migration: Create Events system
-- This table stores events (auctions, garage sales, farmers markets, etc.) with geolocation and date/time

-- Enable required extensions for geospatial functionality
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE IF NOT EXISTS pg_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('garage_sale', 'auction', 'farmers_market', 'flea_market', 'estate_sale', 'country_fair', 'craft_fair', 'food_truck', 'pop_up_shop', 'other')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location_name VARCHAR(255),
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    contact_info JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_coordinates CHECK (
        latitude BETWEEN -90 AND 90 AND 
        longitude BETWEEN -180 AND 180
    )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pg_events_organizer_id ON pg_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_pg_events_event_type ON pg_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pg_events_start_date ON pg_events(start_date);
CREATE INDEX IF NOT EXISTS idx_pg_events_end_date ON pg_events(end_date);
CREATE INDEX IF NOT EXISTS idx_pg_events_is_active ON pg_events(is_active);
-- Use PostGIS for spatial indexing instead of earthdistance
CREATE INDEX IF NOT EXISTS idx_pg_events_location ON pg_events USING GIST (
    ST_Point(longitude, latitude)
);

-- Create products table for marketplace items
CREATE TABLE IF NOT EXISTS pg_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    images TEXT[] DEFAULT '{}',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_name VARCHAR(255),
    address TEXT,
    tags TEXT[] DEFAULT '{}',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_coordinates_products CHECK (
        latitude BETWEEN -90 AND 90 AND 
        longitude BETWEEN -180 AND 180
    )
);

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_pg_products_seller_id ON pg_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_pg_products_category ON pg_products(category);
CREATE INDEX IF NOT EXISTS idx_pg_products_condition ON pg_products(condition);
CREATE INDEX IF NOT EXISTS idx_pg_products_price ON pg_products(price);
CREATE INDEX IF NOT EXISTS idx_pg_products_is_available ON pg_products(is_available);
CREATE INDEX IF NOT EXISTS idx_pg_products_location ON pg_products USING GIST (
    ST_Point(longitude, latitude)
);

-- Create table for products associated with events
CREATE TABLE IF NOT EXISTS pg_event_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES pg_events(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES pg_products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, product_id)
);

-- Create indexes for event products
CREATE INDEX IF NOT EXISTS idx_pg_event_products_event_id ON pg_event_products(event_id);
CREATE INDEX IF NOT EXISTS idx_pg_event_products_product_id ON pg_event_products(product_id);

-- Enable Row Level Security
ALTER TABLE pg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_event_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for events
CREATE POLICY "Anyone can view active events" ON pg_events
    FOR SELECT USING (is_active = true);

CREATE POLICY "Organizers can view their own events" ON pg_events
    FOR SELECT USING (auth.uid() = organizer_id);

CREATE POLICY "Authenticated users can create events" ON pg_events
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Authenticated users can update their own events" ON pg_events
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Authenticated users can delete their own events" ON pg_events
    FOR DELETE USING (auth.uid() = organizer_id);

-- Create RLS policies for products
CREATE POLICY "Anyone can view available products" ON pg_products
    FOR SELECT USING (is_available = true);

CREATE POLICY "Sellers can view their own products" ON pg_products
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create products" ON pg_products
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can update their own products" ON pg_products
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can delete their own products" ON pg_products
    FOR DELETE USING (auth.uid() = seller_id);

-- Create RLS policies for event products
CREATE POLICY "Anyone can view event products for active events" ON pg_event_products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pg_events 
            WHERE pg_events.id = event_id 
            AND pg_events.is_active = true
        )
    );

CREATE POLICY "Event organizers can manage event products" ON pg_event_products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM pg_events 
            WHERE pg_events.id = event_id 
            AND pg_events.organizer_id = auth.uid()
        )
    );

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_pg_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pg_events_updated_at
    BEFORE UPDATE ON pg_events
    FOR EACH ROW
    EXECUTE FUNCTION update_pg_events_updated_at();

-- Create function to find nearby events
CREATE OR REPLACE FUNCTION find_nearby_events(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_miles INTEGER DEFAULT 10,
    event_type_filter TEXT DEFAULT NULL,
    start_date_filter TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    event_type VARCHAR(50),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    location_name VARCHAR(255),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    distance_miles DECIMAL,
    organizer_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_date,
        e.end_date,
        e.location_name,
        e.address,
        e.latitude,
        e.longitude,
        (earth_distance(
            ll_to_earth(user_lat, user_lng),
            ll_to_earth(e.latitude, e.longitude)
        ) * 0.000621371)::DECIMAL as distance_miles,
        p.full_name as organizer_name
    FROM pg_events e
    JOIN pg_profiles p ON e.organizer_id = p.user_id
    WHERE 
        e.is_active = true
        AND e.end_date > start_date_filter
        AND earth_distance(
            ll_to_earth(user_lat, user_lng),
            ll_to_earth(e.latitude, e.longitude)
        ) <= (radius_miles * 1609.34)
        AND (event_type_filter IS NULL OR e.event_type = event_type_filter)
    ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE pg_events IS 'Stores marketplace events like garage sales, auctions, farmers markets with geolocation';
COMMENT ON COLUMN pg_events.event_type IS 'Type of event: garage_sale, auction, farmers_market, flea_market, estate_sale, country_fair, craft_fair, food_truck, pop_up_shop, other';
COMMENT ON COLUMN pg_events.latitude IS 'Event location latitude for proximity-based discovery';
COMMENT ON COLUMN pg_events.longitude IS 'Event location longitude for proximity-based discovery';
COMMENT ON COLUMN pg_events.contact_info IS 'JSON object containing contact information (phone, email, website)';
COMMENT ON TABLE pg_event_products IS 'Links products to events for event-specific product listings';
COMMENT ON TABLE pg_products IS 'Stores marketplace products';
COMMENT ON FUNCTION find_nearby_events IS 'Function to find events within specified radius of user location';
