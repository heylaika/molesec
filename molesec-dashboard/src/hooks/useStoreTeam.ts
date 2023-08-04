import { useActiveTeam } from "@/stores/useActiveTeam";
import { Team } from "@prisma/client";
import React from "react";

/**
 * Store the given team as the active team.
 */
export const useStoreTeam = (team: Team) => {
  React.useEffect(() => {
    useActiveTeam.setState(team, true);
  }, [team]);
};
