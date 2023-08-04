import env from "@/util/env";
import { fetcher } from "@/util/fetcher";
import { prune, SomeRecord } from "@/util/record";

export type ObjectiveGoal = "CLICK_PHISHING_LINK";

export type AttackStatus =
  | "WAITING_FOR_DATA"
  | "ONGOING"
  | "FAILED"
  | "SUCCESS";

export type Attack = {
  id: string;
  created_at: string;
  target: AttackTarget;
  logs?: AttackLog[];
  status: AttackStatus;
  objective: string;
};

export type AttackTarget = {
  email: string;
  called_name?: string;
  social_links?: string[];
};

export type Objective = {
  id: string;
  begins_at: string;
  expires_at?: string;
  org_id: string;
  goal: string;
  targets: AttackTarget[];
};

export type AttackLog = {
  id: string;
  created_at: string;
  type: string;
  payload: SomeRecord;
};

export type DomainDelegationResult = {
  enabled: boolean;
};

export type ObjectiveResult = {
  attacks: Attack[];
};

const API_URL = env.demand("ATTACK_SERVICE_API_URL");
const API_KEY = env.demand("ATTACK_SERVICE_API_KEY");

const createObjective = async (objective: Objective) => {
  const url = API_URL + "/api/v1/objectives";

  return await fetcher<ObjectiveResult>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Api-Key ${API_KEY}`,
    },
    body: JSON.stringify(prune(objective)),
  });
};

const fetchAttacks = async (objectiveId: string) => {
  const url = API_URL + `/api/v1/objectives/${objectiveId}/attacks`;

  return await fetcher<Attack[]>(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Api-Key ${API_KEY}`,
    },
  });
};

const checkDomainDelegation = async (email: string) => {
  const url = API_URL + "/api/v1/checks/domain-delegation-enabled";

  return await fetcher<DomainDelegationResult>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Api-Key ${API_KEY}`,
    },
    body: JSON.stringify({ email }),
  }).then((result) => result.enabled);
};

export const attackService = {
  createObjective,
  fetchAttacks,
  checkDomainDelegation,
};
