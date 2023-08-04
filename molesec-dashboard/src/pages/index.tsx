import { withUserRequirements } from "@/api/server/withUserRequirements";
import AppShell from "@/components/AppShell";
import { NewCampaignButton } from "@/components/NewCampaignButton";
import { withUserSession } from "@/components/withUserSession";
import { useUser } from "@auth0/nextjs-auth0/client";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

const HomePage = () => {
  const { user } = useUser();

  const name = user?.given_name ?? user?.name;

  return (
    <AppShell pt="20vh">
      <Stack maxWidth="800px" alignItems="center" spacing={2}>
        <Stack alignItems="center" spacing={0.25} pb={1} pt={3}>
          <Typography variant="h4" component="h2" color="text.primary">
            <>Welcome {name}!</>
          </Typography>
          <Typography component="p" color="text.secondary">
            Select or create a new campaign to get started.
          </Typography>
        </Stack>

        <NewCampaignButton />
      </Stack>
    </AppShell>
  );
};

export default withUserSession(HomePage);

export const getServerSideProps = withUserRequirements();
