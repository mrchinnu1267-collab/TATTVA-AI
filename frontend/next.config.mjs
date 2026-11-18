import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    agentUpgrade: "security",
  },
  serverExternalPackages: ["onnxruntime-node", "@huggingface/transformers"],
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
      "**/node_modules/onnxruntime-node/**",
      "**/node_modules/onnxruntime-web/**",
      "**/node_modules/@huggingface/**",
      "**/node_modules/@mohammednagy/**",
      "**/node_modules/playwright-core/**",
      "**/node_modules/@playwright/**",
      "**/*.apk",
      "**/*.zip",
      "**/*.parquet",
      "**/*.tar",
      "**/*.gz",
      "**/*.map",
    ],
  },
};

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      dryRun: false,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
      telemetry: false,
    })
  : nextConfig;
