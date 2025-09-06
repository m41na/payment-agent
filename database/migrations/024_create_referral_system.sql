-- Migration: Create Referral System Tables
-- Description: Creates comprehensive referral system with codes, relationships, points, and analytics

-- Create referral codes table
CREATE TABLE IF NOT EXISTS pg_referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER DEFAULT NULL, -- NULL means unlimited
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral relationships table
CREATE TABLE IF NOT EXISTS pg_referral_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique referral relationships
    UNIQUE(referrer_id, referred_id),
    -- Prevent self-referral
    CHECK (referrer_id != referred_id)
);

-- Create referral points table
CREATE TABLE IF NOT EXISTS pg_referral_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    current_tier VARCHAR(20) DEFAULT 'BRONZE' CHECK (current_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
    tier_progress DECIMAL(5,2) DEFAULT 0.00, -- Progress to next tier (0-100%)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create referral conversion events table
CREATE TABLE IF NOT EXISTS pg_referral_conversion_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_id UUID NOT NULL REFERENCES pg_referral_relationships(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('SIGNUP', 'FIRST_PURCHASE', 'SUBSCRIPTION', 'MILESTONE_REACHED')),
    points_awarded INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate conversion events for same referral and event type
    UNIQUE(referral_id, event_type)
);

-- Create referral rewards table
CREATE TABLE IF NOT EXISTS pg_referral_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('POINTS', 'DISCOUNT', 'CREDIT', 'BONUS')),
    reward_value DECIMAL(10,2) NOT NULL,
    points_cost INTEGER DEFAULT NULL,
    description TEXT,
    is_redeemed BOOLEAN DEFAULT false,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON pg_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON pg_referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON pg_referral_codes(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer ON pg_referral_relationships(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred ON pg_referral_relationships(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_code ON pg_referral_relationships(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_status ON pg_referral_relationships(status);

CREATE INDEX IF NOT EXISTS idx_referral_points_user_id ON pg_referral_points(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_points_total_points ON pg_referral_points(total_points);
CREATE INDEX IF NOT EXISTS idx_referral_points_tier ON pg_referral_points(current_tier);

CREATE INDEX IF NOT EXISTS idx_referral_events_referral_id ON pg_referral_conversion_events(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON pg_referral_conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_referral_events_created ON pg_referral_conversion_events(created_at);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON pg_referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_type ON pg_referral_rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_redeemed ON pg_referral_rewards(is_redeemed);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referral_codes_updated_at BEFORE UPDATE ON pg_referral_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referral_relationships_updated_at BEFORE UPDATE ON pg_referral_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referral_points_updated_at BEFORE UPDATE ON pg_referral_points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_referral_rewards_updated_at BEFORE UPDATE ON pg_referral_rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE pg_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_referral_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_referral_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral codes
CREATE POLICY "Users can view their own referral codes" ON pg_referral_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral codes" ON pg_referral_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral codes" ON pg_referral_codes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all referral codes" ON pg_referral_codes
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for referral relationships
CREATE POLICY "Users can view referrals they're involved in" ON pg_referral_relationships
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Service role can manage all referral relationships" ON pg_referral_relationships
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for referral points
CREATE POLICY "Users can view their own referral points" ON pg_referral_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all referral points" ON pg_referral_points
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for conversion events
CREATE POLICY "Users can view conversion events for their referrals" ON pg_referral_conversion_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pg_referral_relationships 
            WHERE id = referral_id 
            AND (referrer_id = auth.uid() OR referred_id = auth.uid())
        )
    );

CREATE POLICY "Service role can manage all conversion events" ON pg_referral_conversion_events
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for referral rewards
CREATE POLICY "Users can view their own referral rewards" ON pg_referral_rewards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral rewards" ON pg_referral_rewards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all referral rewards" ON pg_referral_rewards
    FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically create referral points entry for new users
CREATE OR REPLACE FUNCTION create_referral_points_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pg_referral_points (user_id, total_points, lifetime_points, current_tier)
    VALUES (NEW.id, 0, 0, 'BRONZE')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create referral points for new users
CREATE TRIGGER on_auth_user_created_referral_points
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_referral_points_for_user();

-- Create function to update tier based on points
CREATE OR REPLACE FUNCTION update_referral_tier()
RETURNS TRIGGER AS $$
DECLARE
    new_tier VARCHAR(20);
    tier_thresholds INTEGER[] := ARRAY[0, 100, 500, 2000, 10000]; -- BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
    tier_names VARCHAR(20)[] := ARRAY['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    i INTEGER;
    progress DECIMAL(5,2);
BEGIN
    -- Determine new tier based on total points
    new_tier := 'BRONZE';
    FOR i IN REVERSE 5..1 LOOP
        IF NEW.total_points >= tier_thresholds[i] THEN
            new_tier := tier_names[i];
            EXIT;
        END IF;
    END LOOP;
    
    -- Calculate progress to next tier
    progress := 0.00;
    FOR i IN 1..4 LOOP
        IF NEW.total_points >= tier_thresholds[i] AND NEW.total_points < tier_thresholds[i+1] THEN
            progress := ((NEW.total_points - tier_thresholds[i])::DECIMAL / (tier_thresholds[i+1] - tier_thresholds[i])::DECIMAL) * 100;
            EXIT;
        END IF;
    END LOOP;
    
    -- If at max tier, progress is 100%
    IF NEW.total_points >= tier_thresholds[5] THEN
        progress := 100.00;
    END IF;
    
    -- Update tier and progress
    NEW.current_tier := new_tier;
    NEW.tier_progress := progress;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tier when points change
CREATE TRIGGER update_referral_tier_on_points_change
    BEFORE UPDATE OF total_points ON pg_referral_points
    FOR EACH ROW EXECUTE FUNCTION update_referral_tier();

-- Create function to get referral data for multiple users (for sorting service)
CREATE OR REPLACE FUNCTION get_referral_data_for_users(user_ids UUID[])
RETURNS TABLE (
    user_id UUID,
    total_points INTEGER,
    current_tier VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.user_id,
        rp.total_points,
        rp.current_tier
    FROM pg_referral_points rp
    WHERE rp.user_id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON pg_referral_codes TO anon, authenticated;
GRANT SELECT ON pg_referral_relationships TO anon, authenticated;
GRANT SELECT ON pg_referral_points TO anon, authenticated;
GRANT SELECT ON pg_referral_conversion_events TO anon, authenticated;
GRANT SELECT ON pg_referral_rewards TO anon, authenticated;

-- Grant execute permission on the referral data function
GRANT EXECUTE ON FUNCTION get_referral_data_for_users(UUID[]) TO anon, authenticated, service_role;
