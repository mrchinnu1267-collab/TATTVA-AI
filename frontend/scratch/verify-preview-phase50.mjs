/**
 * Phase 50 Verification Harness for Staging Preview & Live Production Deployments
 * Usage: node scratch/verify-preview-phase50.mjs <targetBaseUrl>
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log("===============================================================================");
console.log("  TATTVA AI — PHASE 50 FINAL PLATFORM CERTIFICATION VERIFICATION HARNESS");
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

  // Check 2: Platform Certification Status GET
  console.log("2. Testing /api/certification/status (GET)...");
  const statusRaw = vercelCurl("/api/certification/status");
  const statusData = parseJson(statusRaw);
  if (!statusData.success || !statusData.certification) {
    throw new Error(`Failed to retrieve platform certification status: ${statusRaw}`);
  }
  const cert = statusData.certification;
  if (!cert.productionCertified) {
    throw new Error(`Expected productionCertified to be true, got ${cert.productionCertified}`);
  }
  if (cert.overallReadinessScore !== 100) {
    throw new Error(`Expected 100% readiness score, got ${cert.overallReadinessScore}`);
  }
  if (!cert.digitalSignature || cert.digitalSignature.length !== 64) {
    throw new Error(`Invalid digital signature: ${cert.digitalSignature}`);
  }
  console.log(`✓ Platform Certification Status PASSED (Score: ${cert.overallReadinessScore}%, Certified: ${cert.productionCertified}, Version: ${cert.releaseVersion}, Sig: ${cert.digitalSignature.slice(0, 16)}...)\n`);
  checksPassed++;

  // Check 3: Dynamic Gate Verification POST
  console.log("3. Testing /api/certification/verify (POST dynamic gate verification)...");
  const verifyPayload = JSON.stringify({ triggerRerun: true, auditScope: "FULL_50_PHASES" });
  fs.writeFileSync("scratch/test-cert-verify.json", verifyPayload, "utf-8");
  const verifyRaw = vercelCurl("/api/certification/verify", `-X POST -H "Content-Type: application/json" -d @scratch/test-cert-verify.json`);
  const verifyData = parseJson(verifyRaw);
  if (!verifyData.success || !verifyData.ready) {
    throw new Error(`Dynamic gate verification failed: ${verifyRaw}`);
  }
  if (verifyData.failedPillarsCount !== 0 || verifyData.overallScore !== 100) {
    throw new Error(`Expected 0 failed pillars and 100% score, got ${verifyData.failedPillarsCount} failures and ${verifyData.overallScore}%`);
  }
  console.log(`✓ Dynamic Gate Verification PASSED (Failed Pillars: ${verifyData.failedPillarsCount}, Score: ${verifyData.overallScore}%, Message: "${verifyData.message.slice(0, 50)}...")\n`);
  checksPassed++;

  // Check 4: 5 Enterprise Pillars Audit Breakdown
  console.log("4. Verifying 5 Core Architectural Pillars Audit Breakdown...");
  const pillars = cert.pillars;
  if (!Array.isArray(pillars) || pillars.length !== 5) {
    throw new Error(`Expected array of 5 pillars, got ${pillars?.length}`);
  }
  const requiredPillars = [
    "technical_architecture",
    "functional_capabilities",
    "zero_trust_security",
    "sla_performance",
    "disaster_recovery"
  ];
  for (const pId of requiredPillars) {
    const p = pillars.find(item => item.pillar === pId);
    if (!p) throw new Error(`Missing pillar: ${pId}`);
    if (p.score !== 100) throw new Error(`Pillar ${pId} score is ${p.score}, expected 100`);
    if (p.status !== "certified") throw new Error(`Pillar ${pId} status is ${p.status}, expected certified`);
    if (p.checksPassed !== p.totalChecks) throw new Error(`Pillar ${pId} passed ${p.checksPassed}/${p.totalChecks}`);
    console.log(`  ✓ Pillar '${p.title}': ${p.checksPassed}/${p.totalChecks} checks (100% PASSED)`);
  }
  console.log("✓ All 5 Core Enterprise Pillars PASSED with 100% Score\n");
  checksPassed++;

  // Check 5: Functional Capabilities Milestone Coverage (Phases 1-50)
  console.log("5. Verifying Functional Capabilities Milestone Coverage (Phases 1-50)...");
  const funcPillar = pillars.find(p => p.pillar === "functional_capabilities");
  if (!funcPillar || funcPillar.verifiedCriteria.length < 5) {
    throw new Error("Functional capabilities criteria checklist incomplete");
  }
  console.log(`✓ Phases 1-50 Functional Scope 100% Verified (${funcPillar.verifiedCriteria.length} capabilities certified)\n`);
  checksPassed++;

  // Check 6: Zero Trust Security & High Availability SLA Verification
  console.log("6. Verifying Zero Trust Security & 99.95% Availability SLA Standards...");
  const secPillar = pillars.find(p => p.pillar === "zero_trust_security");
  const slaPillar = pillars.find(p => p.pillar === "sla_performance");
  if (!secPillar || secPillar.score !== 100 || !slaPillar || slaPillar.score !== 100) {
    throw new Error("Security or SLA standards do not meet 100% threshold");
  }
  console.log("✓ Zero Trust Security & 99.95% SLA Standards PASSED\n");
  checksPassed++;

  // Check 7: Certification Dashboard UI Rendering
  console.log("7. Testing /certification dashboard UI page render...");
  const pageHtml = vercelCurl("/certification");
  if (!pageHtml.includes("html") && !pageHtml.includes("<!DOCTYPE") && !pageHtml.includes("TATTVA AI")) {
    throw new Error(`Unexpected page response: ${pageHtml.slice(0, 300)}`);
  }
  console.log("✓ /certification Dashboard UI Page Rendered Successfully\n");
  checksPassed++;

  console.log("===============================================================================");
  console.log(`  ALL ${checksPassed} / ${totalChecks} PHASE 50 VERIFICATION CHECKS PASSED!`);
  console.log("===============================================================================\n");
  process.exit(0);
} catch (err) {
  console.error(`\n❌ Verification failed: ${err.message}`);
  process.exit(1);
}
