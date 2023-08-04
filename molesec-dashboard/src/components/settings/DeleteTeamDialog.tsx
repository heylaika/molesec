import { useCleanTeam } from "@/hooks/useCleanTeam";
import { useManageTeam } from "@/hooks/useManageTeam";
import { useActiveTeam } from "@/stores/useActiveTeam";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React from "react";

type DeleteTeamDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function DeleteTeamDialog({
  open,
  onClose,
}: DeleteTeamDialogProps) {
  const cleanTeam = useCleanTeam();
  const [deleting, setDeleting] = React.useState(false);
  const [teamName, setTeamName] = React.useState("");

  const team = useActiveTeam();
  const { deleteTeam } = useManageTeam(team);

  const handleConfirm = async () => {
    setDeleting(true);

    try {
      await deleteTeam();
      cleanTeam("/splash");
    } catch (error) {
      console.error("Failed to delete team.");
      onClose();
      setDeleting(false);
    }
  };

  const submitButtonDisabled = deleting || teamName !== team?.name;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Delete &quot;{team?.name}&quot;</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            Are you sure you want to delete this team?
            <br /> This will delete queries and data sources for all members and
            cannot be undone.
          </Typography>
          <Typography>Type team name to confirm deletion:</Typography>
          <TextField
            placeholder={team?.name}
            value={teamName}
            onChange={({ target }) => setTeamName(target.value)}
            color="warning"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={deleting}>
          Keep team
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={submitButtonDisabled}
          onClick={handleConfirm}
        >
          {deleting ? "Deleting" : "Delete team"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
