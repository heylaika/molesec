import { AttackRecord } from "@/api/client/campaignApi";
import type {
  Attack,
  AttackLog,
  AttackStatus,
  AttackTarget,
} from "@/api/server/attackService";

import type { Campaign } from "@prisma/client";
import addDays from "date-fns/addDays";
import * as uuid from "uuid";
import { JSONNormalized, reserialize } from "./json";
import { prune, SomeRecord } from "./record";
import { getEmailDomain, isEmail } from "./string";
import { Insertion, RowData } from "./supabase";

export type CampaignValidationResult = {
  ok: boolean;
  undelegatedDomains: string[];
};

export type CampaignData = {
  id?: string;
  name: string;
  start_date: string;
  duration_days: number;
  objective: CampaignObjective;
  attacks: CampaignAttackRecord;
};

export type CampaignTarget = {
  email: string;
  called_name: string;
  social_links: string[];
};

export type CampaignObjective = {
  id: string;
  goal: string;
  targets: CampaignTarget[];
};

export type CampaignAttack = {
  id: string;
  status: AttackStatus;
  logs?: AttackLog[];
};

export type CampaignAttackRecord = { [email: string]: CampaignAttack };

export const isDraft = (
  campaign: Partial<RowData<"Campaign"> | CampaignData>
) => Object.keys((campaign.attacks ?? {}) as any).length === 0;

export const hasValidCampaignData = <T extends SomeRecord>(
  campaign: T
): campaign is T & CampaignData =>
  Boolean(
    campaign.name &&
      campaign.start_date &&
      campaign.duration_days &&
      campaign.objective &&
      uuid.validate(campaign.objective.id) &&
      Array.isArray(campaign.objective.targets)
  );

export const sortCampaigns = (campaigns: RowData<"Campaign">[]) =>
  campaigns
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .sort((left, right) => {
      if (isDraft(left) && !isDraft(right)) return -1;
      if (!isDraft(left) && isDraft(right)) return 1;
      else return 0;
    });

export const isValidCampaignTarget = (target: CampaignTarget) =>
  target.called_name.length > 0 && isEmail(target.email);

export const asAttackTarget = ({
  email,
  called_name,
  social_links,
}: CampaignTarget): AttackTarget =>
  prune({
    email,
    called_name: called_name ? called_name : undefined,
    social_links: social_links.filter(Boolean),
  });

export const canLaunch = (campaign: CampaignData) =>
  isDraft(campaign) && campaign.objective.targets.some(isValidCampaignTarget);

export const createCampaignDraft = (): CampaignData => ({
  name: "New campaign",
  start_date: new Date().toISOString().split("T")[0],
  duration_days: 7,
  attacks: {},
  objective: {
    id: uuid.v4(),
    goal: "TARGET_CLICKED_ON_LINK",
    targets: [],
  },
});

export const createAttackRecord = (attacks: Attack[]): AttackRecord =>
  Object.fromEntries(
    attacks.map(({ id, target, status }) => [target.email, { id, status }])
  );

export const createCampaignActivity = (
  campaign: RowData<"Campaign"> | Campaign,
  attacks: Attack[]
): JSONNormalized<Insertion<"CampaignActivity">>[] => {
  const activity: Insertion<"CampaignActivity">[] = [];

  for (const attack of attacks) {
    if (!attack.logs) continue;

    const attackActivity = attack.logs.map((log) => ({
      activity_type: log.type,
      attack_id: attack.id,
      attack_log_id: log.id,
      campaign_id: campaign.id,
      payload: log.payload,
      performed_at: log.created_at,
      team_id: campaign.team_id,
      user_id: null,
    }));

    activity.push(...attackActivity);
  }

  return reserialize(activity);
};

export const getCampaignStatus = (campaign: CampaignData) => {
  if (isDraft(campaign)) {
    return "Draft" as const;
  } else if (Date.now() > +parseEndDate(campaign)) {
    return "Done" as const;
  } else if (isPreparing(campaign)) {
    return "Preparing" as const;
  } else {
    return "Active" as const;
  }
};

export type CampaignStatus = ReturnType<typeof getCampaignStatus>;

export const isPreparing = (campaign: CampaignData) =>
  Object.values(campaign.attacks).some(
    (attack: CampaignAttack) => attack.status === "WAITING_FOR_DATA"
  );

export const parseStartDate = ({ start_date }: CampaignData) => {
  if (typeof start_date !== "string") {
    return start_date;
  } else if (start_date.length === "YYYY-MM-DD".length) {
    return new Date(start_date + "T00:00:00.000Z");
  } else {
    return new Date(start_date);
  }
};

export const parseEndDate = (campaign: CampaignData) =>
  addDays(parseStartDate(campaign), campaign.duration_days);

export const withCampaignStatus = <C extends CampaignData>(
  campaign: C
): [C, CampaignStatus] => [campaign, getCampaignStatus(campaign)];

export const didAttacksUpdate = (
  curr: CampaignAttackRecord,
  next: CampaignAttackRecord
) => {
  for (const [email, updated] of Object.entries(next)) {
    const original = curr[email];

    if (!original) {
      return true;
    } else if (original.status !== updated.status) {
      return true;
    } else if (updated.logs?.length !== original.logs?.length) {
      return true;
    }
  }

  return false;
};

export const validateCampaign = (
  campaign: CampaignData,
  delegatedDomains: string[]
): CampaignValidationResult => {
  const targetDomains = new Set(
    campaign.objective.targets
      .map(({ email }) => getEmailDomain(email))
      .filter(Boolean) // Drafts may have empty emails
  );

  const undelegatedDomains = Array.from(targetDomains).filter(
    (domainName) => !delegatedDomains.includes(domainName)
  );

  return { ok: undelegatedDomains.length === 0, undelegatedDomains };
};

export const hasLogOfType = (
  { logs }: CampaignAttack,
  ...logTypes: [string, ...string[]]
) => logs?.some(({ type }) => logTypes.includes(type)) ?? false;
