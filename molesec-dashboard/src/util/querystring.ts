import { ParsedUrlQuery } from "querystring";

export const firstQueryValue = (
  query: ParsedUrlQuery,
  name: string
): string | undefined => {
  const values = query[name];

  return values ? (Array.isArray(values) ? values[0] : values) : undefined;
};
