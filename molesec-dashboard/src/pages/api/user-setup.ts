import { resolveEmailProvider } from "@/api/server/email-provider";
import prisma from "@/api/server/prisma";
import { profileService } from "@/api/server/profileService";
import { cookieValue } from "@/util/next-route-api";
import { Claims, getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { capitalize } from "@mui/material/utils";
import { NextApiRequest, NextApiResponse } from "next";
import * as uuid from "uuid";

/**
 * Redirect the user to this end-point to have it set up
 * their user account with a default team.
 *
 * After the user is set up, they will be redirected to the index page.
 */
export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);

    if (!session?.user.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { user_id: session.user.sub },
      include: { Team: true },
    });

    if (memberships.length) {
      setActiveTeamCookie(res, memberships[0].team_id);

      return res.redirect(302, "/");
    }

    const teamId = uuid.v4();
    const orgId = uuid.v4();
    const orgDomain = orgDomainFromClaims(session.user);
    const orgName = orgNameFromDomain(orgDomain);
    const emailProvider = await resolveEmailProvider(orgDomain);
    const teamName = orgName
      ? orgName + " Red Team"
      : "Team " + session.user.name;

    await prisma.$transaction([
      prisma.team.create({
        data: {
          id: teamId,
          name: teamName,
          org_id: orgId,
          org_name: orgName,
          org_urls: [],
          owner_user_id: session.user.sub,
        },
      }),
      prisma.teamMembership.create({
        data: {
          user_id: session.user.sub,
          team_id: teamId,
          email: session.user.email,
        },
      }),
    ]);

    if (orgName.length > 0 && orgDomain.length > 0) {
      await prisma.domain.create({
        data: {
          team_id: teamId,
          name: orgDomain,
          email_provider: emailProvider,
          is_verified: true,
          is_delegated: false,
        },
      });

      await profileService.updateOrganization({
        id: orgId,
        name: orgName,
        domains: [orgDomain],
      });
    }

    setActiveTeamCookie(res, teamId);

    return res.redirect(302, "/settings/team");
  }
);

const setActiveTeamCookie = (res: NextApiResponse, teamId: string) => {
  res.setHeader("Access-Control-Expose-Headers", "Set-Cookie");
  res.setHeader("Set-Cookie", cookieValue(`activeTeamId=${teamId}`));
};

const isEmailProvider = (email: string) => {
  return /mail.{2,}$/i.test(email);
};

const orgDomainFromClaims = (claims: Claims) => {
  if (typeof claims.email !== "string") return "";
  if (isEmailProvider(claims.email)) return "";

  return claims.email.split("@").at(-1) ?? "";
};

const orgNameFromDomain = (domain: string) => {
  if (!domain) return "";

  const baseName = domain?.split(".")?.at(-2)?.toLowerCase();

  if (baseName) {
    return capitalize(baseName.split(/-|_/).join(" "));
  } else {
    return "";
  }
};
