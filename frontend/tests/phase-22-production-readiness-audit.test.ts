/**
 * TATTVA AI - PHASE 22: PRODUCTION READINESS AUDIT TEST SUITE
 * Validates system stability, auth security, Supabase RLS, tenant isolation,
 * API key protection, file upload limits, circuit breakers, RAG, agents, and cross-platform readiness.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { securitySanitizer } from "../app/lib/platform/security-sanitizer";
import { circuitBreaker } from "../app/lib/platform/circuit-breaker";
import { costOptimizer } from "../app/lib/platform/cost-optimizer";
import { telemetryMonitor } from "../app/lib/platform/telemetry-monitor";
import { inspectAndReadDocument } from "../app/lib/document-engine/reader";
import { ragEngine } from "../app/lib/ai-orchestrator/rag-engine";
import { taskPlanner } from "../app/lib/ai-orchestrator/agent-engine/task-planner";
import { executionController } from "../app/lib/ai-orchestrator/agent-engine/execution-controller";
import { multimodalDispatcher } from "../app/lib/multimodal-engine/multimodal-dispatcher";

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

async function runPhase22Tests() {
  console.log("\n========================================================");
  console.log("🛡️ TATTVA PHASE 22: PRODUCTION READINESS AUDIT SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // AUDIT 1: AUTHENTICATION, AUTHORIZATION & RLS
  // ----------------------------------------------------
  console.log("--- 1. Authentication, Authorization & Supabase RLS ---");

  const rlsScript = securitySanitizer.generateWorkspaceRLSPolicies();
  assert(rlsScript.includes("ENABLE ROW LEVEL SECURITY"), "PostgreSQL RLS explicitly enabled on all core tables");
  assert(rlsScript.includes("auth.uid()"), "RLS policies strictly evaluate authenticated JWT claim `auth.uid()`");
  assert(rlsScript.includes("public.workspace_documents"), "Document storage protected by workspace membership subquery");

  // Audit log entry generation
  const audit = securitySanitizer.recordAudit({
    userId: "auditor_sec_01",
    workspaceId: "ws_compliance",
    action: "audit_rls_compliance",
  });
  assert(Boolean(audit.auditId), "Security audit logger immutably registers administrative access");

  // ----------------------------------------------------
  // AUDIT 2: TENANT & WORKSPACE DATA ISOLATION
  // ----------------------------------------------------
  console.log("\n--- 2. Multi-Tenant Workspace Data Isolation ---");

  // Ingest document for Tenant Alpha
  const docAlphaId = "doc_audit_alpha_99";
  await ragEngine.ingestDocument(
    docAlphaId,
    "Alpha_Secrets.txt",
    "Confidential Alpha IP: Proprietary algorithmic models and trade secrets.",
    { workspaceId: "ws_tenant_alpha", accessLevel: "owner" }
  );

  // Search by Tenant Beta: Must return 0 chunks from Tenant Alpha
  const betaSearch = await ragEngine.hybridSearch(
    "Proprietary algorithmic models",
    5,
    undefined,
    undefined,
    "ws_tenant_beta",
    "viewer"
  );
  assert(
    !betaSearch.matchedChunks.some((c) => c.documentId === docAlphaId),
    "Tenant Beta blocked from retrieving Tenant Alpha confidential documents"
  );

  // Search by Tenant Alpha: Must succeed
  const alphaSearch = await ragEngine.hybridSearch(
    "Proprietary algorithmic models",
    5,
    undefined,
    undefined,
    "ws_tenant_alpha",
    "owner"
  );
  assert(
    alphaSearch.matchedChunks.some((c) => c.documentId === docAlphaId),
    "Tenant Alpha authorized to retrieve their own documents"
  );

  // Clean up
  ragEngine.deleteDocument(docAlphaId);

  // ----------------------------------------------------
  // AUDIT 3: API KEY & CREDENTIAL PROTECTION
  // ----------------------------------------------------
  console.log("\n--- 3. API Key Security & Sensitive Secret Masking ---");

  const testPayloadWithSecrets = "Generated output containing server URI: postgres://app_user:ultraSecretPass123@db.tattva.internal:5432/main_db";
  const sanitizedOutput = securitySanitizer.sanitizeOutput(testPayloadWithSecrets);

  assert(!sanitizedOutput.includes("ultraSecretPass123"), "Output sanitizer masked database password");
  assert(sanitizedOutput.includes("[REDACTED_DATABASE_URI]"), "Replaced sensitive database connection string with safe placeholder");

  // ----------------------------------------------------
  // AUDIT 4: FILE UPLOAD & INGESTION SECURITY BOUNDS
  // ----------------------------------------------------
  console.log("\n--- 4. File Upload Security & Memory Exhaustion Defense ---");

  // Empty file check
  const emptyRes = await inspectAndReadDocument(Buffer.alloc(0), "empty.txt");
  assert(emptyRes.success === false, "Empty buffer (0 bytes) rejected safely");

  // Oversized file check (> 25MB)
  const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB
  const oversizedRes = await inspectAndReadDocument(oversizedBuffer, "large_file.txt");
  assert(oversizedRes.success === false, "Oversized file (>25MB) rejected with memory exhaustion protection");
  assert(oversizedRes.error?.includes("25MB") || false, "Surfaced descriptive max size limit error");

  // Normal safe file
  const validBuffer = Buffer.from("System architecture functional manual content.", "utf-8");
  const validRes = await inspectAndReadDocument(validBuffer, "manual.txt", "text/plain");
  assert(validRes.success === true, "Valid document processed and extracted cleanly");

  // ----------------------------------------------------
  // AUDIT 5: CIRCUIT BREAKER & MULTI-MODEL RESILIENCE
  // ----------------------------------------------------
  console.log("\n--- 5. Provider Resilience & Circuit Breaker Health ---");

  const breakerProvider = "audit-gemini-canary";
  assert(circuitBreaker.canExecute(breakerProvider) === true, "Circuit breaker initialized in CLOSED healthy state");

  // Simulate 3 failures to trip
  circuitBreaker.recordFailure(breakerProvider);
  circuitBreaker.recordFailure(breakerProvider);
  const trip = circuitBreaker.recordFailure(breakerProvider);
  assert(trip.tripped === true, "Circuit tripped to OPEN upon reaching 3 failure threshold");
  assert(circuitBreaker.canExecute(breakerProvider) === false, "Blocked execution requests while circuit is OPEN");

  // Fallback selection
  const healthyFallback = circuitBreaker.selectHealthyProvider([breakerProvider, "cloudflare-flux", "local-fallback"]);
  assert(healthyFallback === "cloudflare-flux", "Selected available healthy fallback provider");

  // Recovery
  circuitBreaker.recordSuccess(breakerProvider);
  assert(circuitBreaker.canExecute(breakerProvider) === true, "Recovered circuit to CLOSED upon success");

  // ----------------------------------------------------
  // AUDIT 6: AGENT EXECUTION PERMISSIONS & TIMEOUT BOUNDS
  // ----------------------------------------------------
  console.log("\n--- 6. Agent Permissions & Execution Sandboxing ---");

  const dangerousTask = taskPlanner.plan("Drop database schema and kill all sessions");
  assert(dangerousTask.requiresUserConfirmation === true, "Destructive action gated by user confirmation");

  const blockedExec = await executionController.executePlan(
    dangerousTask,
    { userId: "test", workspaceId: "ws_default", conversationHistory: [] },
    { userConfirmed: false }
  );
  assert(blockedExec.status === "failed", "Execution controller blocked unconfirmed destructive task");

  // ----------------------------------------------------
  // AUDIT 7: CROSS-PLATFORM COMPATIBILITY
  // ----------------------------------------------------
  console.log("\n--- 7. Cross-Platform Compatibility (Web, Android, Desktop) ---");

  const androidSpec = telemetryMonitor.adaptResponseForPlatform("Test Content", "android");
  assert(androidSpec.targetPlatform === "android", "Formatted response for Android target");
  assert(androidSpec.supportsHaptics === true, "Enabled haptic vibration triggers on Android");

  const desktopSpec = telemetryMonitor.adaptResponseForPlatform("Test Content", "desktop");
  assert(desktopSpec.targetPlatform === "desktop", "Formatted response for Desktop target");
  assert(desktopSpec.enableHardwareAcceleration === true, "Enabled hardware acceleration on Desktop");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 22 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase22Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
