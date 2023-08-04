import Home from "@mui/icons-material/Home";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import Settings from "@mui/icons-material/Settings";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { useRouter } from "next/router";

export default function MainAppBar() {
  const { pathname } = useRouter();

  return (
    <AppBar position="static">
      <Toolbar
        sx={{
          justifyContent: "space-between",
        }}
      >
        <Tooltip title="Home">
          <IconButton
            LinkComponent={Link}
            aria-label="Home"
            color="inherit"
            href="/"
          >
            {pathname === "/" ? <Home /> : <HomeOutlined />}
          </IconButton>
        </Tooltip>

        <Stack direction="row" spacing={1}>
          <Tooltip title="Settings">
            <IconButton
              LinkComponent={Link}
              aria-label="Settings"
              color="inherit"
              href="/settings/team"
            >
              {pathname.startsWith("/settings") ? (
                <Settings />
              ) : (
                <SettingsOutlined />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
