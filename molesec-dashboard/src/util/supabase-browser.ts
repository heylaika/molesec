import { Database } from "@/generated-types/supabase.types";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

export default function createBrowserClient(accessToken: string | undefined) {
  return createBrowserSupabaseClient<Database>({
    options: {
      global: {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      },
    },
  });
}
