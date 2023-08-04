import type { CampaignData } from "@/util/campaign";
import { cud } from "@/util/store";
import { RowData } from "@/util/supabase";
import { create } from "zustand";

export type CampaignRecord = {
  [campaignId: string]: CampaignData & RowData<"Campaign">;
};

export const useCampaignRecord = cud<CampaignRecord>(create(() => ({})));
