import assert from "node:assert";
import { PlatformCertificationEngine } from "../app/lib/platform-certification/index.js";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.js";

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("  TATTVA AI — PHASE 50 UNIT & INTEGRATION TEST SUITE");
  console.log("  Final Platform Completion & 5-Pillar Production Certification");
  console.log("===============================================================================\n");

  const engine = PlatformCertificationEngine.getInstance();

  // Test 1: Certification Record Inspection
  console.log("1. Verifying Certification Record and release metadata...");
  const cert = engine.getCertificationStatus();
  assert(cert, "Certification record must exist");
  assert.strictEqual(cert.overallReadinessScore, 100, "Readiness score must be 100%");
  assert.strictEqual(cert.productionCertified, true, "Platform must be marked production certified");
  assert(cert.digitalSignature && cert.digitalSignature.length === 64, "Digital signature must be a 64-char SHA-256 hex string");
  console.log(`✓ Release ${cert.releaseVersion} (Commit ${cert.releaseCommit}) certified by ${cert.certifiedBy}`);
  console.log(`✓ Digital Signature: ${cert.digitalSignature}`);

  // Test 2: 5 Pillars Verification
  console.log("\n2. Verifying the 5 Production Certification Pillars...");
  assert.strictEqual(cert.pillars.length, 5, "Must have exactly 5 certification pillars");
  const requiredPillars = [
    "technical_architecture",
    "functional_capabilities",
    "zero_trust_security",
    "sla_performance",
    "disaster_recovery"
  ];

  for (const pillarId of requiredPillars) {
    const p = cert.pillars.find((item) => item.pillar === pillarId);
    assert(p, `Pillar '${pillarId}' must be present`);
    assert.strictEqual(p.status, "certified", `Pillar '${pillarId}' must be certified`);
    assert.strictEqual(p.score, 100, `Pillar '${pillarId}' score must be 100%`);
    assert(p.checksPassed === p.totalChecks, `Pillar '${pillarId}' must pass all checks (${p.checksPassed}/${p.totalChecks})`);
    console.log(`  ✓ Pillar '${p.title}': ${p.checksPassed}/${p.totalChecks} checks (100% PASSED)`);
  }

  // Test 3: Production Readiness Verification Method
  console.log("\n3. Testing verifyProductionReadiness() method...");
  const readiness = engine.verifyProductionReadiness();
  assert.strictEqual(readiness.ready, true, "Platform readiness must be true");
  assert.strictEqual(readiness.failedPillarsCount, 0, "Failed pillars count must be 0");
  assert.strictEqual(readiness.overallScore, 100, "Overall score must be 100");
  console.log(`✓ Readiness verification PASSED: ${readiness.message}`);

  // Test 4: Tool 42: get_platform_certification_status
  console.log("\n4. Testing Tool 42 (get_platform_certification_status)...");
  const tool42 = centralizedToolRegistry.getTool("get_platform_certification_status");
  assert(tool42, "Tool get_platform_certification_status must be registered");

  const tool42Res = await tool42.execute({}, { userId: "chief_architect", sessionId: "sess_cert" });
  assert.strictEqual(tool42Res.success, true);
  assert.strictEqual(tool42Res.output.overallReadinessScore, 100);
  assert.strictEqual(tool42Res.output.pillars.length, 5);

  const tool42Filtered = await tool42.execute({ pillar: "zero_trust_security" }, { userId: "chief_architect", sessionId: "sess_cert" });
  assert.strictEqual(tool42Filtered.success, true);
  assert.strictEqual(tool42Filtered.output.pillars.length, 1);
  assert.strictEqual(tool42Filtered.output.pillars[0].pillar, "zero_trust_security");
  console.log("✓ Tool 42 (get_platform_certification_status) executed successfully");

  // Test 5: Tool 43: verify_production_readiness_gate
  console.log("\n5. Testing Tool 43 (verify_production_readiness_gate)...");
  const tool43 = centralizedToolRegistry.getTool("verify_production_readiness_gate");
  assert(tool43, "Tool verify_production_readiness_gate must be registered");

  const tool43Res = await tool43.execute({ targetEnvironment: "production" }, { userId: "chief_architect", sessionId: "sess_cert" });
  assert.strictEqual(tool43Res.success, true);
  assert.strictEqual(tool43Res.output.ready, true);
  assert.strictEqual(tool43Res.output.overallScore, 100);
  assert.strictEqual(tool43Res.output.failedPillarsCount, 0);
  console.log("✓ Tool 43 (verify_production_readiness_gate) executed successfully");

  console.log("\n===============================================================================");
  console.log("  ALL PHASE 50 UNIT & INTEGRATION TESTS PASSED (100%)");
  console.log("===============================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test suite failed:", err);
  process.exit(1);
});
