-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_date" DATE NOT NULL,
    "duration_days" INT NOT NULL,
    "objective" JSONB NOT NULL,
    "attacks" JSONB NOT NULL,
    "creator_user_id" TEXT NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignActivity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "team_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" TEXT,
    "attack_id" TEXT,
    "attack_log_id" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "CampaignActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignActivity" ADD CONSTRAINT "CampaignActivity_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS policies for Campaign
CREATE POLICY "Teams can create campaigns" ON "Campaign"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK ("Campaign"."team_id"::text = auth.jwt() ->> 'team_id');

CREATE POLICY "Teams can read their campaigns" ON "Campaign"
AS PERMISSIVE FOR SELECT TO public
USING ("Campaign"."team_id"::text = auth.jwt() ->> 'team_id');

CREATE POLICY "Teams can update their campaigns" ON "Campaign"
AS PERMISSIVE FOR UPDATE TO public
USING ("Campaign"."team_id"::text = auth.jwt() ->> 'team_id')
WITH CHECK ("Campaign"."team_id"::text = auth.jwt() ->> 'team_id');

CREATE POLICY "Teams can delete their campaigns" ON "Campaign"
AS PERMISSIVE FOR DELETE TO public
USING ("Campaign"."team_id"::text = auth.jwt() ->> 'team_id');

ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;

-- RLS policies for CampaignActivity

CREATE POLICY "Teams can't create campaign activity" ON "CampaignActivity"
AS PERMISSIVE FOR INSERT TO public
WITH CHECK (false);

CREATE POLICY "Teams can read their campaign activity" ON "CampaignActivity"
AS PERMISSIVE FOR SELECT TO public
USING ("CampaignActivity"."campaign_id"::text = auth.jwt() ->> 'team_id');

CREATE POLICY "Teams can't delete campaign activities" ON "CampaignActivity"
AS PERMISSIVE FOR DELETE TO public
USING (false);

CREATE POLICY "Teams can't update campaign activities" ON "CampaignActivity"
AS PERMISSIVE FOR UPDATE TO public
USING (false)
WITH CHECK (false);

ALTER TABLE "CampaignActivity" ENABLE ROW LEVEL SECURITY;
