// This file sets a custom webpack configuration to use your Next.js app
// with Sentry.
// https://nextjs.org/docs/api-reference/next.config.js/introduction
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/settings", destination: "/settings/team", permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: "/setup", destination: "/api/user-setup" },
      { source: "/login", destination: "/api/auth/login" },
      { source: "/logout", destination: "/api/auth/logout" },
    ];
  },
};

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

module.exports = withSentryConfig(
  nextConfig,
  { silent: true, dryRun: !Boolean(SENTRY_DSN) },
  { hideSourceMaps: false }
);
