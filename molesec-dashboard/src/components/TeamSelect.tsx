import { useLogout } from "@/hooks/useLogout";
import { useManageUser } from "@/hooks/useManageUser";
import { useSwitchTeam } from "@/hooks/useSwitchTeam";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useUser } from "@auth0/nextjs-auth0/client";
import AddOutlined from "@mui/icons-material/AddOutlined";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";
import Logout from "@mui/icons-material/Logout";
import Badge from "@mui/material/Badge";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Tooltip from "@mui/material/Tooltip";
import MoreMenu from "./MoreMenu";
import TeamAvatar from "./TeamAvatar";

const MENU_WIDTH = 280;

export default function TeamSelect() {
  const team = useActiveTeam();
  const switchTeam = useSwitchTeam();
  const { user } = useUser();
  const { memberships, invites, acceptInvite, createTeam } =
    useManageUser(user);

  const createNewTeam = () =>
    createTeam("New Team", "New Organization").then((newTeam) =>
      switchTeam(newTeam.id, "/settings/team?new=true")
    );

  const logout = useLogout();

  const inviteList = Object.values(invites);
  const hasInvites = inviteList.length > 0;

  return (
    <MoreMenu
      MenuListProps={{ disablePadding: true, sx: { minWidth: MENU_WIDTH } }}
      button={(onClick) => (
        <Tooltip title="Teams">
          <Button
            aria-label="Open teams menu"
            aria-haspopup="true"
            color="inherit"
            size="small"
            endIcon={<ArrowDropDown color="inherit" />}
            onClick={onClick}
          >
            <Badge
              overlap="circular"
              invisible={inviteList.length === 0}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
              sx={{
                "& .MuiBadge-badge": {
                  border: (theme) => `2px solid ${theme.palette.primary.main}`,
                  backgroundColor: (theme) => theme.palette.info.light,
                },
              }}
            >
              <TeamAvatar contrast size="small" team={team} />
            </Badge>
          </Button>
        </Tooltip>
      )}
    >
      {hasInvites && <ListSubheader>Invites</ListSubheader>}
      {hasInvites &&
        inviteList.map((invite) => (
          <ListItem key={invite.team_id}>
            <ListItemAvatar>
              <TeamAvatar team={invite.Team} size="small" />
            </ListItemAvatar>
            <ListItemText primary={invite.Team?.name} />
            <Button
              sx={{ ml: 2 }}
              size="small"
              onClick={() => {
                if (user?.sub) {
                  acceptInvite(invite.team_id).then(() =>
                    switchTeam(invite.team_id)
                  );
                }
              }}
            >
              Join
            </Button>
          </ListItem>
        ))}

      <ListSubheader>
        Teams
        <ListItemSecondaryAction>
          <Tooltip title="New team">
            <IconButton onClick={createNewTeam}>
              <AddOutlined color="primary" />
            </IconButton>
          </Tooltip>
        </ListItemSecondaryAction>
      </ListSubheader>
      {Object.values(memberships).map((membership) => (
        <ListItem key={membership.team_id} disableGutters disablePadding>
          <ListItemButton onClick={() => switchTeam(membership.team_id)}>
            <ListItemAvatar>
              <TeamAvatar team={membership.Team} size="small" />
            </ListItemAvatar>

            <ListItemText primary={membership.Team?.name} />
          </ListItemButton>
        </ListItem>
      ))}

      <Button
        aria-label="Logout"
        fullWidth
        variant="text"
        onClick={logout}
        endIcon={<Logout />}
      >
        Logout
      </Button>
    </MoreMenu>
  );
}
