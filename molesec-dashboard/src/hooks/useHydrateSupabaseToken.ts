import { fetchSupabaseToken } from "@/api/client/supabase-auth";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useSupabaseTokenStore } from "@/stores/useSupabaseTokenStore";
import React from "react";
import { useAsyncFn } from "react-use";

export const useHydrateSupabaseToken = () => {
  const setRefreshing = useSupabaseTokenStore((state) => state.setRefreshing);
  const teamId = useActiveTeam((team) => team?.id);

  const [state, fetchTokenForTeam] = useAsyncFn(
    () => fetchSupabaseToken(teamId),
    [teamId]
  );

  React.useEffect(() => {
    if (state.loading) setRefreshing(state.loading);
  }, [state.loading, setRefreshing]);

  return React.useCallback(() => {
    if (state.loading) return;

    return async () => {
      const token = await fetchTokenForTeam();

      useSupabaseTokenStore.setState({ token });
    };
  }, [state.loading, fetchTokenForTeam]);
};
