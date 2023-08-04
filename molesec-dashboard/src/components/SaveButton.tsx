import Button, { ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Grow from "@mui/material/Grow";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";

export type SaveButtonProps = ButtonProps & { saving?: boolean };

export default function SaveButton({
  saving,
  children = "Save",
  ...buttonProps
}: SaveButtonProps) {
  const disabled = buttonProps.disabled || saving;
  const title = saving ? "Saving…" : buttonProps.title ?? "Save";

  return (
    <Stack direction="row" alignItems="center" spacing={2}>
      <Grow in={saving} timeout={400} style={{ transformOrigin: "50% 50%" }}>
        <CircularProgress size={18} />
      </Grow>
      <Tooltip title={disabled && !saving ? "" : title}>
        <span>
          <Button
            variant="contained"
            aria-label="Save"
            {...buttonProps}
            disabled={disabled}
          >
            {children}
          </Button>
        </span>
      </Tooltip>
    </Stack>
  );
}
