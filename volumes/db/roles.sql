-- Create basic roles for PostgREST
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

-- Create authenticator role (used by PostgREST)
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'your-super-secret-and-long-postgres-password';
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- Create auth service user
CREATE ROLE supabase_auth_admin NOINHERIT CREATEDB CREATEROLE REPLICATION SUPERUSER LOGIN PASSWORD 'your-super-secret-and-long-postgres-password';

-- Create realtime service user
CREATE ROLE supabase_realtime_admin NOINHERIT CREATEDB CREATEROLE REPLICATION LOGIN PASSWORD 'your-super-secret-and-long-postgres-password';

-- Create auth schema and grant permissions
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;

-- Create auth schema and grant permissions
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
