import env from "@/util/env";
import { fetcher } from "@/util/fetcher";
import { prune } from "@/util/record";

export type OrganizationProfile = {
  id: string;
  name?: string;
  domains?: string[];
  languages?: string[];
};

const API_URL = env.demand("PROFILE_SERVICE_API_URL");
const API_KEY = env.demand("PROFILE_SERVICE_API_KEY");

const updateOrganization = async (update: OrganizationProfile) => {
  const url = API_URL + "/api/v1/organizations";

  await fetcher(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Api-Key ${API_KEY}`,
    },
    body: JSON.stringify(prune(update)),
  });
};

export const profileService = { updateOrganization };
