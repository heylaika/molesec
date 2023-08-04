import MoreHoriz from "@mui/icons-material/MoreHoriz";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import Menu, { MenuProps } from "@mui/material/Menu";
import React from "react";

type MoreMenuProps = {
  icon?: React.ReactNode;
  button?: (
    handleClick: React.MouseEventHandler<HTMLButtonElement>
  ) => JSX.Element;
  ButtonProps?: IconButtonProps;
} & Omit<MenuProps, "open" | "anchorEl">;

export default function MoreMenu({
  icon,
  button,
  ButtonProps: buttonProps,
  ...menuProps
}: MoreMenuProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    setAnchorEl(event.currentTarget);
  };

  return (
    <>
      {button?.(handleOpen) ?? (
        <IconButton
          aria-label="More"
          aria-haspopup="true"
          onClick={handleOpen}
          {...buttonProps}
        >
          {icon ?? <MoreHoriz />}
        </IconButton>
      )}
      <Menu
        anchorEl={anchorEl}
        {...menuProps}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        onClick={() => setAnchorEl(null)}
      />
    </>
  );
}
