import prisma from "@/api/server/prisma";
import { profileService } from "@/api/server/profileService";
import { reserialize } from "@/util/json";
import { isRecord } from "@/util/record";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
      const session = await getSession(req, res);

      if (!session?.user.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const activeTeamId = req.cookies["activeTeamId"];

      if (!activeTeamId) {
        return res.status(400).json({ message: "No active team" });
      }

      const membership = await prisma.teamMembership.findFirst({
        where: { user_id: session.user.sub, team_id: activeTeamId },
        include: { Team: true },
      });

      if (!membership) {
        return res.status(403).json({ message: "Not a member of active team" });
      }

      const { org_id, org_name } = membership.Team;

      try {
        await profileService.updateOrganization({
          id: org_id,
          name: org_name,
        });

        return res.status(200).end();
      } catch (error) {
        if (!isRecord(error)) return res.status(500);
        else return res.status(500).json(reserialize(error));
      }
    } else {
      return res.status(405).end();
    }
  }
);
