import { useCampaignList } from "@/hooks/useCampaignList";
import { useManageCampaigns } from "@/hooks/useManageCampaigns";
import { hasValidCampaignData, withCampaignStatus } from "@/util/campaign";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAsync } from "react-use";
import { NewCampaignButton } from "./NewCampaignButton";

export default function CampaignMenu() {
  const campaigns = useCampaignList();
  const { fetchTeamCampaigns } = useManageCampaigns();
  const router = useRouter();

  useAsync(fetchTeamCampaigns, [fetchTeamCampaigns]);

  return (
    <>
      <Stack px={2}>
        <NewCampaignButton />
      </Stack>

      <List sx={{ my: 1, mb: "auto" }}>
        {campaigns
          .filter(hasValidCampaignData)
          .map(withCampaignStatus)
          .map(([campaign, status]) => (
            <ListItem disableGutters key={campaign.id}>
              <ListItemButton
                component={Link}
                href={"/campaign/" + campaign.id}
                selected={router.asPath === "/campaign/" + campaign.id}
                sx={{ borderRadius: "8px" }}
              >
                <ListItemText primary={campaign.name} />
                <ListItemSecondaryAction>
                  <Chip
                    variant="outlined"
                    size="small"
                    label={status}
                    color={
                      status === "Active"
                        ? "primary"
                        : status === "Done"
                        ? "success"
                        : undefined
                    }
                  />
                </ListItemSecondaryAction>
              </ListItemButton>
            </ListItem>
          ))}
      </List>

      <Stack mt="auto" alignItems="center">
        <Button href="/logout" endIcon={<LogoutOutlined />} sx={{ mb: 1 }}>
          Logout
        </Button>
      </Stack>
    </>
  );
}
