import { useActiveTeam } from "@/stores/useActiveTeam";
import { getTokenLife, SupabaseToken } from "@/util/auth";
import React from "react";
import { useSupabaseTokenStore } from "../stores/useSupabaseTokenStore";
import { useHasChanged } from "./useHasChanged";
import { useHydrateSupabaseToken } from "./useHydrateSupabaseToken";

const MIN_LIFE = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL = 30 * 1000; // Check token validity this often

/**
 * Keep the Supabase token alive by periodically checking if the token is expired
 * and refreshing it if necessary.
 */
export const useKeepAliveSupabaseToken = () => {
  const token = useSupabaseTokenStore((state) => state.token);
  const teamId = useActiveTeam((state) => state?.id);
  const hydrate = useHydrateSupabaseToken();

  const shouldReload = useHasChanged(token, (prev, curr) => {
    // Reload is only needed for authenticated users.
    if (!prev || !curr) return false;

    const prevLife = getTokenLife(prev.claims);
    const currLife = getTokenLife(curr.claims);
    const didRefresh = prevLife < currLife;
    const reloadRequired = prevLife <= 0 || curr.claims.team_id !== teamId;

    return didRefresh && reloadRequired;
  });

  React.useEffect(() => {
    if (shouldReload) {
      console.info("Reload required: Token expired or team changed.");
      window.location.reload();
    }
  }, [shouldReload]);

  const checkTokenLife = React.useCallback(() => {
    const token = useSupabaseTokenStore.getState().token;
    if (expiresSoon(token)) hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    checkTokenLife();

    const handle = window.setInterval(checkTokenLife, CHECK_INTERVAL);

    return () => window.clearInterval(handle);
  }, [checkTokenLife]);
};

const expiresSoon = (token: SupabaseToken | undefined) => {
  if (!token) return false;

  const life = getTokenLife(token.claims);
  const refreshRequired = life < MIN_LIFE;

  if (refreshRequired) {
    console.info(`Refreshing Token: Token expires in ${life / 1000} seconds.`);
  }

  return refreshRequired;
};
