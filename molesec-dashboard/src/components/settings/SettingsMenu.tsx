import { useActiveTeam } from "@/stores/useActiveTeam";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
import { useRouter } from "next/router";

export default function SettingsMenu() {
  const { asPath } = useRouter();
  const team = useActiveTeam();

  return (
    <List sx={{ my: 1 }}>
      <ListItem disableGutters>
        <ListItemButton
          component={Link}
          href="/settings/team"
          selected={asPath === "/settings/team"}
          sx={{ borderRadius: "8px" }}
        >
          <ListItemText primary="Team Settings" />
        </ListItemButton>
      </ListItem>

      <ListItem disableGutters>
        <ListItemButton
          component={Link}
          href="/settings/domain-delegation"
          selected={asPath === "/settings/domain-delegation"}
        >
          <ListItemText primary="Domain Delegation" />
        </ListItemButton>
      </ListItem>
    </List>
  );
}
