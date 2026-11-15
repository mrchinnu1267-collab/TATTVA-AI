/**
 * TATTVA AI - Phase 39: Enterprise Reliability & Operations Test Suite
 * Validates:
 * 1. Multi-tenant safe caching (zero cross-account cache leakage)
 * 2. Statistical latency percentiles computation (p50, p90, p95, p99)
 * 3. AI token & cost governance with budget cap enforcement
 * 4. Alerting on budget depletion without silent expensive model switches
 * 5. Disaster recovery and P1/P2 rollback playbooks
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "../.env.local" });

import assert from "node:assert";
import { enterpriseOperationsHub } from "../app/lib/operations/enterprise-telemetry";

export async function runPhase39EnterpriseReliabilityTests() {
  console.log("\n====================================================================");
  console.log("   TATTVA AI - PHASE 39: ENTERPRISE RELIABILITY & OPS TESTS         ");
  console.log("====================================================================\n");

  // ---------------------------------------------------------------------------
  // Test 1: Multi-Tenant Safe Caching (No Cross-Account Leakage)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Multi-tenant safe caching & cross-account isolation...");
  const userA = "usr_tenant_alice";
  const userB = "usr_tenant_bob";

  enterpriseOperationsHub.setTenantCache(userA, "confidential_project_summary", {
    project: "TATTVA Proprietary AI Core",
    secretValue: 98765,
  });

  // User B attempts to read the same cache key
  const leakAttempt = enterpriseOperationsHub.getTenantCache(userB, "confidential_project_summary");
  assert.strictEqual(leakAttempt, null, "User B must NOT access User A's cached data");

  // User A reads their own cache
  const aliceData = enterpriseOperationsHub.getTenantCache(userA, "confidential_project_summary");
  assert.ok(aliceData, "User A must retrieve their own cached data");
  assert.strictEqual((aliceData as any).secretValue, 98765);
  console.log("  ✔ Test 1: Multi-tenant cache strictly isolated with zero cross-account leakage.");

  // ---------------------------------------------------------------------------
  // Test 2: Statistical Latency Percentiles Computation
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Statistical latency percentiles computation (p50, p95, p99)...");
  const testLatencies = [120, 180, 210, 240, 280, 310, 350, 420, 500, 890, 1400, 2200];
  for (const lat of testLatencies) {
    enterpriseOperationsHub.recordLatency(lat);
  }

  const metrics = enterpriseOperationsHub.getLatencyMetrics();
  assert.ok(metrics.p50Ms > 0, "p50 must be computed");
  assert.ok(metrics.p90Ms >= metrics.p50Ms, "p90 must be >= p50");
  assert.ok(metrics.p95Ms >= metrics.p90Ms, "p95 must be >= p90");
  assert.ok(metrics.p99Ms >= metrics.p95Ms, "p99 must be >= p95");
  console.log(`  ✔ Test 2: Latency percentiles computed (p50: ${metrics.p50Ms}ms, p95: ${metrics.p95Ms}ms, p99: ${metrics.p99Ms}ms).`);

  // ---------------------------------------------------------------------------
  // Test 3: AI Token & Cost Governance Tracking
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: AI token consumption & cost audit tracking...");
  const costAudit = enterpriseOperationsHub.trackTaskCost(
    "task_12345",
    userA,
    "gemini-3.5-flash-lite",
    "google",
    1200, // input tokens
    450   // output tokens
  );

  assert.strictEqual(costAudit.totalTokens, 1650);
  assert.ok(costAudit.estimatedCostUsd > 0, "Estimated cost must be non-zero");
  assert.ok(costAudit.estimatedCostUsd < 0.01, "Gemini 3.5 Flash Lite cost should be sub-penny");
  console.log(`  ✔ Test 3: Task cost computed: $${costAudit.estimatedCostUsd} for ${costAudit.totalTokens} tokens.`);

  // ---------------------------------------------------------------------------
  // Test 4: Budget Cap Enforcement & Runaway Spending Prevention
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Budget cap enforcement & runaway spending protection...");
  const budgetUser = "usr_budget_limited";
  enterpriseOperationsHub.setUserBudgetCap(budgetUser, 0.05); // Strict $0.05 cap

  // Normal request within budget
  const initialCheck = enterpriseOperationsHub.evaluateBudgetCap(budgetUser, 0.01);
  assert.strictEqual(initialCheck.allowed, true, "Spending within cap must be permitted");

  // Exhaust budget
  enterpriseOperationsHub.trackTaskCost("task_heavy_1", budgetUser, "claude-3-5-sonnet-20241022", "anthropic", 25000, 15000);

  const blockedCheck = enterpriseOperationsHub.evaluateBudgetCap(budgetUser, 0.02);
  assert.strictEqual(blockedCheck.allowed, false, "Spending exceeding cap must be blocked");
  assert.strictEqual(blockedCheck.alertTriggered, true, "Budget depletion alert must trigger");
  console.log("  ✔ Test 4: Budget cap strictly enforced; runaway expense prevented.");

  // ---------------------------------------------------------------------------
  // Test 5: Disaster Recovery & Rollback Playbook Verification
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Disaster recovery & P1/P2 rollback playbook verification...");
  const p1Playbook = enterpriseOperationsHub.verifyDisasterRecoveryPlaybook("P1");
  assert.strictEqual(p1Playbook.targetRTOSeconds, 60, "P1 RTO must be <= 60 seconds");
  assert.ok(p1Playbook.escalationContact.includes("kotapati Gowtham Chowdary"), "Must escalate P1 to Lead AI Architect");

  const p2Playbook = enterpriseOperationsHub.verifyDisasterRecoveryPlaybook("P2");
  assert.strictEqual(p2Playbook.targetRTOSeconds, 300, "P2 RTO must be <= 300 seconds");
  assert.ok(p2Playbook.rollbackStep.includes("down.sql"), "Must have database rollback script");
  console.log("  ✔ Test 5: Disaster recovery playbooks verified for P1 critical and P2 migration incidents.");

  console.log("\n====================================================================");
  console.log("   ALL 5 PHASE 39 ENTERPRISE RELIABILITY TESTS PASSED!              ");
  console.log("====================================================================\n");
}

if (process.argv[1]?.endsWith("phase-39-enterprise-reliability.test.ts")) {
  runPhase39EnterpriseReliabilityTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
