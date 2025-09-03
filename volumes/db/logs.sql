-- Logs configuration for analytics
CREATE SCHEMA IF NOT EXISTS _analytics;

-- Create basic logging tables
CREATE TABLE IF NOT EXISTS _analytics.page_views (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    path TEXT,
    user_agent TEXT,
    referer TEXT
);

-- Grant permissions
GRANT ALL ON SCHEMA _analytics TO supabase_admin;
GRANT ALL ON ALL TABLES IN SCHEMA _analytics TO supabase_admin;
