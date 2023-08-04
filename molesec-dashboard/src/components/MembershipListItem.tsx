import { MembershipInfo } from "@/types/team";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import TeamAvatar from "./TeamAvatar";

export type MembershipListItemProps = {
  membership: MembershipInfo;
  onClick?: () => void;
};

export const MembershipListItem = ({
  membership,
  onClick,
}: MembershipListItemProps) => {
  const name = membership.Team?.name ?? "Unnamed team";

  return (
    <ListItem key={membership.team_id} disableGutters>
      <ListItemButton onClick={onClick}>
        <ListItemAvatar>
          <TeamAvatar team={membership.Team} />
        </ListItemAvatar>
        <ListItemText
          primary={name}
          secondary={
            "Member since " +
            formatDistanceToNow(new Date(membership.joined_at)) +
            " ago"
          }
        />
      </ListItemButton>
    </ListItem>
  );
};
