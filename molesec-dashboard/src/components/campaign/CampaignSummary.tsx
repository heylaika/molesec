import { CampaignData, parseEndDate, parseStartDate } from "@/util/campaign";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import format from "date-fns/format";

export type CampaignSummaryProps = {
  campaign: CampaignData;
};

export default function CampaignSummary({ campaign }: CampaignSummaryProps) {
  const startsAt = parseStartDate(campaign);
  const endsAt = parseEndDate(campaign);

  return (
    <Stack direction="row" justifyContent="space-between">
      <Field name="Start date">{format(startsAt, "yyyy-MM-dd")}</Field>
      <Field name="End date">{format(endsAt, "yyyy-MM-dd")}</Field>
      <Field name="Targets">{campaign.objective.targets.length}</Field>
    </Stack>
  );
}

const Field = ({
  name,
  children,
}: React.PropsWithChildren<{ name: string }>) => (
  <Box>
    <Typography
      color="text.secondary"
      variant="subtitle2"
      paddingBottom={(theme) => theme.spacing(0.5)}
    >
      {name}
    </Typography>
    {children}
  </Box>
);
