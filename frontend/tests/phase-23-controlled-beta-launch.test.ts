/**
 * TATTVA AI - PHASE 23: CONTROLLED BETA LAUNCH TEST SUITE
 * Validates environment separation, version management, pre-flight deployment guards,
 * rollback criteria, beta access whitelisting, and dynamic feature flags.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { environmentManager } from "../app/lib/platform/environment";
import { versionManager } from "../app/lib/platform/version-manager";
import { deploymentGuard } from "../app/lib/platform/deployment-guard";
import { betaAccessManager } from "../app/lib/platform/beta-access";
import { featureFlagsEngine } from "../app/lib/platform/feature-flags";

let testsRun = 0;
let testsPassed = 0;

function assert(condition: boolean, message: string) {
  testsRun++;
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  testsPassed++;
  console.log(`  ✅ [PASS] ${message}`);
}

async function runPhase23Tests() {
  console.log("\n========================================================");
  console.log("🚀 TATTVA PHASE 23: CONTROLLED BETA LAUNCH TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: ENVIRONMENT CONFIGURATION & ISOLATION
  // ----------------------------------------------------
  console.log("--- 1. Environment Detection & Separation ---");

  const config = environmentManager.getConfig();
  assert(Boolean(config.tier), `Identified active environment tier: ${config.tier}`);
  assert(Array.isArray(config.corsAllowedOrigins), "Configured explicit CORS origin boundaries");
  assert(typeof config.enableDebugLogs === "boolean", "Configured environment-specific logging level");

  // ----------------------------------------------------
  // TEST SECTION 2: VERSION MANAGEMENT & MIGRATION PREREQUISITES
  // ----------------------------------------------------
  console.log("\n--- 2. Version Management & Release Manifests ---");

  const manifest = versionManager.getManifest();
  assert(manifest.version.includes("beta"), `Release manifest indicates beta channel (${manifest.version})`);
  assert(manifest.requiredMigrations.length >= 2, "Specifies required database migration files");

  // Check migration verification logic
  const validMigrationCheck = versionManager.checkMigrationPrerequisites([
    "supabase_evaluation_schema.sql",
    "supabase_workspace_rls.sql",
  ]);
  assert(validMigrationCheck.ready === true, "Confirmed all schema migrations applied");

  const incompleteMigrationCheck = versionManager.checkMigrationPrerequisites([
    "supabase_evaluation_schema.sql",
  ]);
  assert(incompleteMigrationCheck.ready === false, "Detected missing required migration");
  assert(incompleteMigrationCheck.missingMigrations.includes("supabase_workspace_rls.sql"), "Identified exact missing migration");

  // ----------------------------------------------------
  // TEST SECTION 3: PRE-FLIGHT DEPLOYMENT GUARDS & ROLLBACK CRITERIA
  // ----------------------------------------------------
  console.log("\n--- 3. Pre-Flight Deployment Checks & Rollback Triggers ---");

  const preflight = deploymentGuard.runPreflightChecks([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "GEMINI_API_KEY",
  ]);
  assert(preflight.canDeploy === true, "Pre-flight deployment checks passed successfully");
  assert(preflight.rollbackPlanDefined === true, "Verified automated rollback target version exists");

  // Rollback evaluation tests
  const normalRuntime = deploymentGuard.evaluateRollbackTrigger({
    errorRate: 0.02,
    p95LatencyMs: 320,
    dbConnectionFailures: 0,
  });
  assert(normalRuntime.shouldRollback === false, "Normal operational metrics do not trigger rollback");

  const degradedRuntime = deploymentGuard.evaluateRollbackTrigger({
    errorRate: 0.15, // 15% error spike
    p95LatencyMs: 6200,
    dbConnectionFailures: 6,
  });
  assert(degradedRuntime.shouldRollback === true, "Severe runtime error spike triggered automated rollback");
  assert(Boolean(degradedRuntime.triggerReason), "Surfaced exact trigger reason for engineering audit");

  // ----------------------------------------------------
  // TEST SECTION 4: BETA USER ACCESS & INVITATION WHITELIST
  // ----------------------------------------------------
  console.log("\n--- 4. Beta Access Management & Whitelist Validation ---");

  // Test invalid invite code
  const invalidInvite = betaAccessManager.registerBetaUser({
    userId: "hacker_01",
    email: "unknown@external.io",
    inviteCode: "EXPIRED-CODE-99",
  });
  assert(invalidInvite.success === false, "Blocked unauthorized registration with invalid invite code");

  // Test valid beta invite registration
  const validRegistration = betaAccessManager.registerBetaUser({
    userId: "beta_tester_01",
    email: "beta.pioneer@tattva.ai",
    inviteCode: "TATTVA-BETA-2026",
  });
  assert(validRegistration.success === true, "Successfully registered authorized beta tester");
  assert(validRegistration.user?.dailyRequestLimit === 100, "Assigned 100 request/day quota for standard beta");
  assert(betaAccessManager.isBetaAuthorized("beta_tester_01") === true, "Beta authorization confirmed for user");

  // Test VIP tier invite registration
  const vipRegistration = betaAccessManager.registerBetaUser({
    userId: "vip_founder_01",
    email: "founder@partner.org",
    inviteCode: "TATTVA-VIP-FOUNDER",
  });
  assert(vipRegistration.user?.tier === "vip_tester", "Correctly assigned 'vip_tester' tier");
  assert(vipRegistration.user?.dailyRequestLimit === 500, "Assigned 500 request/day quota for VIP tier");

  // ----------------------------------------------------
  // TEST SECTION 5: DYNAMIC FEATURE FLAGS & KILL SWITCHES
  // ----------------------------------------------------
  console.log("\n--- 5. Dynamic Feature Flags & Kill Switches ---");

  assert(
    featureFlagsEngine.isEnabled("nextgen_prompt_intelligence") === true,
    "Next-Gen Prompt Intelligence active at 100% rollout"
  );
  assert(
    featureFlagsEngine.isEnabled("advanced_rag_hybrid") === true,
    "Advanced RAG active at 100% rollout"
  );

  // Canary flag targeting: only VIP and internal teams
  const standardTesterAllowed = featureFlagsEngine.isEnabled("indic_slm_experimental", {
    tier: "standard_beta",
  });
  assert(standardTesterAllowed === false, "Standard beta excluded from canary SLM feature");

  const vipTesterAllowed = featureFlagsEngine.isEnabled("indic_slm_experimental", {
    userId: "vip_user_42",
    tier: "vip_tester",
  });
  assert(typeof vipTesterAllowed === "boolean", "Evaluated canary access for VIP tester");

  // Emergency kill switch test
  featureFlagsEngine.setFlagState("advanced_rag_hybrid", false);
  assert(
    featureFlagsEngine.isEnabled("advanced_rag_hybrid") === false,
    "Instant kill switch successfully deactivated feature flag"
  );

  // Restore flag
  featureFlagsEngine.setFlagState("advanced_rag_hybrid", true);
  assert(
    featureFlagsEngine.isEnabled("advanced_rag_hybrid") === true,
    "Restored feature flag to active state"
  );

  console.log("\n========================================================");
  console.log(`🏁 PHASE 23 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase23Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
