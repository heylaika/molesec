import { isValidSupabaseClaims } from "@/util/auth";
import createBrowserClient from "@/util/supabase-browser";
import React from "react";
import { useSupabaseTokenStore } from "../stores/useSupabaseTokenStore";

export const useDatabase = () => {
  const token = useSupabaseTokenStore((state) =>
    isValidSupabaseClaims(state.token?.claims)
      ? state.token?.value ?? state.fallback
      : state.fallback
  );

  return React.useMemo(() => createBrowserClient(token), [token]);
};
