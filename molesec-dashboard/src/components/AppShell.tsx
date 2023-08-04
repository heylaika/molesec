import Settings from "@mui/icons-material/Settings";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import IconButton from "@mui/material/IconButton";
import Stack, { StackProps } from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import CampaignMenu from "./CampaignMenu";
import Scrollable from "./Scrollable";

export default function AppShell(props: StackProps) {
  const { asPath } = useRouter();
  const isSettingsPage = asPath.startsWith("/settings");

  return (
    <Stack
      className="Layout"
      position="relative"
      width="100vw"
      height="100vh"
      alignItems="stretch"
      justifyContent="stretch"
      direction="row"
    >
      <Scrollable
        width="100%"
        maxWidth={300}
        alignItems="stretch"
        bgcolor={(theme) => alpha(theme.palette.primary.main, 0.03)}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          px={2}
          py={1}
        >
          <Link href="/">
            <Image
              priority
              src="/img/logo_wordmark.png"
              width={76}
              height={25}
              alt="Mole Security Logo"
            />
          </Link>

          <IconButton LinkComponent={Link} href="/settings/team">
            {isSettingsPage ? <Settings /> : <SettingsOutlined />}
          </IconButton>
        </Stack>

        <CampaignMenu />
      </Scrollable>

      <Scrollable width="100%">
        <Stack
          className="MainContent"
          position="relative"
          alignItems="center"
          {...props}
          width="100%"
          height="100%"
        />
      </Scrollable>
    </Stack>
  );
}
