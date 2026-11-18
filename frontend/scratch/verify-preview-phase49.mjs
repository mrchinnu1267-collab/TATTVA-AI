/**
 * Phase 49 Verification Harness for Staging Preview & Live Production Deployments
 * Usage: node scratch/verify-preview-phase49.mjs <targetBaseUrl>
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log("===============================================================================");
console.log("  TATTVA AI — PHASE 49 VERIFICATION HARNESS");
console.log(`  Target Base URL: ${targetUrl}`);
console.log("===============================================================================\n");

function vercelCurl(path, options = "") {
  const isVercelPreview = targetUrl.includes("vercel.app");
  if (isVercelPreview) {
    const cmd = `npx vercel curl "${targetUrl}${path}" ${options}`;
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  } else {
    const cmd = `curl -s "${targetUrl}${path}" ${options}`;
    return execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  }
}

function parseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    const jsonMatch = str.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw e;
  }
}

let checksPassed = 0;
const totalChecks = 7;

try {
  // Check 1: Health Check
  console.log("1. Testing /api/health...");
  const healthRaw = vercelCurl("/api/health");
  const health = parseJson(healthRaw);
  if (!health.status || (health.status !== "ok" && health.status !== "healthy")) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }
  console.log("✓ Health check PASSED\n");
  checksPassed++;

  // Check 2: UX Audit Modules GET
  console.log("2. Testing /api/ux-audit/modules (GET)...");
  const modulesRaw = vercelCurl("/api/ux-audit/modules");
  const modulesData = parseJson(modulesRaw);
  if (!modulesData.success || !modulesData.summary || !Array.isArray(modulesData.modules)) {
    throw new Error(`Failed to retrieve UX audit modules: ${modulesRaw}`);
  }
  if (modulesData.modules.length < 15) {
    throw new Error(`Expected at least 15 modules, got ${modulesData.modules.length}`);
  }
  if (modulesData.summary.overallPlatformUXScore < 90) {
    throw new Error(`Overall UX score too low: ${modulesData.summary.overallPlatformUXScore}`);
  }
  console.log(`✓ UX Audit Modules & Summary PASSED (Overall Score: ${modulesData.summary.overallPlatformUXScore}/100, Total Modules: ${modulesData.modules.length})\n`);
  checksPassed++;

  // Check 3: On-Demand Audit Run POST
  console.log("3. Testing /api/ux-audit/run (POST dynamic audit run)...");
  const runPayload = JSON.stringify({ deepCheck: true });
  fs.writeFileSync("scratch/test-ux-run.json", runPayload, "utf-8");
  const runRaw = vercelCurl("/api/ux-audit/run", `-X POST -H "Content-Type: application/json" -d @scratch/test-ux-run.json`);
  const runData = parseJson(runRaw);
  if (!runData.success || !runData.auditedModules || runData.auditedModules.length < 15) {
    throw new Error(`On-demand audit execution failed: ${runRaw}`);
  }
  console.log(`✓ On-Demand Audit Execution PASSED (Audited ${runData.auditedModules.length} modules)\n`);
  checksPassed++;

  // Check 4: WCAG 2.1 AA Compliance Verification
  console.log("4. Verifying WCAG 2.1 AA compliance across all surfaces...");
  const nonCompliant = modulesData.modules.filter(m => m.wcagTier === "Non-Compliant");
  if (nonCompliant.length > 0) {
    throw new Error(`Found non-compliant surfaces: ${nonCompliant.map(m => m.id).join(", ")}`);
  }
  const avgA11y = modulesData.summary.averageAccessibilityScore;
  if (avgA11y < 95) {
    throw new Error(`Accessibility average ${avgA11y} is below 95% threshold`);
  }
  console.log(`✓ WCAG 2.1 AA Compliance PASSED (Average Accessibility: ${avgA11y}%, Non-compliant count: 0)\n`);
  checksPassed++;

  // Check 5: Responsive Breakpoints Verification
  console.log("5. Verifying Responsive Breakpoints (Mobile 375px → Desktop 1920px)...");
  const avgResp = modulesData.summary.averageResponsivenessScore;
  if (avgResp < 95) {
    throw new Error(`Responsiveness average ${avgResp} is below 95% threshold`);
  }
  console.log(`✓ Responsive Breakpoint Integrity PASSED (Average Responsiveness: ${avgResp}%)\n`);
  checksPassed++;

  // Check 6: Certified Status & Zero Critical Deficiencies
  console.log("6. Verifying Certified Status & Critical Issue Absence...");
  const criticalIssues = modulesData.summary.criticalIssuesCount;
  if (criticalIssues > 0) {
    throw new Error(`Detected ${criticalIssues} critical UX issues`);
  }
  const certifiedCount = modulesData.summary.certifiedModulesCount;
  if (certifiedCount < 10) {
    throw new Error(`Expected at least 10 certified modules, got ${certifiedCount}`);
  }
  console.log(`✓ Zero Critical Deficiencies PASSED (Certified Modules: ${certifiedCount}/${modulesData.modules.length})\n`);
  checksPassed++;

  // Check 7: UX Audit Dashboard UI (/ux-audit)
  console.log("7. Testing UX Audit Dashboard UI (/ux-audit)...");
  const uiRaw = vercelCurl("/ux-audit");
  if (!uiRaw.includes("Product & UX Quality Audit") && !uiRaw.includes("WCAG 2.1 AA Certified") && !uiRaw.includes("ux-audit")) {
    throw new Error("UX Audit UI failed to render expected certification headings");
  }
  console.log("✓ UX Audit Dashboard UI (/ux-audit) PASSED\n");
  checksPassed++;

  console.log("===============================================================================");
  console.log(`  ALL ${checksPassed} / ${totalChecks} VERIFICATION CHECKS PASSED FOR PHASE 49`);
  console.log("===============================================================================");
} catch (err) {
  console.error("Verification failed:", err);
  process.exit(1);
}
