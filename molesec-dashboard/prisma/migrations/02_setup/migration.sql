-- This migration sets up the right permissions after the initial migration.
-- The Supabase client has trouble reading from the datbase otherwise.
-- We also disallow access to the __prisma_migrations table, so that migrations can't be read through the Supabase client.

-- Ensure that the right permissions are granted to the right roles.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Set up RLS policy for __prisma_migrations so that users' can never access it.
CREATE TABLE IF NOT EXISTS _prisma_migrations (_ INT); -- may not exist in shadow DB
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- RLS policies for prisma migrations
CREATE POLICY "Users can't access this table" ON "_prisma_migrations"
AS PERMISSIVE FOR ALL TO public
WITH CHECK (false);
