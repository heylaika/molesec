import { useActiveTeam } from "@/stores/useActiveTeam";
import { useCampaignRecord } from "@/stores/useCampaignRecord";
import { CampaignData, hasValidCampaignData } from "@/util/campaign";
import { mapRecord } from "@/util/record";
import { RowData } from "@/util/supabase";
import { useUser } from "@auth0/nextjs-auth0/client";
import React from "react";
import { useDatabase } from "./useDatabase";

export const useManageCampaigns = () => {
  const teamId = useActiveTeam((team) => team?.id);
  const userId = useUser()?.user?.sub;
  const db = useDatabase();

  const fetchTeamCampaigns = React.useCallback(async () => {
    if (!teamId) return;

    const { data: campaigns } = await db
      .from("Campaign")
      .select("*")
      .eq("team_id", teamId);

    if (!campaigns) return;

    useCampaignRecord.setState(
      mapRecord(campaigns.filter(hasValidCampaignData), "id")
    );

    return campaigns;
  }, [db, teamId]);

  const createCampaign = React.useCallback(
    async (data: CampaignData) => {
      if (!teamId || !userId) {
        throw new Error("Team ID or user ID not in user claims.");
      }

      const campaign = await db
        .from("Campaign")
        .insert({ ...data, team_id: teamId, creator_user_id: userId })
        .select("*")
        .then(({ data }) => data?.[0]);

      if (!campaign) {
        throw new Error("Failed to get saved campaign");
      } else if (!hasValidCampaignData(campaign)) {
        throw new Error("Invalid campaign data returned");
      }

      useCampaignRecord.setState({ [campaign.id]: campaign });

      return campaign;
    },
    [db, teamId, userId]
  );

  const updateCampaign = React.useCallback(
    async (id: string, data: Partial<RowData<"Campaign">>) => {
      if (!teamId || !userId) return;

      const campaign = await db
        .from("Campaign")
        .update({ ...data, id })
        .eq("id", id)
        .select("*")
        .then(({ data }) => data?.[0]);

      if (!campaign) {
        throw new Error("Failed to get updated campaign");
      } else if (!hasValidCampaignData(campaign)) {
        throw new Error("Invalid campaign data returned");
      }

      useCampaignRecord.setState({ [campaign.id]: campaign });

      return campaign;
    },
    [db, teamId, userId]
  );

  const deleteById = React.useCallback(
    async (campaignId: string) => {
      if (!teamId || !userId) return;

      await db
        .from("Campaign")
        .delete()
        .eq("id", campaignId)
        .eq("team_id", teamId);

      useCampaignRecord.remove(campaignId);
    },
    [db, teamId, userId]
  );

  return { fetchTeamCampaigns, createCampaign, updateCampaign, deleteById };
};
