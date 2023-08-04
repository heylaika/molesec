import { InviteInfo } from "@/types/team";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import TeamAvatar from "./TeamAvatar";

export type InviteListItem = {
  invite: InviteInfo;
  onClick?: () => void;
};

export const InviteListItem = ({ invite, onClick }: InviteListItem) => {
  const name = invite?.Team?.name ?? "Unnamed team";

  return (
    <ListItem key={invite.team_id + invite.email}>
      <ListItemButton onClick={onClick}>
        <ListItemAvatar>
          <TeamAvatar team={invite.Team} />
        </ListItemAvatar>

        <ListItemText
          primary={name}
          secondary={
            "Invited " +
            formatDistanceToNow(new Date(invite.invited_at)) +
            " ago"
          }
        />
      </ListItemButton>
    </ListItem>
  );
};
