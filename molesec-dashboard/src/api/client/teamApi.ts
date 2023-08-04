import { fetcher } from "@/util/fetcher";

const API_URL = "/api/team-sync";

export const syncOrganization = async () => {
  await fetcher(API_URL, { method: "PUT", credentials: "include" });
};

export const teamApi = { syncOrganization };
