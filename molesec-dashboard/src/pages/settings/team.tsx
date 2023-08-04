import { teamApi } from "@/api/client/teamApi";
import { withUserRequirements } from "@/api/server/withUserRequirements";
import AppShell from "@/components/AppShell";
import MoreMenu from "@/components/MoreMenu";
import SaveButton from "@/components/SaveButton";
import DeleteTeamDialog from "@/components/settings/DeleteTeamDialog";
import DomainDelegationSection from "@/components/settings/DomainDelegationSection";
import { withUserSession } from "@/components/withUserSession";
import { useManageTeam } from "@/hooks/useManageTeam";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useEditTeam } from "@/stores/useEditTeam";
import { hasValue } from "@/util/nullable";
import { equalsShallow } from "@/util/record";
import { useUser } from "@auth0/nextjs-auth0/client";
import Button from "@mui/material/Button";
import { blue } from "@mui/material/colors";
import MenuItem from "@mui/material/MenuItem";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React from "react";
import { useAsyncFn, useToggle } from "react-use";

const TeamPage = () => {
  const { user } = useUser();

  const team = useActiveTeam();
  const { updateTeam } = useManageTeam(team);
  const changes = useEditTeam();
  const [unsaved, toggleUnsaved] = useToggle(false);
  const [saved, toggleSaved] = useToggle(false);
  const hasChanges =
    !equalsShallow(changes, team ?? {}, ["name", "org_name"]) ||
    changes.org_urls?.[0] !== team?.org_urls?.[0];
  const [saveState, update] = useAsyncFn(updateTeam, [updateTeam]);
  const [orgNameInput, setOrgNameInput] =
    React.useState<HTMLInputElement | null>(null);
  const [showingDeleteDialog, toggleDeleteDialog] = useToggle(false);

  const isNew = !team?.org_name;

  const teamOwnerId = team?.owner_user_id;
  const isTeamOwner = hasValue(teamOwnerId) && teamOwnerId === user?.sub;

  React.useEffect(() => {
    if (!team) return;

    useEditTeam.setState(team, true);
  }, [team]);

  React.useEffect(() => {
    if (hasChanges) {
      const handle = window.setTimeout(() => toggleUnsaved(true), 5000);
      return () => window.clearTimeout(handle);
    } else {
      toggleUnsaved(false);
    }
  }, [changes.name, hasChanges, toggleUnsaved]);

  React.useEffect(() => {
    if (!isNew || !orgNameInput) return;

    window.setTimeout(() => {
      orgNameInput.focus();
      orgNameInput.select();
    }, 500);
  }, [isNew, orgNameInput]);

  const canSave = Boolean(changes.org_name && !saveState.loading && hasChanges);

  return (
    <AppShell>
      <Stack width="100%" maxWidth="800px" mb={8} mx={2} mt={8} px={2}>
        <Stack my={5} direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
            Team Settings
          </Typography>

          <SaveButton
            saving={saveState.loading}
            disabled={!canSave}
            onClick={() =>
              update(changes).then(() => {
                useActiveTeam.setState(changes);
                toggleSaved(true);
                teamApi.syncOrganization();
              })
            }
          />
          <MoreMenu ButtonProps={{ disabled: !isTeamOwner }}>
            <MenuItem
              dense
              sx={{ color: (theme) => theme.palette.error.main }}
              onClick={() => toggleDeleteDialog(true)}
            >
              Delete
            </MenuItem>
          </MoreMenu>
        </Stack>

        <Stack>
          <TextField
            label="Team name"
            sx={{ maxWidth: 600, display: "none" }}
            placeholder="e.g. Secure Inc. Red Team"
            value={changes?.name ?? team?.name ?? ""}
            onChange={(event) =>
              useEditTeam.replace("name", event?.target.value)
            }
          />

          <Stack spacing={3}>
            <TextField
              required
              label="Company name"
              placeholder="e.g. Secure Inc."
              value={changes?.org_name ?? team?.org_name ?? ""}
              inputProps={{ ref: setOrgNameInput }}
              onChange={(event) =>
                useEditTeam.replace("org_name", event?.target.value)
              }
            />

            <TextField
              label="Company LinkedIn URL"
              type="url"
              placeholder="https://www.linkedin.com/company/..."
              value={changes.org_urls?.[0] ?? ""}
              onChange={(event) =>
                useEditTeam.replace("org_urls", [event.target.value])
              }
            />
          </Stack>
        </Stack>

        <DomainDelegationSection />
      </Stack>

      <Snackbar
        open={unsaved}
        message="Unsaved changes"
        onClose={() => toggleUnsaved(false)}
        action={
          <Button
            size="small"
            style={{ color: blue[200] }}
            disabled={!canSave}
            onClick={() => update(changes).then(toggleSaved)}
          >
            Save
          </Button>
        }
      />

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={toggleSaved}
        message="Settings saved"
      />

      <DeleteTeamDialog
        open={showingDeleteDialog}
        onClose={() => toggleDeleteDialog(false)}
      />
    </AppShell>
  );
};

export default withUserSession(TeamPage);

export const getServerSideProps = withUserRequirements();
