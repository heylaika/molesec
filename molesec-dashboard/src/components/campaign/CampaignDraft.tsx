import { campaignApi } from "@/api/client/campaignApi";
import { useHasChanged } from "@/hooks/useHasChanged";
import { useManageCampaigns } from "@/hooks/useManageCampaigns";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useCampaignRecord } from "@/stores/useCampaignRecord";
import { useEditCampaign } from "@/stores/useEditCampaign";
import {
  CampaignData,
  canLaunch,
  hasValidCampaignData,
  isValidCampaignTarget,
} from "@/util/campaign";
import { FetchError } from "@/util/fetcher";
import { RowData } from "@/util/supabase";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import React from "react";
import { useAsyncFn, useDebounce, useToggle } from "react-use";
import MoreMenu from "../MoreMenu";
import SaveButton from "../SaveButton";
import EditCampaignTargets from "./EditCampaignTargets";

export type CampaignDraftProps = {
  campaign: RowData<"Campaign"> & CampaignData;
  onDelete: () => void;
};

export default function CampaignDraft({
  campaign,
  onDelete,
}: CampaignDraftProps) {
  const changes = useEditCampaign();
  const { updateCampaign, deleteById } = useManageCampaigns();
  const [saveState, update] = useAsyncFn(updateCampaign, [updateCampaign]);
  const [launchState, launch] = useAsyncFn(campaignApi.launch, []);
  const [deleteState, deleteCampaign] = useAsyncFn(deleteById, [deleteById]);
  const [showError, toggleError] = useToggle(false);
  const [showOrgWarning, toggleOrgWarning] = useToggle(false);
  const validTargetCount = React.useMemo(
    () => changes.objective.targets.filter(isValidCampaignTarget).length,
    [changes.objective.targets]
  );

  const onDeleteDraft = React.useCallback(
    async () => deleteCampaign(campaign.id).then(() => onDelete()),
    [campaign.id, deleteCampaign, onDelete]
  );

  React.useEffect(() => {
    const { id } = useEditCampaign.getState();

    if (id !== campaign.id) {
      useEditCampaign.setState(campaign, true);
    }
  }, [campaign]);

  const handleLaunch = () => {
    if (!hasValidCampaignData(campaign)) return;

    if (!useActiveTeam.getState()?.org_name) {
      toggleOrgWarning(true);
    } else {
      launch(campaign).then((updated) =>
        useCampaignRecord.set(campaign.id, { ...campaign, ...updated })
      );
    }
  };

  const didChange = useHasChanged(changes);

  useDebounce(
    () => {
      // Prevents a constant update-loop.
      if (!didChange || !changes.id) return;
      if (saveState.loading) return;
      if (!hasValidCampaignData(changes)) return;

      update(changes.id, changes);
    },
    1000,
    [changes, didChange]
  );

  React.useEffect(() => {
    if (launchState.error) {
      toggleError(true);
    }
  }, [launchState.error, toggleError]);

  return (
    <Stack width="100%">
      <Stack width="100%" direction="row" alignItems="center" spacing={2}>
        <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
          {campaign?.name}
        </Typography>

        <SaveButton
          saving={saveState.loading || launchState.loading}
          title="Launch campaign"
          disabled={!campaign || !canLaunch(campaign) || launchState.loading}
          onClick={() => handleLaunch()}
        >
          Launch
        </SaveButton>
        <MoreMenu ButtonProps={{ disabled: !hasValidCampaignData(changes) }}>
          <MenuItem
            dense
            disabled={deleteState.loading}
            onClick={onDeleteDraft}
            sx={{ color: (theme) => theme.palette.error.main }}
          >
            Delete draft
          </MenuItem>
        </MoreMenu>
      </Stack>

      <Stack spacing={4} mt={4}>
        <TextField
          label="Campaign name"
          sx={{ maxWidth: 500 }}
          value={changes?.name ?? ""}
          onChange={(event) => {
            useEditCampaign.set("name", event?.target.value);
          }}
        />

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            label="Start date"
            type="date"
            value={changes?.start_date ?? ""}
            InputLabelProps={{ shrink: true }}
            onChange={(event) =>
              useEditCampaign.set("start_date", event?.target.value)
            }
          />

          <TextField
            label="Duration"
            type="number"
            value={changes?.duration_days ?? 1}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: 1, max: 365 }}
            InputProps={{
              endAdornment: (
                <Typography variant="body2" color="text.secondary">
                  days
                </Typography>
              ),
            }}
            onChange={(event) =>
              useEditCampaign.set(
                "duration_days",
                Number(event?.target.value) ?? 1
              )
            }
          />
        </Stack>
      </Stack>

      <Stack spacing={2}>
        <Stack mt={4} direction="row" spacing={1} alignItems="center">
          <Typography variant="h5" component="h2">
            <span>Targets</span>
          </Typography>
          <Chip size="small" label={validTargetCount} />
        </Stack>

        <EditCampaignTargets
          targets={changes.objective?.targets ?? []}
          onChange={(targets) =>
            useEditCampaign.replace("objective", (objective: any) => ({
              ...objective,
              targets,
            }))
          }
        />
      </Stack>

      <Dialog open={showError}>
        <DialogTitle>Could not launch campaign</DialogTitle>
        <DialogContent>{getLaunchError(launchState.error)}</DialogContent>
        <DialogActions>
          <Button onClick={toggleError}>OK</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showOrgWarning}
        message="Company name required before launch"
        action={
          <Button LinkComponent={Link} href="/settings/team">
            Open settings
          </Button>
        }
      />
    </Stack>
  );
}

const getLaunchError = (error: unknown) => {
  if (!error) return "Unknown error";

  const hasErrorBody =
    error instanceof FetchError && typeof error.body.message === "string";

  if (hasErrorBody) {
    return error.body.message;
  } else {
    return String(error);
  }
};
