import { fetcher } from "@/util/fetcher";
import { RowData } from "@/util/supabase";

const API_URL = "/api/domain-delegation";

export type DomainDelegationStatus =
  | "NOT_DELEGATED"
  | "DELEGATED"
  | "DELEGATED_BY_OTHER";

/** Verifies that the domain delegation is correctly set up. */
const verify = (domainId: string) =>
  fetcher<RowData<"Domain">>(API_URL + "/verify?domain_id=" + domainId, {
    method: "POST",
    credentials: "include",
  });

/** Gets the domain delegation status of the users' current email domain. */
const getStatus = (domainId: string) =>
  fetcher<{ status: DomainDelegationStatus }>(
    API_URL + "/status?domain_id=" + domainId,
    {
      method: "GET",
      credentials: "include",
    }
  );

export const domainDelegationApi = { verify, getStatus };
