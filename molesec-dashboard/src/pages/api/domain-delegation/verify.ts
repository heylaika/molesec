import { attackService } from "@/api/server/attackService";
import { otherTeamHasDomainDelegation } from "@/api/server/domain-security";
import prisma from "@/api/server/prisma";
import { reserialize } from "@/util/json";
import { firstQueryValue } from "@/util/querystring";
import { isRecord } from "@/util/record";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
      const session = await getSession(req, res);
      const { email } = session?.user ?? {};

      if (typeof email !== "string") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const activeTeamId = req.cookies["activeTeamId"];

      if (!activeTeamId) {
        return res.status(400).json({ message: "No active team" });
      }

      const domainId = firstQueryValue(req.query, "domain_id");
      const domain = await prisma.domain.findFirst({
        where: { id: domainId, team_id: activeTeamId },
      });

      if (!domain) {
        return res
          .status(403)
          .json({ message: "The domain was not found for the active team" });
      } else if (!email.endsWith(domain.name)) {
        return res
          .status(400)
          .json({ message: "You can only verify your own email domain" });
      } else if (await otherTeamHasDomainDelegation(domain)) {
        return res
          .status(403)
          .json({ message: "Domain is administrated by a different team" });
      }

      try {
        const isDelegated = await attackService.checkDomainDelegation(email);
        const result = await prisma.domain.update({
          where: { id: domainId },
          data: { is_delegated: isDelegated },
        });

        return res.status(200).json(reserialize(result));
      } catch (error) {
        if (!isRecord(error)) return res.status(500);
        else return res.status(500).json(reserialize(error));
      }
    } else {
      return res.status(405).end();
    }
  }
);
