import {
  PropsWithUserSession,
  withUserRequirements,
} from "@/api/server/withUserRequirements";
import { withUserSession } from "@/components/withUserSession";
import Card from "@mui/material/Card";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";

function SplashPage({ productInvite }: PropsWithUserSession) {
  React.useEffect(() => {
    if (productInvite) {
      window.location.href = "/";
    }
  }, [productInvite]);

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
        sx={{ mb: "30vh", px: 4, py: 3, minWidth: 320, marginBottom: "32px" }}
      >
        <Typography variant="h5" component="h5" pb={2}>
          Mole Security
        </Typography>
        <Typography variant="body1" component="p">
          Mole security is in preview.
        </Typography>
        <Typography variant="body1" component="p">
          Contact us to request an invite to the product.
        </Typography>
      </Card>

      <Link href="/logout" underline="hover">
        Log out
      </Link>
    </Stack>
  );
}

export default withUserSession(SplashPage);

export const getServerSideProps = withUserRequirements({
  requireProductInvite: false,
  requireTeamMembership: false,
});
