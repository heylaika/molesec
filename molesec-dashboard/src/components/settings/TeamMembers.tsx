import { useManageTeam } from "@/hooks/useManageTeam";
import { useActiveTeam } from "@/stores/useActiveTeam";
import { useUser } from "@auth0/nextjs-auth0/client";
import AddOutlined from "@mui/icons-material/AddOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SendOutlined from "@mui/icons-material/SendOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Stack, { StackProps } from "@mui/material/Stack";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import React from "react";
import { useAsyncFn, useToggle } from "react-use";

export default function TeamMembers() {
  const { user } = useUser();
  const team = useActiveTeam();
  const {
    memberships,
    invites,
    fetchMemberships,
    fetchInvites,
    sendInvite,
    deleteInvite,
    deleteMembership,
  } = useManageTeam(team);

  const [inviteState, invite] = useAsyncFn(sendInvite, [sendInvite]);
  const [showInvite, toggleInvite] = useToggle(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const isTeamOwner = team?.owner_user_id === user?.sub;

  React.useEffect(() => {
    fetchMemberships();
    fetchInvites();
  }, [team?.id, fetchInvites, fetchMemberships]);

  return (
    <>
      <List sx={{ pb: 0 }}>
        {Object.values(memberships).map((membership) => {
          const isMembershipOwner = user?.sub === membership.user_id;
          const canDelete = isTeamOwner || isMembershipOwner;

          return (
            <MemberRow
              disabled
              key={membership.email}
              email={membership.email}
              endAdornment={
                team?.owner_user_id === membership.user_id && (
                  <Chip label="Owner" />
                )
              }
              actions={
                team?.owner_user_id !== membership.user_id && (
                  <Tooltip
                    title={
                      isMembershipOwner
                        ? "Leave team"
                        : isTeamOwner
                        ? "Delete member"
                        : "Only the owner can delete members"
                    }
                  >
                    <span>
                      <IconButton
                        aria-label="Delete member"
                        disabled={!canDelete}
                        onClick={() => deleteMembership(membership.user_id)}
                      >
                        {isMembershipOwner ? (
                          <LogoutOutlinedIcon color="primary" />
                        ) : (
                          <DeleteOutlined
                            color={canDelete ? "primary" : "disabled"}
                          />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )
              }
            />
          );
        })}
        {Object.values(invites).map((invite) => {
          const canDelete = isTeamOwner || invite.inviter_email === user?.email;

          return (
            <MemberRow
              disabled
              key={invite.email}
              email={invite.email}
              endAdornment={<Chip label="Pending" />}
              actions={
                <Tooltip
                  title={
                    canDelete
                      ? "Delete invitation"
                      : "Only the inviter or team owner can delete"
                  }
                >
                  <span>
                    <IconButton
                      aria-label="Delete invitation"
                      onClick={() => deleteInvite(invite.email)}
                      disabled={!canDelete}
                    >
                      <DeleteOutlined
                        color={canDelete ? "primary" : "disabled"}
                      />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            />
          );
        })}
      </List>
      <Collapse in={showInvite} onExited={() => setInviteEmail("")}>
        <MemberRow
          email={inviteEmail}
          onSubmit={(email) => invite(email).then(() => setInviteEmail(""))}
          endAdornment={
            inviteState.loading ? (
              <CircularProgress size="18px" color="primary" sx={{ mr: 1 }} />
            ) : (
              <Tooltip title="Send invitation">
                <span>
                  <IconButton
                    aria-label="Send invitation"
                    type="submit"
                    disabled={!inviteEmail}
                  >
                    <SendOutlined color="primary" />
                  </IconButton>
                </span>
              </Tooltip>
            )
          }
          actions={
            <Tooltip title="Cancel">
              <IconButton aria-label="Cancel" onClick={toggleInvite}>
                <CloseOutlined color="primary" />
              </IconButton>
            </Tooltip>
          }
          inputProps={{
            "aria-label": "Invite email",
            required: true,
            onChange: (event) => setInviteEmail(event?.currentTarget.value),
          }}
          stackProps={{ mt: 0 }}
        />
      </Collapse>
      <Collapse in={!showInvite}>
        <Tooltip title="Create new invite">
          <Button
            aria-label="New invite"
            onClick={toggleInvite}
            startIcon={<AddOutlined />}
          >
            New
          </Button>
        </Tooltip>
      </Collapse>
    </>
  );
}

type MemberRowProps = {
  email: string;
  disabled?: boolean;
  actions?: React.ReactNode;
  endAdornment?: React.ReactNode;
  inputProps?: TextFieldProps["inputProps"];
  stackProps?: StackProps<"form">;
  onSubmit?: (email: string) => void;
};

const MemberRow = ({
  email,
  actions,
  endAdornment,
  disabled,
  inputProps,
  stackProps,
  onSubmit,
}: MemberRowProps) => {
  return (
    <Stack
      direction="row"
      alignItems="center"
      my={3}
      spacing={2}
      component={onSubmit ? "form" : ("div" as "form")}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(email);
      }}
      {...stackProps}
    >
      <TextField
        fullWidth
        type="email"
        label="Email"
        value={email}
        disabled={disabled}
        InputProps={{ endAdornment }}
        inputProps={inputProps}
      />
      {actions && <Box>{actions}</Box>}
    </Stack>
  );
};
