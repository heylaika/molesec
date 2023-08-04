import { SupabaseToken } from "@/util/auth";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SupabaseTokenStore = {
  /** Whether the current token is being replaced with a new one. */
  refreshing: boolean;
  /** The currently active token (unless expired) */
  token?: SupabaseToken;
  /**
   * A token that the client may fallback on
   * if the `token` is not available or has expired.
   */
  fallback?: string;
  setToken: (token: SupabaseToken | undefined) => void;
  setRefreshing: (state: boolean) => void;
  setFallback: (fallback: string) => void;
};

/** Contains the current supabase token and metadata about it. */
export const useSupabaseTokenStore = create(
  persist<SupabaseTokenStore>(
    (set) => ({
      refreshing: false,
      setToken: (token) => set({ token }),
      setFallback: (fallback) => set({ fallback }),
      setRefreshing: (state) => set({ refreshing: state }),
    }),
    {
      name: "supabase-token",
      partialize: (state) => ({ ...state, refreshing: false }),
    }
  )
);
