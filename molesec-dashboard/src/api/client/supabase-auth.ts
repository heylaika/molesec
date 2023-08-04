import { SupabaseClaims, TokenInfo } from "@/util/auth";
import { fetcher } from "@/util/fetcher";
import { Nullish } from "@/util/nullable";

const API_URL = "/api/supabase-auth";

export const fetchSupabaseToken = async (teamId: Nullish<string>) => {
  const info = await fetcher<TokenInfo<SupabaseClaims>>(
    API_URL + `?team_id=${teamId}`,
    { credentials: "include" }
  );

  return info;
};
