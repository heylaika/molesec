import { useCampaignRecord } from "@/stores/useCampaignRecord";
import { sortCampaigns } from "@/util/campaign";
import React from "react";

export const useCampaignList = () => {
  const campaigns = useCampaignRecord();

  return React.useMemo(
    () => sortCampaigns(Object.values(campaigns)),
    [campaigns]
  );
};
