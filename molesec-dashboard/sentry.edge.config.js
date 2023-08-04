// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever middleware or an Edge route handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import prisma from "@/api/server/prisma";
import * as Sentry from "@sentry/nextjs";
import * as Tracing from "@sentry/tracing";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const TRACES_SAMPLE_RATE =
  Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE) || 0;

Sentry.init({
  enabled: Boolean(SENTRY_DSN),
  dsn: SENTRY_DSN,
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: TRACES_SAMPLE_RATE,
  integrations: [
    new Tracing.Integrations.Prisma({ client: prisma }),
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  // ...
  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
