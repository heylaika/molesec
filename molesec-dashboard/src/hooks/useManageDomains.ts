import { domainDelegationApi } from "@/api/client/domainDelegationApi";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useDomainRecord } from "@/stores/useDomainRecord";
import { mapRecord } from "@/util/record";
import React from "react";
import { useDatabase } from "./useDatabase";

export const useManageDomains = () => {
  const team = useActiveTeam();
  const db = useDatabase();

  const fetchTeamDomains = React.useCallback(async () => {
    if (!team) return;

    const domains = await db
      .from("Domain")
      .select("*")
      .eq("team_id", team.id)
      .then((result) => result.data);

    useDomainRecord.setState(mapRecord(domains ?? [], "id"), true);

    return domains;
  }, [db, team]);

  const validateDelegation = React.useCallback(async (domainId: string) => {
    const result = await domainDelegationApi.verify(domainId);

    useDomainRecord.set(result.id, result);

    return result;
  }, []);

  const getDelegationStatus = React.useCallback(async (domainId: string) => {
    const { status } = await domainDelegationApi.getStatus(domainId);
    return status;
  }, []);

  return { fetchTeamDomains, validateDelegation, getDelegationStatus };
};
