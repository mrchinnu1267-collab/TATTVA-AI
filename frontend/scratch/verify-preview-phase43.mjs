/**
 * TATTVA AI - Phase 43 Preview & Production Verification Script
 * Validates the complete Autonomous Evolution & Maintenance Platform lifecycle
 */

import { execSync } from "child_process";
import fs from "fs";

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log("Target Base URL:", targetUrl);

async function main() {
  const token = Buffer.from(
    JSON.stringify({
      userId: "guest_user",
      email: "guest@tattva.ai",
      tier: "free",
      expiresAt: Date.now() + 3600000,
    })
  ).toString("base64");

  console.log("\n1. Testing /api/health on deployment...");
  const healthCmd = `npx vercel curl "${targetUrl}/api/health"`;
  const healthOutput = execSync(healthCmd, { encoding: "utf-8" });
  console.log("Health Output Sample:\n", healthOutput.slice(-300));
  if (!healthOutput.includes('"environment":') && !healthOutput.includes('"status":')) {
    throw new Error("Health check failed: " + healthOutput);
  }

  console.log("\n2. Testing /api/evolution/metrics GET...");
  const metricsCmd = `npx vercel curl "${targetUrl}/api/evolution/metrics" -H "x-tattva-session: ${token}"`;
  const metricsOutput = execSync(metricsCmd, { encoding: "utf-8" });
  console.log("Metrics Output Sample:\n", metricsOutput.slice(-350));
  if (!metricsOutput.includes('"success":true') || !metricsOutput.includes('"chatLatency":')) {
    throw new Error("Metrics check failed: " + metricsOutput);
  }

  console.log("\n3. Testing /api/evolution/eval GET (Benchmark questions)...");
  const evalGetCmd = `npx vercel curl "${targetUrl}/api/evolution/eval" -H "x-tattva-session: ${token}"`;
  const evalGetOutput = execSync(evalGetCmd, { encoding: "utf-8" });
  console.log("Eval GET Output Sample:\n", evalGetOutput.slice(-350));
  if (!evalGetOutput.includes('"success":true') || !evalGetOutput.includes('"count":')) {
    throw new Error("Eval GET failed: " + evalGetOutput);
  }

  console.log("\n4. Testing /api/evolution/eval POST (Run Evaluation Suite)...");
  const evalPostPayload = { targetModel: "gemini-2.5-flash" };
  fs.writeFileSync("scratch/test-evo-eval.json", JSON.stringify(evalPostPayload));
  const evalPostCmd = `npx vercel curl ${targetUrl}/api/evolution/eval -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-evo-eval.json"`;
  const evalPostOutput = execSync(evalPostCmd, { encoding: "utf-8" });
  console.log("Eval POST Output Sample:\n", evalPostOutput.slice(-350));
  if (!evalPostOutput.includes('"success":true') || !evalPostOutput.includes('"passedValidationGate":')) {
    throw new Error("Eval POST failed: " + evalPostOutput);
  }

  console.log("\n5. Testing /api/evolution/providers GET & POST (Canary Test)...");
  const provGetCmd = `npx vercel curl "${targetUrl}/api/evolution/providers" -H "x-tattva-session: ${token}"`;
  const provGetOutput = execSync(provGetCmd, { encoding: "utf-8" });
  console.log("Providers GET Output Sample:\n", provGetOutput.slice(-350));
  if (!provGetOutput.includes('"success":true') || !provGetOutput.includes('"models":')) {
    throw new Error("Providers GET failed: " + provGetOutput);
  }

  const canaryPayload = {
    candidateModel: {
      id: "gemini-canary-verify",
      displayName: "Gemini Canary Staging",
      provider: "google-gemini",
      tier: "fast",
      contextWindowTokens: 1048576,
      costPer1MTokensInUsd: 0.075,
      costPer1MTokensOutUsd: 0.3,
      isAvailable: true,
      consecutiveFailures: 0,
      averageLatencyMs: 360,
      errorRatePercent: 0.08,
      circuitState: "CLOSED",
    },
  };
  fs.writeFileSync("scratch/test-evo-canary.json", JSON.stringify(canaryPayload));
  const canaryCmd = `npx vercel curl ${targetUrl}/api/evolution/providers -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-evo-canary.json"`;
  const canaryOutput = execSync(canaryCmd, { encoding: "utf-8" });
  console.log("Canary POST Output Sample:\n", canaryOutput.slice(-350));
  if (!canaryOutput.includes('"success":true') || !canaryOutput.includes('"recommendation":')) {
    throw new Error("Canary test failed: " + canaryOutput);
  }

  console.log("\n6. Testing /api/evolution/diagnostics GET & POST...");
  const diagPayload = {
    severity: "medium",
    subsystem: "verification_test",
    routeOrFunction: "GET /api/evolution/diagnostics",
    errorMessage: "Automated verification diagnostic event capture",
    reproductionSteps: ["1. Staging deployment verification test."],
    suggestedAction: "Log diagnostic event.",
  };
  fs.writeFileSync("scratch/test-evo-diag.json", JSON.stringify(diagPayload));
  const diagPostCmd = `npx vercel curl ${targetUrl}/api/evolution/diagnostics -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-evo-diag.json"`;
  const diagPostOutput = execSync(diagPostCmd, { encoding: "utf-8" });
  console.log("Diag POST Output Sample:\n", diagPostOutput.slice(-350));
  if (!diagPostOutput.includes('"success":true') || !diagPostOutput.includes('"id":')) {
    throw new Error("Diag POST failed: " + diagPostOutput);
  }

  console.log("\n7. Testing /api/evolution/backups POST (Verify Backup & Rollback Target)...");
  const backupCmd = `npx vercel curl ${targetUrl}/api/evolution/backups -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}"`;
  const backupOutput = execSync(backupCmd, { encoding: "utf-8" });
  console.log("Backup Output Sample:\n", backupOutput.slice(-350));
  if (!backupOutput.includes('"success":true') || !backupOutput.includes('"checksum":')) {
    throw new Error("Backup check failed: " + backupOutput);
  }

  console.log("\n8. Testing /api/evolution/monthly-report GET...");
  const reportCmd = `npx vercel curl "${targetUrl}/api/evolution/monthly-report" -H "x-tattva-session: ${token}"`;
  const reportOutput = execSync(reportCmd, { encoding: "utf-8" });
  console.log("Monthly Report Sample:\n", reportOutput.slice(-350));
  if (!reportOutput.includes('"success":true') || !reportOutput.includes('"platformHealthSummary":')) {
    throw new Error("Monthly Report failed: " + reportOutput);
  }

  console.log("\n9. Testing /evolution UI Route...");
  const uiCmd = `npx vercel curl "${targetUrl}/evolution" -H "x-tattva-session: ${token}"`;
  const uiOutput = execSync(uiCmd, { encoding: "utf-8" });
  console.log("UI Page Byte Length:", uiOutput.length);
  if (!uiOutput.includes("Autonomous Evolution") && !uiOutput.includes("Evolution") && !uiOutput.includes("Maintenance")) {
    throw new Error("Evolution UI failed to load: " + uiOutput.slice(0, 300));
  }

  console.log("\n=======================================================");
  console.log("✅ ALL 9 / 9 PHASE 43 VERIFICATION CHECKS PASSED!");
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
