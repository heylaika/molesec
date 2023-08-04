import { initials } from "@/util/avatar";
import { Nullish } from "@/util/nullable";
import { RowData } from "@/util/supabase";
import Avatar from "@mui/material/Avatar";
import { SxProps, Theme } from "@mui/material/styles";

export type TeamAvatarProps = {
  size?: "small" | "medium";
  contrast?: boolean;
  team: Nullish<RowData<"Team">>;
};

export default function TeamAvatar({
  size = "medium",
  contrast = false,
  team,
}: TeamAvatarProps) {
  const sx = {
    ...(size === "small" ? smallSx : {}),
    ...(contrast ? contrastSx : {}),
  };

  return <Avatar sx={sx}>{team?.name ? initials(team.org_name) : ""}</Avatar>;
}

const contrastSx: SxProps<Theme> = {
  backgroundColor: (theme) => theme.palette.primary.contrastText,
};

const smallSx: SxProps<Theme> = {
  width: "24px",
  height: "24px",
  fontSize: "12px",
};
