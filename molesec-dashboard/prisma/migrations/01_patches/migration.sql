-- The Shadow database (used for migrations) does not have the `auth.jwt()` function set up, 
-- so we need to stub it here to not get an error when RLS policies are added that reference this function.

CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  CREATE FUNCTION auth.jwt()
  RETURNS jsonb 
  LANGUAGE SQL
  AS 'SELECT NULL::json;';
EXCEPTION
  WHEN duplicate_function 
  THEN NULL;
END; $$;
