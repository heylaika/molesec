import { Claims } from "@auth0/nextjs-auth0";
import { GetServerSidePropsContext } from "next";
import { hasValue, Nullish } from "./nullable";

export const REQUIRED_CLAIMS_FIELDS = ["sub", "email"] as const;

/** Claims about the user. */
export type UserClaims = {
  /**
   * A unique identifier for this user.
   * This is provided by Auth0, so we do not have it on record.
   */
  sub: string;
  /**
   * The email address of the user.
   * In most cases, the `sub` field will be used to uniquely identify the user.
   * However, in some cases (such as for invites) the user's `sub` is not yet known,
   * so the email address is used instead for identification.
   */
  email: string;
};

/** Claims about the team the user represents. */
export type TeamClaims = {
  /**
   * Specifies which team's data can be accessed.
   * If not specified, team data cannot be accessed at all.
   */
  team_id?: string;
};

/** Claims about the token itself. */
export type TokenClaims = {
  /**
   * A unix timestamp (in seconds) for when the token expires.
   */
  exp: number;
};

export type SupabaseClaims = UserClaims & TeamClaims & TokenClaims;

export type TokenInfo<T extends Claims> = {
  /** A string representation of the signed token. */
  value: string;
  /** The claims that were used to generate the token. */
  claims: T;
};

export type SupabaseToken = TokenInfo<SupabaseClaims>;

/** Expiration time in seconds. */
export const EXPIRATION_TIME = 360 * 60;

export const getMissingClaims = (claims: Claims) =>
  REQUIRED_CLAIMS_FIELDS.filter((field) => !Boolean(claims[field]));

export const hasUserClaims = <T extends Claims>(
  claims: Nullish<T>
): claims is UserClaims & T =>
  hasValue(claims) && getMissingClaims(claims).length === 0;

export function assertHasRequiredClaims<T extends Claims>(
  claims: Nullish<T>
): asserts claims is UserClaims & T {
  if (!claims) throw new Error("No claims provided.");

  const missing = getMissingClaims(claims);

  if (missing.length > 0) {
    throw new Error(
      `The user is missing the following claims: ${missing.join(", ")}`
    );
  }
}

export const getTokenExpirationTime = () =>
  Math.floor(Date.now() / 1000) + EXPIRATION_TIME;

/** The number of milliseconds the token has left until expiring. */
export const getTokenLife = (claims: TokenClaims) =>
  claims.exp * 1000 - Date.now();

export const hasTokenExpired = <T>(
  claims: Partial<TokenClaims>
): claims is TokenClaims & T =>
  Boolean(claims?.exp && Date.now() > claims.exp * 1000);

/** Returns true if the token contains all the required claims and has not yet expired. */
export const isValidSupabaseClaims = (
  claims: Nullish<Partial<SupabaseClaims>>
): claims is SupabaseClaims =>
  hasUserClaims(claims) && !hasTokenExpired(claims);

export const clearActiveTeamCookie = (
  res: GetServerSidePropsContext["res"]
) => {
  res.setHeader("Access-Control-Expose-Headers", "Set-Cookie");
  res.setHeader(
    "Set-Cookie",
    "activeTeamId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
};

export const forbidden = (ctx: GetServerSidePropsContext, message: string) => {
  console.error("Forbidden: " + message);

  clearActiveTeamCookie(ctx.res);

  return { redirect: { destination: "/splash", permanent: false }, props: {} };
};

export const toSetup = (ctx: GetServerSidePropsContext, message: string) => {
  console.error("User needs setup: " + message);

  clearActiveTeamCookie(ctx.res);

  return { redirect: { destination: "/setup", permanent: false }, props: {} };
};
