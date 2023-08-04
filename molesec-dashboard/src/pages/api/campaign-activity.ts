import prisma from "@/api/server/prisma";
import { hasValidCampaignData } from "@/util/campaign";
import { firstQueryValue } from "@/util/querystring";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const teamId = req.cookies["activeTeamId"];

    if (req.method === "POST") {
      return res.status(200).end();
    } else if (req.method === "GET") {
      const campaignId = firstQueryValue(req.query, "id");

      if (!campaignId) {
        throw new Error("The objective_id query parameter is required.");
      }

      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error(`Campaign '${campaignId}' not found.`);
      } else if (campaign.team_id !== teamId) {
        throw new Error("The campaign does not belong to the active team.");
      } else if (!hasValidCampaignData(campaign)) {
        throw new Error("The campaign is not valid.");
      } else if (!campaign.objective.id) {
        throw new Error("The campaign has not been launched.");
      }

      return;
    } else {
      return res.status(405).end();
    }
  }
);
