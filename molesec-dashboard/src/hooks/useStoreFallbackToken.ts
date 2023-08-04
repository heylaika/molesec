import { useSupabaseTokenStore } from "@/stores/useSupabaseTokenStore";
import React from "react";

export const useStoreFallbackToken = (fallbackToken: string | undefined) => {
  const setFallback = useSupabaseTokenStore((state) => state.setFallback);

  React.useEffect(() => {
    if (fallbackToken) setFallback(fallbackToken);
  }, [fallbackToken, setFallback]);
};
