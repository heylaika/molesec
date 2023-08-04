import { fetchSupabaseToken } from "@/api/client/supabase-auth";
import { useSupabaseTokenStore } from "@/stores/useSupabaseTokenStore";
import React from "react";
import { useCleanTeam } from "./useCleanTeam";
import { useLogger } from "./useLogger";

export const useSwitchTeam = () => {
  const setToken = useSupabaseTokenStore((state) => state.setToken);
  const { logAsync } = useLogger();

  const cleanTeam = useCleanTeam();

  return React.useCallback(
    async (teamId: string, returnUrl?: string) => {
      returnUrl = returnUrl ?? getReturnUrl();

      cleanTeam();

      await logAsync(
        fetchSupabaseToken(teamId).then((info) => setToken(info)),
        { type: "TEAM_SELECT", payload: { team_id: teamId } }
      );

      window.location.href = returnUrl;
    },
    [setToken, logAsync, cleanTeam]
  );
};

const getReturnUrl = () => {
  if (window.location.pathname.startsWith("/settings")) {
    return "/settings/team";
  } else {
    return "/";
  }
};
