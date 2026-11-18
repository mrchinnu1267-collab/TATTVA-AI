/**
 * API Verification Harness: Unified Model Registry & Dynamic Execution Planner
 * Tests both Preview and Production endpoints with HMAC authenticated headers.
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
console.log(`  VERIFYING MODEL REGISTRY & EXECUTION PLANNER API: ${targetUrl}`);
console.log(`================================================================================\n`);

function getSigningKey() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY || "tattva-default-super-secret-key-change-in-production-min-32-chars";
  return crypto.createHash("sha256").update(secret).digest();
}

function createAuthCookie(userId, email = "test.engineer@tattva.ai") {
  const payload = {
    userId,
    email: email.toLowerCase().trim(),
    name: email.split("@")[0],
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
      console.log(`  [PASS] Check ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] Check ${total}: ${name}`);
      console.error("         Error:", err.message);
      throw err;
    }
  }

  // 1. Health Check
  await test("GET /api/health responds with healthy status", async () => {
    const res = await fetch(`${targetUrl}/api/health`);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.status === "healthy" || data.status === "ok");
  });

  // 2. Unauthenticated GET /api/models/registry
  await test("GET /api/models/registry without session cookie returns 401", async () => {
    const res = await fetch(`${targetUrl}/api/models/registry`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 3. Authenticated GET /api/models/registry
  const authCookie = createAuthCookie("usr_planner_test", "planner.qa@tattva.ai");
  await test("GET /api/models/registry authenticated returns catalog snapshot", async () => {
    const res = await fetch(`${targetUrl}/api/models/registry`, {
      headers: { Cookie: authCookie },
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.totalModels >= 10, `Expected >= 10 models, got ${data.totalModels}`);
    assert.ok(Array.isArray(data.models));
    assert.ok(data.providers.includes("gemini"));
  });

  // 4. Dynamic Scorer Query (?select=best&intent=reasoning)
  await test("GET /api/models/registry?select=best&intent=reasoning evaluates capability scorer", async () => {
    const res = await fetch(`${targetUrl}/api/models/registry?select=best&intent=reasoning`, {
      headers: { Cookie: authCookie },
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.selectedModel, "Must return selectedModel");
    assert.ok(Array.isArray(data.scoring), "Must return top scoring candidates");
    assert.ok(data.scoring.length > 0);
  });

  // 5. Dynamic Fallback Chain (?chain=true&intent=coding)
  await test("GET /api/models/registry?chain=true&intent=coding returns resilient fallback chain", async () => {
    const res = await fetch(`${targetUrl}/api/models/registry?chain=true&intent=coding`, {
      headers: { Cookie: authCookie },
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.chain));
    assert.ok(data.chain.length >= 2, "Fallback chain must have at least 2 models");
  });

  // 6. Unauthenticated POST /api/agent/plan
  await test("POST /api/agent/plan without session cookie returns 401", async () => {
    const res = await fetch(`${targetUrl}/api/agent/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective: "test goal" }),
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 7. Invalid body POST /api/agent/plan
  await test("POST /api/agent/plan with empty body returns 400", async () => {
    const res = await fetch(`${targetUrl}/api/agent/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  // 8. Valid goal POST /api/agent/plan
  let generatedPlanId = "";
  await test("POST /api/agent/plan with complex goal decomposes into DAG with Kahn tiers", async () => {
    const res = await fetch(`${targetUrl}/api/agent/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        objective: "Analyze financial dataset spreadsheet, compute statistics, and create presentation report with charts",
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.plan.planId, "Must return planId");
    generatedPlanId = data.plan.planId;
    assert.strictEqual(data.plan.isAcyclic, true, "DAG must be verified acyclic");
    assert.ok(data.plan.executionTiers.length >= 3, "Must compute execution tiers");
    // Verify parallel execution tier exists
    const tier1 = data.plan.executionTiers[1];
    assert.ok(tier1.length >= 2, "Tier 1 must contain parallel tasks");
    assert.strictEqual(data.requiresApproval, false);
  });

  // 9. GET /api/agent/plan?planId=...
  await test("GET /api/agent/plan?planId=... retrieves saved execution checkpoint", async () => {
    assert.ok(generatedPlanId, "Requires planId from previous step");
    const res = await fetch(`${targetUrl}/api/agent/plan?planId=${generatedPlanId}`, {
      headers: { Cookie: authCookie },
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.checkpoint, "Must return checkpoint object");
    assert.strictEqual(data.checkpoint.planId, generatedPlanId);
  });

  // 10. Risk Assessment in POST /api/agent/plan
  await test("POST /api/agent/plan detects destructive commands and requires human approval", async () => {
    const res = await fetch(`${targetUrl}/api/agent/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: authCookie },
      body: JSON.stringify({
        objective: "DROP TABLE users_archive and remove all backups",
      }),
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.requiresApproval, true, "Must flag dangerous action for approval");
    assert.ok(data.approvalReasons.length > 0, "Must provide human approval reasons");
  });

  console.log(`\n================================================================================`);
  console.log(`  ALL ${passed} / ${total} CHECKS PASSED ON ${targetUrl}`);
  console.log(`================================================================================\n`);
}

runApiVerification().catch((err) => {
  console.error("API Verification failed:", err);
  process.exit(1);
});
