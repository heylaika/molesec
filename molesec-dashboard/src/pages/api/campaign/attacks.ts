import { attackService } from "@/api/server/attackService";
import prisma from "@/api/server/prisma";
import {
  CampaignAttackRecord,
  didAttacksUpdate,
  hasValidCampaignData,
} from "@/util/campaign";
import { reserialize } from "@/util/json";
import { firstQueryValue } from "@/util/querystring";
import { isRecord } from "@/util/record";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const teamId = req.cookies["activeTeamId"];

      if (!teamId) {
        throw new Error("The activeTeamId cookie is not set.");
      }

      const campaignId = firstQueryValue(req.query, "campaign_id");
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId },
        include: { Team: true },
      });

      if (!campaign) {
        throw new Error(`Campaign '${campaignId}' not found.`);
      } else if (campaign.team_id !== teamId) {
        throw new Error("The campaign does not belong to the active team.");
      } else if (!hasValidCampaignData(campaign)) {
        throw new Error("The campaign is not valid.");
      }

      const objectiveId = campaign.objective.id;

      try {
        const attackList = await attackService.fetchAttacks(objectiveId);
        const attacks: CampaignAttackRecord = Object.fromEntries(
          attackList.map(({ target, id, status, logs }) => [
            target.email,
            { id, status, logs },
          ])
        );

        if (didAttacksUpdate(campaign.attacks, attacks)) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { attacks },
          });

          return res.status(200).json(reserialize(attacks));
        } else {
          return res.status(304).end();
        }
      } catch (error) {
        console.error(error);

        if (!isRecord(error)) return res.status(500);
        else return res.status(500).json(reserialize(error));
      }
    }

    return res.status(405).end();
  }
);
