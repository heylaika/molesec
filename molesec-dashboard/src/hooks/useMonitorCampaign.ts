import { campaignApi } from "@/api/client/campaignApi";
import { useCampaignRecord } from "@/stores/useCampaignRecord";
import { CampaignData } from "@/util/campaign";
import { RowData } from "@/util/supabase";
import { useAsync, useInterval } from "react-use";

export const useMonitorCampaign = (
  campaign: CampaignData & RowData<"Campaign">
) => {
  const updateAttacks = async () => {
    const attacks = await campaignApi.getAttacks(campaign.id);

    if (!attacks) return;

    useCampaignRecord.replace(campaign.id, (current) => ({
      ...current,
      attacks,
    }));
  };

  useAsync(updateAttacks, [campaign?.id]);
  useInterval(updateAttacks, 10000);
};
