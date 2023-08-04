import { AttackStatus } from "@/api/server/attackService";
import {
  CampaignAttackRecord,
  CampaignData,
  CampaignTarget,
} from "@/util/campaign";
import { SegmentType } from "@/util/funnel";
import { Nullish } from "@/util/nullable";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { capitalize } from "@mui/material/utils";
import React from "react";

export type AttackListProps = {
  campaign: CampaignData;
  segment: SegmentType | undefined;
};

export default function AttackList({ campaign, segment }: AttackListProps) {
  const hasStarted = React.useMemo(
    () =>
      Object.values(campaign.attacks).some(
        (attack) => attack.status !== "WAITING_FOR_DATA"
      ),
    [campaign.attacks]
  );

  const getStatusMessage = (target: CampaignTarget) => {
    const { status, logs = [] } = campaign.attacks?.[target.email] ?? {};

    const checkLogs = status === "ONGOING" || status === "SUCCESS";
    const latestLog = logs.at(-1);

    return checkLogs && latestLog
      ? latestLog.payload?.["message"] || humanizeStatus(latestLog.type)
      : statusText(status);
  };

  const getMessageExcerpt = (target: CampaignTarget) => {
    const { status, logs = [] } = campaign.attacks?.[target.email] ?? {};

    if (!status || status === "WAITING_FOR_DATA") return "";

    return (
      logs.find((log) => log.type === "EMAIL_SENT")?.payload?.artifact
        ?.excerpt ?? ""
    );
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Target</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status</TableCell>
            {hasStarted && <TableCell>Message</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {campaign.objective.targets
            .filter(filterBySegment(segment, campaign.attacks))
            .map((target) => (
              <TableRow key={target.email}>
                <TableCell>{target.called_name}</TableCell>
                <TableCell>{target.email}</TableCell>
                <TableCell>
                  <Chip variant="outlined" label={getStatusMessage(target)} />
                </TableCell>
                {hasStarted && (
                  <TableCell>{getMessageExcerpt(target) || "—"}</TableCell>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const requiredLogType: Record<SegmentType, string[]> = {
  breached: ["LINK_CLICKED"],
  opened: ["LINK_CLICKED", "EMAIL_OPENED"],
  sent: ["LINK_CLICKED", "EMAIL_OPENED", "EMAIL_SENT"],
  ready: [],
  total: [],
};

const filterBySegment = (
  segment: SegmentType | undefined,
  attacks: CampaignAttackRecord
) => {
  if (!segment || segment === "total") return () => true;

  const requires = requiredLogType[segment];

  return (target: CampaignTarget) => {
    const attack = attacks[target.email];

    if (!attack) {
      return false;
    } else if (segment === "ready") {
      return attack.status !== "WAITING_FOR_DATA";
    } else if (!attack.logs) {
      return false;
    } else {
      return attack.logs.some(({ type }) => requires.includes(type));
    }
  };
};

const statusText = (status: Nullish<AttackStatus>) => {
  switch (status) {
    case "WAITING_FOR_DATA":
      return "Collecting data";
    case "FAILED":
      // TODO: improve copy.
      return "Did not respond to the attack";
    case undefined:
    case null:
      return "Unknown";
    default:
      return humanizeStatus(status);
  }
};

const humanizeStatus = (status: string) =>
  capitalize(status.split("_").join(" ").toLowerCase());
