/**
 * Live Verification Harness: Platform Completeness API Routes
 * Verifies public status and authenticated audit endpoints across 15 dimensions.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import assert from "node:assert/strict";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

const targetUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
console.log(`\n================================================================================`);
console.log(`  VERIFYING PLATFORM COMPLETENESS API ENDPOINTS: ${targetUrl}`);
console.log(`================================================================================\n`);

function getSigningKey() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY || "tattva-default-super-secret-key-change-in-production-min-32-chars";
  return crypto.createHash("sha256").update(secret).digest();
}

function createAuthCookie(userId, email = "auditor.lead@tattva.ai") {
  const payload = {
    userId,
    email: email.toLowerCase().trim(),
    name: "Platform Auditor",
    timestamp: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    verified: true,
  };
  const key = getSigningKey();
  const serialized = JSON.stringify(payload);
  const base64Payload = Buffer.from(serialized).toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(base64Payload).digest("base64url");
  return `tattva_session=${base64Payload}.${signature}`;
}

async function runApiVerification() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] API Check ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] API Check ${total}: ${name}`);
      console.error("         Error:", err.message);
      throw err;
    }
  }

  // 1. Health check
  await test("GET /api/health responds with 200", async () => {
    const res = await fetch(`${targetUrl}/api/health`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.status === "healthy" || data.status === "ok");
  });

  // 2. Public Status Endpoint
  await test("GET /api/platform-completeness/status returns 15-dimension summary", async () => {
    const res = await fetch(`${targetUrl}/api/platform-completeness/status`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.status.totalDimensions, 15);
    assert.strictEqual(data.status.verifiedDimensions, 15);
    assert.strictEqual(data.status.overallStatus, "CERTIFIED");
    assert.ok(data.status.certificationScore >= 90);
    assert.strictEqual(data.status.dimensions.length, 15);
  });

  // 3. Unauthenticated Audit Endpoint
  await test("GET /api/platform-completeness/audit without session returns 401", async () => {
    const res = await fetch(`${targetUrl}/api/platform-completeness/audit`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 4. Authenticated Audit Endpoint
  const authCookie = createAuthCookie("usr_lead_auditor", "auditor.lead@tattva.ai");
  await test("GET /api/platform-completeness/audit authenticated returns comprehensive report", async () => {
    const res = await fetch(`${targetUrl}/api/platform-completeness/audit`, {
      headers: { Cookie: authCookie },
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.report, "Must return report object");
    assert.strictEqual(data.report.totalDimensions, 15);
    assert.strictEqual(data.report.verifiedDimensions, 15);
    assert.strictEqual(data.report.overallStatus, "CERTIFIED");

    // Verify key findings exist
    const findings = data.report.findings;
    assert.ok(findings.ai_accuracy_evaluation);
    assert.ok(findings.security_penetration_testing);
    assert.ok(findings.privacy_consent_retention);
    assert.ok(findings.database_migration_safety);
    assert.ok(findings.backup_restoration_disaster_recovery);
    assert.ok(findings.performance_scalability_load);
    assert.ok(findings.cost_usage_management);
    assert.ok(findings.agent_permission_boundaries);
    assert.ok(findings.regulatory_compliance);
    assert.ok(findings.incident_response_monitoring);
    assert.ok(findings.accessibility_ux_acceptance);
    assert.ok(findings.api_versioning_compatibility);
    assert.ok(findings.supply_chain_security);
    assert.ok(findings.capacity_infrastructure_planning);
    assert.ok(findings.business_continuity_recovery);
  });

  console.log(`\n================================================================================`);
  console.log(`  ALL ${passed} / ${total} PLATFORM COMPLETENESS API CHECKS PASSED ON ${targetUrl}`);
  console.log(`================================================================================\n`);
}

runApiVerification().catch((err) => {
  console.error("API Verification failed:", err);
  process.exit(1);
});
