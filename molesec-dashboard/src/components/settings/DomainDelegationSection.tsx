import { useManageDomains } from "@/hooks/useManageDomains";
import { useDomainRecord } from "@/stores/useDomainRecord";
import { google } from "@/util/whitelisting";
import { useUser } from "@auth0/nextjs-auth0/client";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Link from "@mui/material/Link";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";
import { useAsync, useAsyncFn } from "react-use";

export default function DomainDelegationSection() {
  const { user } = useUser();
  const domains = useDomainRecord();
  const domain = React.useMemo(
    () => Object.values(domains ?? {})[0],
    [domains]
  );
  const { fetchTeamDomains, validateDelegation, getDelegationStatus } =
    useManageDomains();
  const loadState = useAsync(fetchTeamDomains, [fetchTeamDomains]);
  const [validationState, setValidationState] = React.useState<boolean>();
  const [validateState, validate] = useAsyncFn(
    (domainId) =>
      validateDelegation(domainId).then((result) =>
        setValidationState(result.is_delegated)
      ),
    [validateDelegation]
  );
  const [statusState, getStatus] = useAsyncFn(
    (domainId: string) => getDelegationStatus(domainId),
    [getDelegationStatus]
  );

  React.useEffect(() => {
    if (domain?.id) getStatus(domain.id);
  }, [domain?.id, getStatus]);

  const isEmailProviderSupported = domain?.email_provider === "Google";

  const canValidate = Boolean(
    !loadState.loading &&
      !statusState.loading &&
      isEmailProviderSupported &&
      statusState.value !== "DELEGATED_BY_OTHER"
  );

  return (
    <Stack mt={6}>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h5" component="h2">
          Domain delegation
        </Typography>
      </Stack>
      <Collapse in={loadState.loading}>
        <Stack alignItems="center" justifyContent="center" mt={4}>
          <CircularProgress size={24} />
        </Stack>
      </Collapse>

      <Collapse in={!isEmailProviderSupported && Boolean(domain)}>
        <Alert severity="error">
          {
            "We currently don't support domain delegation for your email provider."
          }
        </Alert>
      </Collapse>

      <Collapse in={statusState.value === "DELEGATED_BY_OTHER"}>
        <Alert severity="error">
          The domain <strong>{domain?.name}</strong> is administrated by a
          different team. If you think this is a mistake, please contact us!
        </Alert>
      </Collapse>

      <Collapse in={canValidate && domain && !domain.is_delegated}>
        <Alert severity="info">
          Domain delegation allows for us to send emails to your domain without
          being rejected or ending up in the spam folder.
        </Alert>

        <Box mt={2}>
          <Typography component="p">
            To set this up you need admin privileges for your Google workspace.
          </Typography>

          <Box component="ol">
            <li>
              {"Open your "}
              <Link href={google.addUrl} underline="always" target="_blank">
                Google Admin panel
              </Link>{" "}
              for <strong>{domain?.name}</strong>
            </li>
            <li>
              Click <strong>Add new</strong> next to API clients
            </li>
            <li>
              Input <code>{google.clientId}</code> as <strong>Client ID</strong>
            </li>
            <li>
              Input <code>{google.clientScope}</code> as{" "}
              <strong>OAuth Scopes</strong>
            </li>
            <li>
              Click <strong>Authorize</strong>
            </li>
          </Box>
        </Box>

        <Stack gap={2} alignItems="flex-start">
          Once done, verify the delegation by clicking the button below.
          <Stack direction="row" alignItems="center" gap={2}>
            <Button
              startIcon={
                validateState.loading ? (
                  <CircularProgress size={14} />
                ) : (
                  <CheckOutlined />
                )
              }
              variant="outlined"
              disabled={!canValidate}
              onClick={() => domain && validate(domain.id)}
            >
              Verify delegation
            </Button>
            <Typography component="p" variant="body2" color="text.secondary">
              <strong>Note:</strong> An email will be sent to {user?.email}
            </Typography>
          </Stack>
        </Stack>
      </Collapse>

      <Collapse in={Boolean(canValidate && domain && domain.is_delegated)}>
        <Alert severity="success">
          Domain delegation for <strong>{domain?.name}</strong> is set up!
        </Alert>

        <Stack gap={2} mt={2} alignItems="flex-start">
          <Box>
            Experiencing issues? You can reverify the domain delegation using
            the button below.
          </Box>
          <Stack direction="row" alignItems="center" gap={2}>
            <Button
              startIcon={
                validateState.loading ? (
                  <CircularProgress size={14} />
                ) : (
                  <CheckOutlined />
                )
              }
              variant="outlined"
              disabled={!canValidate}
              onClick={() => domain && validate(domain.id)}
            >
              Reverify delegation
            </Button>
            <Typography component="p" variant="body2" color="text.secondary">
              <strong>Note:</strong> An email will be sent to {user?.email}
            </Typography>
          </Stack>
        </Stack>
      </Collapse>

      <Snackbar
        open={validationState === true}
        autoHideDuration={3000}
        onClose={() => setValidationState(undefined)}
        message="Validation succeeded! 🎉"
      />

      <Snackbar
        open={validationState === false}
        autoHideDuration={3000}
        onClose={() => setValidationState(undefined)}
        message="Validation failed"
      />
    </Stack>
  );
}
