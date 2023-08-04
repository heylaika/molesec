import prisma from "@/api/server/prisma";
import { supabaseAuth } from "@/api/server/supabaseAuth";
import { SupabaseClaims, TokenInfo } from "@/util/auth";
import { cookieValue } from "@/util/next-route-api";
import { hasValue } from "@/util/nullable";
import { firstQueryValue } from "@/util/querystring";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const session = await getSession(req, res);

      if (!session?.user.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const teamId = firstQueryValue(req.query, "team_id");

      if (hasValue(teamId)) {
        const membership = prisma.teamMembership.findFirst({
          where: { user_id: session.user.sub, team_id: teamId },
        });

        if (!membership) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const claims = supabaseAuth.createClaims(session.user, teamId);
      const value = supabaseAuth.signToken(claims);

      session.user.supabaseToken = value;

      return res
        .status(200)
        .setHeader("Access-Control-Expose-Headers", "Set-Cookie")
        .setHeader("Set-Cookie", cookieValue(`activeTeamId=${teamId}`))
        .json({ value, claims } as TokenInfo<SupabaseClaims>);
    }

    return res.status(405).json({ message: "method not allowed" });
  }
);
