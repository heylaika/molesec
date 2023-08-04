
-- RLS policies for Domain
CREATE POLICY "Teams can add new domains for their team" ON "Domain"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  "Domain"."team_id"::text = auth.jwt() ->> 'team_id'
);

CREATE POLICY "Teams can read their own domains" ON "Domain"
AS PERMISSIVE FOR SELECT TO public
USING (
  "Domain"."team_id"::text = auth.jwt() ->> 'team_id'
);

CREATE POLICY "You can't update domains directly" ON "Domain"
AS PERMISSIVE FOR UPDATE TO public
WITH CHECK (false);

CREATE POLICY "You can only remove your own un-delegated domains" ON "Domain"
AS PERMISSIVE FOR DELETE TO public
USING (
  "Domain"."team_id"::text = auth.jwt() ->> 'team_id'
  AND "Domain"."is_delegated" = false
);

ALTER TABLE "Domain" ENABLE ROW LEVEL SECURITY;
