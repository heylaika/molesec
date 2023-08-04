import { attackService } from "@/api/server/attackService";
import prisma from "@/api/server/prisma";
import {
  asAttackTarget,
  createAttackRecord,
  createCampaignActivity,
  hasValidCampaignData,
  isDraft,
  isValidCampaignTarget,
  parseStartDate,
  validateCampaign,
} from "@/util/campaign";
import { reserialize } from "@/util/json";
import { firstQueryValue } from "@/util/querystring";
import { isRecord, SomeRecord } from "@/util/record";
import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import addDays from "date-fns/addDays";
import formatISO from "date-fns/formatISO";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {
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
      } else if (!isDraft(campaign)) {
        throw new Error("The campaign has already been launched.");
      }

      const begins = parseStartDate(campaign);
      const expires = addDays(begins, campaign.duration_days);
      const validTargets = campaign.objective.targets
        .filter(isValidCampaignTarget)
        .map(asAttackTarget);

      const delegatedDomains = await prisma.domain
        .findMany({
          where: { team_id: teamId, is_delegated: true },
          select: { name: true },
        })
        .then((domain) => domain.map((domain) => domain.name));

      const { undelegatedDomains } = validateCampaign(
        campaign,
        delegatedDomains
      );

      if (undelegatedDomains.length > 0) {
        return res.status(400).json({
          message:
            "The domain(s) '" +
            undelegatedDomains.join(", ") +
            "' have not been delegated.",
        });
      }

      try {
        const { attacks } = await attackService.createObjective({
          id: campaign.objective.id,
          goal: campaign.objective.goal,
          targets: validTargets,
          org_id: campaign.Team.org_id,
          begins_at: formatISO(begins),
          expires_at: formatISO(expires),
        });

        const updatedCampaign = await prisma.campaign.update({
          data: {
            attacks: createAttackRecord(attacks),
            objective: {
              ...(campaign.objective as any),
              targets: validTargets,
            },
          },
          where: { id: campaignId },
        });

        await prisma.campaignActivity.createMany({
          data: createCampaignActivity(campaign, attacks),
        });

        return res.json(reserialize(updatedCampaign));
      } catch (error) {
        console.error(error);

        if (!isRecord(error)) return res.status(500);
        else return res.status(500).json(reserialize(errorBody(error)));
      }
    } else {
      return res.status(405).end();
    }
  }
);

const errorBody = (errorData: SomeRecord) => {
  if (errorData.body) return errorData.body;
  else return errorData;
};
