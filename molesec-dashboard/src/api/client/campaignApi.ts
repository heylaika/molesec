import { CampaignAttackRecord, CampaignData, isDraft } from "@/util/campaign";
import { fetcher } from "@/util/fetcher";
import { RowData } from "@/util/supabase";
import type { AttackStatus } from "../server/attackService";

export type AttackRecord = {
  [email: string]: {
    id: string;
    status: AttackStatus;
  };
};

const launch = async (campaign: CampaignData & RowData<"Campaign">) => {
  if (!isDraft(campaign)) {
    throw new Error("The campaign has already been launched.");
  }

  return await fetcher<CampaignData>(
    "/api/campaign/launch?campaign_id=" + campaign.id,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json; charset=utf8" },
    }
  );
};

const getAttacks = async (
  campaignId: string
): Promise<CampaignAttackRecord | undefined> => {
  return fetch("/api/campaign/attacks?campaign_id=" + campaignId, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf8" },
  }).then((res) =>
    res.status === 304 ? undefined : res.ok ? res.json() : undefined
  );
};

export const campaignApi = { launch, getAttacks };
