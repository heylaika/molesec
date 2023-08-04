import { useQueryState } from "@/stores/useQueryState";
import { useTeamInviteRecord } from "@/stores/useTeamInviteRecord";
import { useTeamMembershipRecord } from "@/stores/useTeamMembershipRecord";
import React from "react";

/** Return a function that cleans up all the data of the current team. */
export const useCleanTeam = () => {
  const cleanTeam = React.useCallback((returnUrl?: string) => {
    window.localStorage.clear();
    useQueryState.setState({ query: "", activeDataSourceId: null }, true);
    useTeamInviteRecord.setState({}, true);
    useTeamMembershipRecord.setState({}, true);

    if (returnUrl) window.location.href = returnUrl;
  }, []);

  return cleanTeam;
};
