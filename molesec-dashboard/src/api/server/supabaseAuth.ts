import {
  assertHasRequiredClaims,
  getTokenExpirationTime,
  SupabaseClaims,
  TokenClaims,
  UserClaims,
} from "@/util/auth";
import env from "@/util/env";
import { Nullish } from "@/util/nullable";
import { prune } from "@/util/record";
import { Claims } from "@auth0/nextjs-auth0";
import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = env.demand("SUPABASE_JWT_SECRET");

/**
 * Creates new supabase claims from existing claims.
 * If the source claims do not contain all the required claims, an error will be thrown.
 * @param sourceClaims The claims to use to base the supabase claims upon.
 * @param teamId The ID of the team that the user wants to access.
 */
const createClaims = (
  sourceClaims: Claims,
  teamId?: Nullish<string>
): SupabaseClaims => {
  assertHasRequiredClaims(sourceClaims);

  return prune({
    sub: sourceClaims.sub,
    team_id: teamId,
    email: sourceClaims.email,
    exp: getTokenExpirationTime(),
  });
};

/** Signs a token with the provided SUPABASE_JWT_SECRET.  */
const signToken = <T extends UserClaims & TokenClaims>(claims: T) =>
  jwt.sign(claims, SUPABASE_JWT_SECRET);

/**
 * Creates a new token with the provided claims and team ID.
 * If the source claims do not contain all the required claims, an error will be thrown.
 * @param sourceClaims The claims to use to base the supabase claims upon.
 * @param teamId The ID of the team that the user wants to access.
 */
const createToken = (sourceClaims: Claims, teamId?: Nullish<string>) =>
  signToken(createClaims(sourceClaims, teamId));

export const supabaseAuth = { createClaims, signToken, createToken };
