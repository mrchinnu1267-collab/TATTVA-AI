import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    agentUpgrade: "security",
  },
  outputFileTracingExcludes: {
    "*": [
      "public/**",
      "datasets/**",
      "models/**",
      ".tattva*/**",
      ".tattva-vault/**",
      ".tattva_vault/**",
      ".tattva_memory_data/**",
      ".tattva_secure_vault/**",
      ".tattva_studio/**",
      "scratch/**",
      "tests/**",
      "docs/**",
      "scripts/**",
      "companion/**",
      "graphify-out/**",
      "**/*.apk",
      "**/*.zip",
      "**/*.parquet",
      "**/*.tar",
      "**/*.gz",
      "**/*.map",
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
