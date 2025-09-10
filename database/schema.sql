-- ============================================================================
-- Payment Agent Marketplace - Consolidated Database Schema
-- Generated from migrations: 000-029
-- Description: Complete database schema for fresh deployment
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User profiles table (base user information)
CREATE TABLE public.pg_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  user_type TEXT DEFAULT 'buyer' CHECK (user_type IN ('buyer', 'seller', 'admin', 'support')),
  merchant_status TEXT DEFAULT 'none' CHECK (merchant_status IN ('none', 'payment_added', 'plan_selected', 'plan_purchased', 'onboarding_started', 'onboarding_completed', 'active', 'suspended')),
  stripe_connect_account_id TEXT UNIQUE,
  onboarding_url TEXT,
  subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'unpaid')),
  current_plan_id UUID,
  phone_number TEXT,
  social_1 TEXT,
  social_2 TEXT,
  bio TEXT,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  privacy_settings JSONB DEFAULT '{"profile_visible": true, "show_phone": false, "show_email": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences/storefront settings
CREATE TABLE public.pg_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Storefront settings
    storefront_name TEXT,
    storefront_logo_svg TEXT,
    storefront_description TEXT,
    primary_color VARCHAR(7) DEFAULT '#6200ee',
    accent_color VARCHAR(7) DEFAULT '#03dac6',
    storefront_latitude DECIMAL(10, 8),
    storefront_longitude DECIMAL(11, 8),
    
    -- Business information
    business_hours JSONB DEFAULT '{}',
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
    
    -- Business settings
    tax_rate DECIMAL(5, 4) DEFAULT 0.0000,
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    auto_accept_orders BOOLEAN DEFAULT false,
    delivery_radius_miles INTEGER DEFAULT 10,
    minimum_order_amount DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- PAYMENT SYSTEM
-- ============================================================================

-- Payment methods
CREATE TABLE public.pg_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  last4 TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE public.pg_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_connect_account_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  transaction_type TEXT DEFAULT 'payment' CHECK (transaction_type IN ('payment', 'subscription', 'payout')),
  payment_method_id UUID REFERENCES pg_payment_methods(id),
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stripe Connect accounts
CREATE TABLE public.pg_stripe_connect_accounts (
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

-- ============================================================================
-- SUBSCRIPTION SYSTEM
-- ============================================================================

-- Subscription plans
CREATE TABLE public.pg_subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  stripe_product_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT UNIQUE NOT NULL,
  price_amount INTEGER NOT NULL,
  price_currency TEXT DEFAULT 'usd',
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE public.pg_user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES pg_subscription_plans(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MARKETPLACE SYSTEM
-- ============================================================================

-- Events (auctions, garage sales, etc.)
CREATE TABLE public.pg_events (
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

-- Products
CREATE TABLE public.pg_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
    location_name VARCHAR(255),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_product_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
);

-- Event attendees
CREATE TABLE public.pg_event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.pg_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
    rsvp_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attendance_confirmed BOOLEAN DEFAULT FALSE,
    attendance_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

-- ============================================================================
-- SHOPPING CART SYSTEM
-- ============================================================================

-- Cart items
CREATE TABLE public.pg_cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'product',
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    product_snapshot JSONB,
    metadata JSONB DEFAULT '{}',
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, product_id, product_type)
);

-- ============================================================================
-- REFERRAL SYSTEM
-- ============================================================================

-- Referral codes
CREATE TABLE public.pg_referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER DEFAULT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral relationships
CREATE TABLE public.pg_referral_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(referrer_id, referred_id),
    CHECK (referrer_id != referred_id)
);

-- Referral points
CREATE TABLE public.pg_referral_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    total_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    current_tier VARCHAR(20) DEFAULT 'BRONZE' CHECK (current_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND')),
    tier_progress DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral conversion events
CREATE TABLE public.pg_referral_conversion_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referral_id UUID NOT NULL REFERENCES pg_referral_relationships(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('SIGNUP', 'FIRST_PURCHASE', 'SUBSCRIPTION', 'MILESTONE_REACHED')),
    points_awarded INTEGER NOT NULL,
    conversion_value DECIMAL(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MESSAGING SYSTEM
-- ============================================================================

-- Messages
CREATE TABLE public.pg_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.pg_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    thread_id UUID,
    parent_message_id UUID REFERENCES public.pg_messages(id),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- LOGGING TABLES
-- ============================================================================

-- Merchant onboarding logs
CREATE TABLE public.pg_merchant_onboarding_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Events indexes
CREATE INDEX idx_pg_events_organizer_id ON pg_events(organizer_id);
CREATE INDEX idx_pg_events_event_type ON pg_events(event_type);
CREATE INDEX idx_pg_events_start_date ON pg_events(start_date);
CREATE INDEX idx_pg_events_end_date ON pg_events(end_date);
CREATE INDEX idx_pg_events_is_active ON pg_events(is_active);
CREATE INDEX idx_pg_events_location ON pg_events USING GIST (ST_Point(longitude, latitude));

-- Products indexes
CREATE INDEX idx_pg_products_seller_id ON pg_products(seller_id);
CREATE INDEX idx_pg_products_category ON pg_products(category);
CREATE INDEX idx_pg_products_price ON pg_products(price);
CREATE INDEX idx_pg_products_is_available ON pg_products(is_available);
CREATE INDEX idx_pg_products_location ON pg_products USING GIST (ST_Point(longitude, latitude));

-- Stripe Connect indexes
CREATE INDEX idx_pg_stripe_connect_accounts_user_id ON pg_stripe_connect_accounts(user_id);
CREATE INDEX idx_pg_stripe_connect_accounts_stripe_account_id ON pg_stripe_connect_accounts(stripe_account_id);
CREATE INDEX idx_pg_stripe_connect_accounts_onboarding_status ON pg_stripe_connect_accounts(onboarding_status);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Add foreign key constraint for current_plan_id in pg_profiles
ALTER TABLE public.pg_profiles 
ADD CONSTRAINT fk_current_plan 
FOREIGN KEY (current_plan_id) REFERENCES pg_subscription_plans(id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to handle new user profiles
CREATE OR REPLACE FUNCTION public.pg_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pg_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE TRIGGER pg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.pg_handle_new_user();

-- Function for updating updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_pg_preferences_updated_at 
    BEFORE UPDATE ON pg_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.pg_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_referral_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_referral_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_referral_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_merchant_onboarding_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- pg_profiles policies
CREATE POLICY "Users can view own profile" ON public.pg_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.pg_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.pg_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pg_profiles 
      WHERE id = auth.uid() AND user_type IN ('admin', 'support')
    )
  );

-- pg_preferences policies
CREATE POLICY "Users can view own preferences" ON pg_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON pg_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON pg_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON pg_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- pg_payment_methods policies
CREATE POLICY "Users can view own payment methods" ON public.pg_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment methods" ON public.pg_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment methods" ON public.pg_payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment methods" ON public.pg_payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- pg_transactions policies
CREATE POLICY "Buyers can view their purchases" ON public.pg_transactions
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their sales" ON public.pg_transactions
  FOR SELECT USING (auth.uid() = seller_id);

-- pg_stripe_connect_accounts policies
CREATE POLICY "Users can view their own Stripe Connect accounts" ON pg_stripe_connect_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Stripe Connect accounts" ON pg_stripe_connect_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe Connect accounts" ON pg_stripe_connect_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- pg_subscription_plans policies
CREATE POLICY "Anyone can view active subscription plans" ON public.pg_subscription_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage subscription plans" ON public.pg_subscription_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM pg_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- pg_user_subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.pg_user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- pg_events policies
CREATE POLICY "Anyone can view active events" ON pg_events
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can create events" ON pg_events
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their events" ON pg_events
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their events" ON pg_events
    FOR DELETE USING (auth.uid() = organizer_id);

-- pg_products policies
CREATE POLICY "Anyone can view available products" ON pg_products
    FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Users can create products" ON pg_products
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their products" ON pg_products
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their products" ON pg_products
    FOR DELETE USING (auth.uid() = seller_id);

-- pg_event_attendees policies
CREATE POLICY "Users can view event attendees" ON pg_event_attendees
    FOR SELECT USING (TRUE);

CREATE POLICY "Users can RSVP to events" ON pg_event_attendees
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their RSVP" ON pg_event_attendees
    FOR UPDATE USING (auth.uid() = user_id);

-- pg_cart_items policies
CREATE POLICY "Users can view own cart items" ON pg_cart_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON pg_cart_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON pg_cart_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON pg_cart_items
    FOR DELETE USING (auth.uid() = user_id);

-- pg_referral_codes policies
CREATE POLICY "Users can view own referral codes" ON pg_referral_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own referral codes" ON pg_referral_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own referral codes" ON pg_referral_codes
    FOR UPDATE USING (auth.uid() = user_id);

-- pg_referral_relationships policies
CREATE POLICY "Users can view referrals they made or received" ON pg_referral_relationships
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can create referral relationships" ON pg_referral_relationships
    FOR INSERT WITH CHECK (TRUE);

-- pg_referral_points policies
CREATE POLICY "Users can view own referral points" ON pg_referral_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage referral points" ON pg_referral_points
    FOR ALL WITH CHECK (TRUE);

-- pg_referral_conversion_events policies
CREATE POLICY "Users can view conversion events for their referrals" ON pg_referral_conversion_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pg_referral_relationships 
            WHERE id = referral_id AND (referrer_id = auth.uid() OR referred_id = auth.uid())
        )
    );

-- pg_messages policies
CREATE POLICY "Users can view messages they sent or received" ON pg_messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON pg_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they sent" ON pg_messages
    FOR UPDATE USING (auth.uid() = sender_id);

-- pg_merchant_onboarding_logs policies
CREATE POLICY "Users can view own onboarding logs" ON public.pg_merchant_onboarding_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert onboarding logs" ON public.pg_merchant_onboarding_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Create realtime schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS _realtime;

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_stripe_connect_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_subscription_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_event_attendees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_referral_codes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_referral_relationships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_referral_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_referral_conversion_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pg_merchant_onboarding_logs;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
