import { firstQueryValue } from "@/util/querystring";
import { useRouter } from "next/router";

/** Returns the first route param value matching the name, or `undefined` if it doesn't exist. */
export const useFirstQueryValue = (name: string): string | undefined => {
  const router = useRouter();

  return firstQueryValue(router.query, name);
};
