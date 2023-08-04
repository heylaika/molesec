import { otherTeamHasDomainDelegation } from "@/api/server/domain-security";
import prisma from "@/api/server/prisma";
import { firstQueryValue } from "@/util/querystring";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const domainId = firstQueryValue(req.query, "domain_id");
      const domain = await prisma.domain.findFirst({ where: { id: domainId } });

      if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
      } else if (domain.is_delegated) {
        return res.status(200).json({ status: "DELEGATED" });
      } else if (await otherTeamHasDomainDelegation(domain)) {
        return res.status(200).json({ status: "DELEGATED_BY_OTHER" });
      } else {
        return res.status(200).json({ status: "NOT_DELEGATED" });
      }
    }
  }
);
