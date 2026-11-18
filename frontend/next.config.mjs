import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    agentUpgrade: "security",
  },
  outputFileTracingExcludes: {
    "*": [
      ".tattva-vault/**",
      ".tattva_vault/**",
      ".tattva_memory_data/**",
      ".tattva_secure_vault/**",
      "datasets/**",
      "scratch/**",
      "tests/**",
      "docs/**",
      "companion/**",
      "graphify-out/**",
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  telemetry: false,
});
