import { withUserRequirements } from "@/api/server/withUserRequirements";
import AppShell from "@/components/AppShell";
import CampaignDraft from "@/components/campaign/CampaignDraft";
import CampaignInfo from "@/components/campaign/CampaignInfo";
import { withUserSession } from "@/components/withUserSession";
import { useFirstQueryValue } from "@/hooks/useFirstQueryValue";
import { useCampaignRecord } from "@/stores/useCampaignRecord";
import { isDraft, sortCampaigns } from "@/util/campaign";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/router";
import React from "react";
import * as uuid from "uuid";

const CampaignPage = () => {
  const id = useFirstQueryValue("id");
  const router = useRouter();
  const campaign = useCampaignRecord((record) => (id ? record[id] : null));

  React.useEffect(() => {
    if (!id || !uuid.validate(id)) {
      window.location.href = "/";
    }
  }, [id]);

  const onDelete = () => {
    const next = sortCampaigns(
      Object.values(useCampaignRecord.getState())
    ).find((campaign) => campaign.id !== id);

    if (next) {
      router.push(`/campaign/${next.id}`);
    } else {
      router.push("/");
    }
  };

  return (
    <AppShell>
      <Stack pt={8} px={4} width="100%" maxWidth="1280px">
        {campaign &&
          (isDraft(campaign) ? (
            <CampaignDraft campaign={campaign} onDelete={onDelete} />
          ) : (
            <CampaignInfo campaign={campaign} />
          ))}
      </Stack>
    </AppShell>
  );
};

export default withUserSession(CampaignPage);

export const getServerSideProps = withUserRequirements();
