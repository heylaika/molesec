-- This migration adds product invites, teams and memberships to the database.
-- More crucially, it sets up the right RLS policies for them.

-- CreateTable
CREATE TABLE "Team" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "org_name" TEXT NOT NULL,
  "org_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
  "user_id" TEXT NOT NULL,
  "team_id" UUID NOT NULL,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "email" TEXT NOT NULL,
  CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("user_id", "team_id")
);

-- CreateTable
CREATE TABLE "TeamInvite" (
  "email" TEXT NOT NULL,
  "team_id" UUID NOT NULL,
  "inviter_email" TEXT NOT NULL,
  "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("email", "team_id")
);

-- CreateTable
CREATE TABLE "ProductInvite" (
  "email" TEXT NOT NULL,
  "inviter_email" TEXT NOT NULL,
  "invited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductInvite_pkey" PRIMARY KEY ("email")
);

-- AddForeignKey
ALTER TABLE "TeamMembership"
ADD CONSTRAINT "TeamMembership_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id")
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvite"
ADD CONSTRAINT "TeamInvite_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Helper functions for RLS policies
CREATE FUNCTION team_has_member(team_id UUID, sub TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM "TeamMembership" 
    WHERE "TeamMembership"."team_id" = $1
    AND "TeamMembership"."user_id" = $2
  );
END; $$ LANGUAGE plpgsql;

-- RLS policies for ProductInvite
CREATE POLICY "You can't create product invites" ON "ProductInvite"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (false);

CREATE POLICY "You can read your own product invites" ON "ProductInvite"
AS PERMISSIVE FOR SELECT TO public
USING ("ProductInvite"."email" = auth.jwt() ->> 'email');

CREATE POLICY "You can't update product invites" ON "ProductInvite"
AS PERMISSIVE FOR UPDATE TO public
WITH CHECK (false);

CREATE POLICY "You can't remove product invites" ON "ProductInvite"
AS PERMISSIVE FOR DELETE TO public
USING (false);

ALTER TABLE "ProductInvite" ENABLE ROW LEVEL SECURITY;

-- RLS policies for Team
CREATE POLICY "Users with an email can create a team" ON "Team"
AS PERMISSIVE FOR INSERT TO public 
WITH CHECK (auth.jwt() ->> 'email' IS NOT NULL);

CREATE POLICY "Team members can read their teams" ON "Team" 
AS PERMISSIVE FOR SELECT TO public 
USING (team_has_member("Team".id, auth.jwt() ->> 'sub'));

CREATE POLICY "Users with the right team_id claim can edit" ON "Team" 
AS PERMISSIVE FOR UPDATE TO public 
USING ("Team"."id"::text = auth.jwt() ->> 'team_id')
WITH CHECK ("Team"."id"::text = auth.jwt() ->> 'team_id');

CREATE POLICY "The team owner can delete" ON "Team" 
AS PERMISSIVE FOR DELETE TO public 
USING ("Team"."owner_user_id" = auth.jwt() ->> 'sub');

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;

-- RLS policies for TeamMembership
CREATE POLICY "Invited users can join" ON "TeamMembership"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  "TeamMembership"."email" = auth.jwt() ->> 'email'
  AND EXISTS (
    SELECT 1 FROM "TeamInvite" 
    WHERE "TeamInvite"."email" = auth.jwt() ->> 'email'
    AND "TeamInvite"."team_id" = "TeamMembership"."team_id"
  )
);

CREATE POLICY "Members can read their own and their teams memberships" ON "TeamMembership"
AS PERMISSIVE FOR SELECT TO public
USING (
  "TeamMembership"."user_id" = auth.jwt() ->> 'sub'
  OR "TeamMembership"."team_id"::text = auth.jwt() ->> 'team_id'
);

CREATE POLICY "You can't update memberships" ON "TeamMembership"
AS PERMISSIVE FOR UPDATE TO public
WITH CHECK (false);

CREATE POLICY "You can leave your team or the owner can remove you" ON "TeamMembership"
AS PERMISSIVE FOR DELETE TO public
USING (
  "TeamMembership"."user_id" = auth.jwt() ->> 'sub'
  OR (
    SELECT EXISTS (
      SELECT 1 FROM "Team" 
      WHERE "Team"."id" = "TeamMembership"."team_id"
      AND "Team"."owner_user_id" = auth.jwt() ->> 'sub'
    )
  )
);

ALTER TABLE "TeamMembership" ENABLE ROW LEVEL SECURITY;

-- RLS policies for TeamInvite
CREATE POLICY "You can invite to your team with your own email" ON "TeamInvite"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (
  "TeamInvite"."inviter_email" = auth.jwt() ->> 'email'
  AND "TeamInvite"."team_id"::text = auth.jwt() ->> 'team_id'
);

CREATE POLICY "Members can read their own and their teams invites" ON "TeamInvite"
AS PERMISSIVE FOR SELECT TO public
USING (
  "TeamInvite"."email" = auth.jwt() ->> 'email'
  OR "TeamInvite"."team_id"::text = auth.jwt() ->> 'team_id'
);

CREATE POLICY "You can't update invites" ON "TeamInvite"
AS PERMISSIVE FOR UPDATE TO public
WITH CHECK (false);

CREATE POLICY "You can remove your own and your teams invites" ON "TeamInvite"
AS PERMISSIVE FOR DELETE TO public
USING (
  "TeamInvite"."email" = auth.jwt() ->> 'email'
  OR "TeamInvite"."team_id"::text = auth.jwt() ->> 'team_id'
);

ALTER TABLE "TeamInvite" ENABLE ROW LEVEL SECURITY;
