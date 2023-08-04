import prisma from "@/api/server/prisma";
import { UserMembershipRecord } from "@/stores/useUserMembershipRecord";
import { forbidden, hasUserClaims, toSetup, UserClaims } from "@/util/auth";
import { reserialize } from "@/util/json";
import { mapRecord, SomeRecord } from "@/util/record";
import { getServerTransaction } from "@/util/sentry";
import { RowData } from "@/util/supabase";
import {
  Claims,
  getSession,
  PageRoute,
  withPageAuthRequired,
} from "@auth0/nextjs-auth0";
import { GetServerSideProps } from "next";
import { ParsedUrlQuery } from "querystring";
import { supabaseAuth } from "./supabaseAuth";

export type PropsWithUserSession<T = {}> = T & {
  activeTeamId: string | null;
  user: Claims & UserClaims;
  memberships: UserMembershipRecord;
  productInvite: RowData<"ProductInvite"> | null;
};

type PropExtender<P extends SomeRecord, E extends SomeRecord> = (
  current: P
) => Promise<E>;

export type UserRequirementsOptions<
  P extends SomeRecord,
  Q extends ParsedUrlQuery = ParsedUrlQuery,
  E extends SomeRecord = {}
> = {
  getServerSideProps?: GetServerSideProps<E, Q>;
  returnTo?: string;
  requireProductInvite?: boolean;
  requireTeamMembership?: boolean;
  extendProps?: PropExtender<PropsWithUserSession<P>, E>;
};

/**
 * Provides the users team memberships and product invites
 * and; unless reconfigured, asserts that:
 *
 * - The user is logged in.
 * - The user has an email address that matches a product invite.
 * - The user has a membership with the active team.
 *
 * If the user is not logged in, they will be redirected to the login page.
 * If the user does not have an email address that matches a product invite,
 * or if they are not a member of the active team they will be redirected to the index page.
 *
 * An error is thrown in either scenario to prevent the page from being rendered.
 * But the user should never see the error since they have been redirected.
 */
export const withUserRequirements = <
  P extends SomeRecord,
  Q extends ParsedUrlQuery = ParsedUrlQuery
>({
  returnTo,
  requireTeamMembership: requireTeamMembership = true,
  requireProductInvite = true,
  getServerSideProps = () => Promise.resolve({ props: {} as P }),
  extendProps = () => Promise.resolve({}),
}: UserRequirementsOptions<P, Q> = {}): PageRoute<P, Q> => {
  const afterAuth: GetServerSideProps<P, Q> = async (ctx) => {
    const transaction = getServerTransaction(ctx.req);

    const user = (await getSession(ctx.req, ctx.res))?.user ?? {};
    const activeTeamId = ctx.req.cookies["activeTeamId"] || null;

    if (!hasUserClaims(user)) {
      throw new Error("Failed to get user identifiers from session.");
    }

    if (user.email_verified !== true) {
      return {
        redirect: { destination: "/verify-email", permanent: false },
      };
    }

    const productInvite = await prisma.productInvite.findFirst({
      where: { email: user.email },
    });

    if (requireProductInvite && !productInvite) {
      return forbidden(ctx, `${user.email} does not have a ProductInvite.`);
    }

    const userMemberships = await prisma.teamMembership.findMany({
      where: { user_id: user.sub },
      include: { Team: true },
    });

    const memberships: UserMembershipRecord = reserialize(
      mapRecord(userMemberships, "team_id")
    );

    if (requireTeamMembership && !activeTeamId) {
      return toSetup(ctx, "No active team selected.");
    }

    const hasMembership = activeTeamId && activeTeamId in memberships;

    if (requireTeamMembership && !hasMembership) {
      return toSetup(
        ctx,
        `${user.email} is not a member of "${activeTeamId}".`
      );
    }

    const ssp = await getServerSideProps(ctx);
    const props: PropsWithUserSession<P> = {
      ...("props" in ssp ? await ssp.props : {}),
      user,
      memberships,
      activeTeamId: activeTeamId,
      productInvite: productInvite ? reserialize(productInvite) : productInvite,
    } as PropsWithUserSession<P>;

    const extendSpan = transaction?.startChild({
      op: "http.server",
      description: `extendProps (${ctx.resolvedUrl})`,
    });

    const result = {
      ...ssp,
      props: {
        ...props,
        ...(await extendProps(props)),
        _sentryTraceData: props.sentryTraceData ?? transaction.toTraceparent(),
      },
    };

    extendSpan.finish();

    user.supabaseToken = supabaseAuth.createToken(user, activeTeamId);

    return result;
  };

  const handleAuth = withPageAuthRequired<P, Q>({
    returnTo,
    getServerSideProps: afterAuth,
  });

  return (ctx) => {
    const transaction = getServerTransaction(ctx.req);
    const authSpan = transaction.startChild({
      op: "http.server",
      description: `handleAuth (${ctx.req.url})`,
    });

    try {
      return handleAuth(ctx);
    } finally {
      authSpan.finish();
    }
  };
};
