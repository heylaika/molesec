import { useMonitorCampaign } from "@/hooks/useMonitorCampaign";
import { CampaignData } from "@/util/campaign";
import { SegmentType } from "@/util/funnel";
import { RowData } from "@/util/supabase";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { capitalize } from "@mui/material/utils";
import { useState } from "react";
import AttackList from "./AttackList";
import CampaignSummary from "./CampaignSummary";
import Funnel from "./Funnel";

export type CampaignInfoProps = {
  campaign: RowData<"Campaign"> & CampaignData;
};

export default function CampaignInfo({ campaign }: CampaignInfoProps) {
  const [filter, setFilter] = useState<SegmentType>();

  useMonitorCampaign(campaign);

  const isInitialized = Object.values(campaign.attacks).some(
    (attack) => attack?.status !== "WAITING_FOR_DATA"
  );

  return (
    <Stack width="100%" gap={4} alignItems="stretch">
      <Stack width="100%" direction="row" alignItems="center" gap={2}>
        <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
          {campaign?.name}
        </Typography>
      </Stack>

      <Stack maxWidth={600}>
        <CampaignSummary campaign={campaign} />
      </Stack>

      <Collapse in={isInitialized}>
        <Stack gap={2}>
          <Funnel campaign={campaign} selected={filter} onSelect={setFilter} />

          {filter && (
            <Stack direction="row" gap={2} alignItems="center">
              <Typography
                component="div"
                variant="body2"
                color="text.secondary"
              >
                {`Filtering by "${capitalize(filter)}"`}
              </Typography>
              <Button onClick={() => setFilter(undefined)}>Clear</Button>
            </Stack>
          )}
        </Stack>
      </Collapse>

      <Stack>
        <AttackList campaign={campaign} segment={filter} />
      </Stack>
    </Stack>
  );
}
