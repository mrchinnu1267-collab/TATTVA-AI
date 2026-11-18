/**
 * Phase 47 Comprehensive Test Suite: Data Governance & Lifecycle Management
 * Tests RetentionManager, ExportManager, PurgeManager, AccessAuditor, tenant isolation, and Tool Registry.
 */

import assert from "node:assert";
import { DataGovernanceEngine } from "../app/lib/data-governance/index.js";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.js";

async function runPhase47Tests() {
  console.log("=== STARTING PHASE 47 DATA GOVERNANCE & LIFECYCLE MANAGEMENT TEST SUITE ===");

  const engine = DataGovernanceEngine.getInstance();
  assert.ok(engine, "DataGovernanceEngine must be instantiated");

  // 1. Data Retention Policy Management
  console.log("\n[Test 1] Data Retention Policy & Expiration Evaluation...");
  const defaultPolicy = engine.getRetentionPolicy("default");
  assert.strictEqual(defaultPolicy.chatRetentionDays, 90, "Default chat retention should be 90 days");
  assert.strictEqual(defaultPolicy.documentRetentionDays, 365, "Default doc retention should be 365 days");

  const updatedPolicy = engine.updateRetentionPolicy("default", {
    chatRetentionDays: 60,
    researchRetentionDays: 120,
  });
  assert.strictEqual(updatedPolicy.chatRetentionDays, 60, "Updated chat retention should be 60 days");
  assert.strictEqual(updatedPolicy.researchRetentionDays, 120, "Updated research retention should be 120 days");

  // Test expired item evaluation
  const now = Date.now();
  const dayMs = 86400000;
  const sampleRecords = [
    { id: "chat_fresh", type: "chat", createdAt: now - 10 * dayMs },     // 10 days old (retained)
    { id: "chat_expired", type: "chat", createdAt: now - 80 * dayMs },   // 80 days old (expired under 60-day rule)
    { id: "doc_fresh", type: "document", createdAt: now - 30 * dayMs },   // 30 days old (retained)
    { id: "doc_expired", type: "document", createdAt: now - 400 * dayMs },// 400 days old (expired under 365-day rule)
  ];

  const evalResult = engine.evaluateExpiredRecords(sampleRecords, "default");
  assert.strictEqual(evalResult.expired.length, 2, "Exactly 2 records should be expired");
  assert.ok(evalResult.expired.some((r) => r.id === "chat_expired"));
  assert.ok(evalResult.expired.some((r) => r.id === "doc_expired"));
  assert.strictEqual(evalResult.retained.length, 2, "Exactly 2 records should be retained");
  console.log("  ✓ Retention policy updated and expired records accurately isolated");

  // 2. GDPR & CCPA Self-Service Data Export
  console.log("\n[Test 2] GDPR / CCPA Self-Service Data Export Archive...");
  const user1 = "usr_p47_alpha";
  const user2 = "usr_p47_beta";

  const exportArchive = await engine.requestExport({
    userId: user1,
    userEmail: "alpha@tattva.ai",
    format: "json",
  });

  assert.ok(exportArchive.exportId.startsWith("exp_"), "Export ID should start with exp_");
  assert.strictEqual(exportArchive.status, "ready", "Status should be ready");
  assert.ok(exportArchive.dataPayload, "Archive payload must be present");
  assert.ok(exportArchive.dataPayload.exportMetadata.sha256Checksum.length === 64, "SHA-256 checksum must be 64 hex chars");
  assert.strictEqual(exportArchive.dataPayload.exportMetadata.gdprCompliant, true);
  assert.strictEqual(exportArchive.dataPayload.exportMetadata.ccpaCompliant, true);
  assert.ok(Array.isArray(exportArchive.dataPayload.conversations), "Conversations must be an array");
  console.log("  ✓ Export bundle generated with valid SHA-256 checksum:", exportArchive.exportId);

  // 3. Cross-Tenant Privacy Barrier for Exports
  console.log("\n[Test 3] Cross-Tenant Privacy Boundary on Exports...");
  const exportUser1 = engine.getExport(exportArchive.exportId, user1);
  assert.ok(exportUser1, "User 1 must be able to retrieve their export");

  const exportUser2 = engine.getExport(exportArchive.exportId, user2);
  assert.strictEqual(exportUser2, null, "User 2 MUST NOT be able to retrieve User 1's export");
  console.log("  ✓ Cross-tenant privacy boundary verified on export retrieval");

  // 4. "Right to be Forgotten" Account Purge
  console.log("\n[Test 4] Right to be Forgotten (Account Purge)...");
  const purgeReq = await engine.requestPurge({
    userId: user1,
    userEmail: "alpha@tattva.ai",
  });

  assert.ok(purgeReq.requestId.startsWith("prg_"), "Purge request ID should start with prg_");
  assert.strictEqual(purgeReq.status, "pending_confirmation", "Initial status must be pending_confirmation");
  assert.strictEqual(purgeReq.confirmationCode.length, 6, "Confirmation code must be 6 digits");
  assert.ok(purgeReq.auditHash.length === 64, "Initial audit hash must be SHA-256");

  // Negative test: invalid confirmation code
  const failedPurge = await engine.confirmPurge({
    requestId: purgeReq.requestId,
    confirmationCode: "000000",
    requestingUserId: user1,
  });
  assert.strictEqual(failedPurge.success, false, "Invalid code should fail");

  // Positive test: valid confirmation code
  const confirmedPurge = await engine.confirmPurge({
    requestId: purgeReq.requestId,
    confirmationCode: purgeReq.confirmationCode,
    requestingUserId: user1,
  });
  assert.strictEqual(confirmedPurge.success, true, "Purge should succeed with valid code");
  assert.strictEqual(confirmedPurge.request.status, "purged", "Status must be updated to purged");
  assert.ok(confirmedPurge.request.purgedAt > 0, "Purged timestamp must be set");
  console.log("  ✓ Purge multi-step confirmation succeeded and cryptographic audit hash updated:", confirmedPurge.request.auditHash.slice(0, 16));

  // 5. Governance Access Auditing & Metrics
  console.log("\n[Test 5] Access Audit Trails & Governance Metrics...");
  const auditLogs = engine.listAuditLogs({ actorId: user1 });
  assert.ok(auditLogs.length >= 2, "Audit logs should record export and purge actions for user1");
  assert.ok(auditLogs.some((l) => l.action === "export"), "Export action must be logged");
  assert.ok(auditLogs.some((l) => l.action === "purge"), "Purge action must be logged");

  const metrics = engine.getMetrics();
  assert.ok(metrics.totalAuditedEvents >= 3, "Total audited events should be recorded");
  console.log(`  ✓ Audit trail logged ${metrics.totalAuditedEvents} governance events`);

  // 6. Centralized Tool Registry Integration
  console.log("\n[Test 6] Tool Registry Verification for Phase 47 Tools...");
  const toolRetention = centralizedToolRegistry.getTool("get_data_retention_policy");
  assert.ok(toolRetention, "Tool 'get_data_retention_policy' must be registered");

  const toolExport = centralizedToolRegistry.getTool("export_user_data");
  assert.ok(toolExport, "Tool 'export_user_data' must be registered");

  const toolPurge = centralizedToolRegistry.getTool("request_account_purge");
  assert.ok(toolPurge, "Tool 'request_account_purge' must be registered");

  const execContext = {
    userId: "agent_tester_p47",
    userEmail: "tester_p47@tattva.ai",
    roles: ["user"],
    sessionId: "sess_p47",
    workspaceId: "ws_p47",
  };

  // Test Tool: get_data_retention_policy
  const retExec = await toolRetention.execute({}, execContext);
  assert.strictEqual(retExec.success, true, "Tool get_data_retention_policy should succeed");
  assert.ok(retExec.output.chatRetentionDays > 0);

  // Test Tool: export_user_data
  const expExec = await toolExport.execute({ format: "json" }, execContext);
  assert.strictEqual(expExec.success, true, "Tool export_user_data should succeed");
  assert.ok(expExec.output.exportId.startsWith("exp_"));
  assert.strictEqual(expExec.output.status, "ready");

  // Test Tool: request_account_purge (request)
  const purgeExec1 = await toolPurge.execute({ action: "request" }, execContext);
  assert.strictEqual(purgeExec1.success, true, "Tool request_account_purge (request) should succeed");
  assert.ok(purgeExec1.output.requestId.startsWith("prg_"));
  assert.strictEqual(purgeExec1.output.confirmationCodeRequired, true);

  console.log("  ✓ All 3 Phase 47 tools successfully executed via Centralized Tool Registry!");
  console.log("\n=== ALL PHASE 47 TESTS PASSED SUCCESSFULLY! ===");
}

runPhase47Tests().catch((err) => {
  console.error("Phase 47 Test Error:", err);
  process.exit(1);
});
