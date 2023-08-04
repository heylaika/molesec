import { useVerifyEmail } from "@/hooks/useVerifyEmail";
import { withPageAuthRequired } from "@auth0/nextjs-auth0";
import { useUser } from "@auth0/nextjs-auth0/client";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function VerifyEmailPage() {
  const { user } = useUser();
  const { verify } = useVerifyEmail();

  return (
    <Stack
      className="Layout"
      position="relative"
      width="100vw"
      height="100vh"
      alignItems="center"
      justifyContent="center"
    >
      <Card
        elevation={2}
        sx={{ mb: "30vh", px: 4, py: 3, maxWidth: 700, marginBottom: "32px" }}
      >
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h5" component="h5">
            Email verification required
          </Typography>
          <Typography variant="body1" component="p">
            A verification email has been sent to {user?.email}
          </Typography>

          <Button onClick={verify} color="primary" variant="outlined">
            Yes, I have verified my email
          </Button>

          <Typography
            variant="body2"
            component="p"
            color="text.secondary"
            fontStyle="italic"
          >
            {"Can't find the email? Try checking your spam folder."}
          </Typography>
        </Stack>
      </Card>

      <Link href="/logout" underline="hover">
        Log out
      </Link>
    </Stack>
  );
}

export const getServerSideProps = withPageAuthRequired();
