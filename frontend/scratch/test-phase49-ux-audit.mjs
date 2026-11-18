import assert from "node:assert";
import { ProductUXAuditEngine } from "../app/lib/ux-audit/index.js";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.js";

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("  TATTVA AI — PHASE 49 UNIT & INTEGRATION TEST SUITE");
  console.log("  Product & User Experience Quality, WCAG 2.1 AA & Responsiveness");
  console.log("===============================================================================\n");

  const engine = ProductUXAuditEngine.getInstance();

  // Test 1: Baseline inventory inspection
  console.log("1. Verifying platform module inventory...");
  const modules = engine.getModuleAudits();
  assert(modules.length >= 15, `Expected at least 15 audited modules, got ${modules.length}`);
  console.log(`✓ Audited modules count: ${modules.length}`);

  // Test 2: Platform UX summary check
  console.log("2. Verifying platform UX summary and WCAG compliance...");
  const summary = engine.getAuditSummary();
  assert(summary.totalModules >= 15, "Total modules should match");
  assert(summary.overallPlatformUXScore >= 90, `Overall UX score should be >= 90, got ${summary.overallPlatformUXScore}`);
  assert(summary.averageAccessibilityScore >= 95, `Accessibility score should be >= 95, got ${summary.averageAccessibilityScore}`);
  assert(summary.wcagCompliancePercentage === 100, `WCAG compliance should be 100%, got ${summary.wcagCompliancePercentage}%`);
  assert(summary.criticalIssuesCount === 0, `Critical issues count should be 0, got ${summary.criticalIssuesCount}`);
  console.log(`✓ Summary: Overall Score ${summary.overallPlatformUXScore}/100, WCAG Compliance ${summary.wcagCompliancePercentage}%`);

  // Test 3: Specific module audit inspection
  console.log("3. Verifying individual module audits...");
  const chatMod = engine.getModuleAudit("mod_chat");
  assert(chatMod, "Chat module audit should exist");
  assert.strictEqual(chatMod.wcagTier, "AA");
  assert(chatMod.overallScore >= 95, "Chat module overall score should be >= 95");

  const billingMod = engine.getModuleAudit("mod_billing");
  assert(billingMod, "Billing module audit should exist");
  assert.strictEqual(billingMod.wcagTier, "AAA");

  const relMod = engine.getModuleAudit("mod_reliability");
  assert(relMod, "Reliability module audit should exist");
  assert.strictEqual(relMod.wcagTier, "AAA");
  console.log("✓ Module audits verified for Core Chat, Billing, and Reliability");

  // Test 4: Dynamic on-demand audit run
  console.log("4. Testing dynamic audit run...");
  const runRes = engine.runAudit({ deepCheck: true });
  assert(runRes.auditedModules.length >= 15, "All modules should be re-audited");
  assert(runRes.summary.lastRunAt > 0, "Last run timestamp should be populated");
  console.log("✓ On-demand audit execution verified");

  // Test 5: Agent tool 40: audit_product_accessibility
  console.log("5. Testing Tool 40 (audit_product_accessibility)...");
  const tool40 = centralizedToolRegistry.getTool("audit_product_accessibility");
  assert(tool40, "Tool audit_product_accessibility should be registered");

  const tool40SummaryRes = await tool40.execute({}, { userId: "test_user", sessionId: "sess_1" });
  assert.strictEqual(tool40SummaryRes.success, true);
  assert(tool40SummaryRes.output.overallPlatformUXScore >= 90);

  const tool40ModRes = await tool40.execute({ moduleId: "mod_software_studio" }, { userId: "test_user", sessionId: "sess_1" });
  assert.strictEqual(tool40ModRes.success, true);
  assert.strictEqual(tool40ModRes.output.moduleId, "mod_software_studio");
  assert.strictEqual(tool40ModRes.output.status, "certified");
  console.log("✓ Tool 40 (audit_product_accessibility) executed successfully");

  // Test 6: Agent tool 41: get_module_experience_score
  console.log("6. Testing Tool 41 (get_module_experience_score)...");
  const tool41 = centralizedToolRegistry.getTool("get_module_experience_score");
  assert(tool41, "Tool get_module_experience_score should be registered");

  const tool41AllRes = await tool41.execute({}, { userId: "test_user", sessionId: "sess_1" });
  assert.strictEqual(tool41AllRes.success, true);
  assert(tool41AllRes.output.totalModules >= 15);

  const tool41FilterRes = await tool41.execute({ category: "enterprise_governance" }, { userId: "test_user", sessionId: "sess_1" });
  assert.strictEqual(tool41FilterRes.success, true);
  assert(tool41FilterRes.output.totalModules >= 3);
  console.log("✓ Tool 41 (get_module_experience_score) executed successfully");

  console.log("\n===============================================================================");
  console.log("  ALL PHASE 49 UNIT & INTEGRATION TESTS PASSED (100%)");
  console.log("===============================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
