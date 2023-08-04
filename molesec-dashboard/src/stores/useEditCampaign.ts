import { CampaignData, createCampaignDraft } from "@/util/campaign";
import { cud } from "@/util/store";
import { create } from "zustand";

export const useEditCampaign = cud<CampaignData>(
  create(() => createCampaignDraft())
);
