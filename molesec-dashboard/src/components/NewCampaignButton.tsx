import { useManageCampaigns } from "@/hooks/useManageCampaigns";
import { createCampaignDraft } from "@/util/campaign";
import AddOutlined from "@mui/icons-material/AddOutlined";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useRouter } from "next/router";
import React, { useState } from "react";

export const NewCampaignButton = () => {
  const router = useRouter();
  const { createCampaign } = useManageCampaigns();
  const [isCreating, setIsCreating] = useState(false);

  const createDraft = React.useCallback(async () => {
    setIsCreating(true);
    const campaign = await createCampaign(createCampaignDraft());

    router.push(`/campaign/${campaign.id}`);
  }, [createCampaign, router]);

  React.useEffect(() => setIsCreating(false), [router.asPath]);

  return (
    <Button
      variant="outlined"
      color="primary"
      disabled={isCreating}
      startIcon={isCreating ? <CircularProgress size={14} /> : <AddOutlined />}
      onClick={createDraft}
    >
      New campaign
    </Button>
  );
};
