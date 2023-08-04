import { CampaignAttack, CampaignData, hasLogOfType } from "@/util/campaign";
import { SegmentStats, SegmentType } from "@/util/funnel";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import RemoveRedEyeOutlined from "@mui/icons-material/RemoveRedEyeOutlined";
import { amber, blue, green, red } from "@mui/material/colors";
import Stack from "@mui/material/Stack";
import React from "react";
import FunnelSegment from "./FunnelSegment";

export type FunnelProps = {
  campaign: CampaignData;
  selected?: SegmentType;
  onSelect?: (segment: SegmentType) => void;
};

export default function Funnel({ campaign, selected, onSelect }: FunnelProps) {
  const segments = React.useMemo(
    () => calculateSegments(Object.values(campaign.attacks)),
    [campaign.attacks]
  );

  return (
    <Stack
      direction="row"
      spacing={1}
      height={292}
      alignItems="stretch"
      justifyContent="stretch"
    >
      <FunnelSegment
        label="Ready"
        icon={<PersonOutlineOutlined />}
        max={segments.total}
        start={segments.total}
        end={segments.ready}
        palette={blue}
        selected={selected === "ready"}
        onClick={() => onSelect?.("ready")}
      />
      <FunnelSegment
        label="Sent"
        icon={<EmailOutlined />}
        max={segments.total}
        start={segments.ready}
        end={segments.sent}
        palette={green}
        selected={selected === "sent"}
        onClick={() => onSelect?.("sent")}
      />
      <FunnelSegment
        label="Opened"
        icon={<RemoveRedEyeOutlined />}
        max={segments.total}
        start={segments.sent}
        end={segments.opened}
        palette={amber}
        selected={selected === "opened"}
        onClick={() => onSelect?.("opened")}
      />
      <FunnelSegment
        label="Breached"
        icon={<ErrorOutlineOutlined />}
        max={segments.total}
        start={segments.opened}
        end={segments.breached}
        palette={red}
        selected={selected === "breached"}
        onClick={() => onSelect?.("breached")}
      />
    </Stack>
  );
}

const calculateSegments = (attacks: CampaignAttack[]): SegmentStats => {
  const stats: SegmentStats = {
    total: attacks.length,
    ready: 0,
    sent: 0,
    opened: 0,
    breached: 0,
  };

  // We need to make sure that we add to "prior events".
  // Since "EMAIL_OPENED" doesn't register if you have
  // an ad-blocker active (for instance), but we can
  // assume that the target opened the email if they
  // clicked the link.

  for (const attack of attacks) {
    if (hasLogOfType(attack, "LINK_CLICKED")) {
      stats.ready++;
      stats.sent++;
      stats.opened++;
      stats.breached++;
    } else if (hasLogOfType(attack, "EMAIL_OPENED")) {
      stats.ready++;
      stats.sent++;
      stats.opened++;
    } else if (hasLogOfType(attack, "EMAIL_SENT")) {
      stats.ready++;
      stats.sent++;
    } else if (attack.status !== "WAITING_FOR_DATA") {
      stats.ready++;
    }
  }

  return stats;
};
