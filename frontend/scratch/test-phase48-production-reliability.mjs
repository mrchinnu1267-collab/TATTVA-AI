/**
 * Phase 48 Comprehensive Test Suite: Production Reliability Engineering
 * Tests ProbeRunner, IncidentResponder, TelemetryTracker, SLA/SLO metrics, and Centralized Tool Registry.
 */

import assert from "node:assert";
import { ProductionReliabilityEngine } from "../app/lib/reliability/index.js";
import { centralizedToolRegistry } from "../app/lib/agent-engine/tool-registry.js";

async function runPhase48Tests() {
  console.log("=== STARTING PHASE 48 PRODUCTION RELIABILITY ENGINEERING TEST SUITE ===");

  const engine = ProductionReliabilityEngine.getInstance();
  assert.ok(engine, "ProductionReliabilityEngine must be instantiated");

  // 1. SLA & SLO Reliability Metrics
  console.log("\n[Test 1] SLA Telemetry & Latency Percentiles...");
  const metrics = engine.getMetrics();
  assert.ok(metrics.uptimePercent >= 99.95, "Uptime SLA must meet or exceed 99.95% target");
  assert.strictEqual(metrics.mtbfHours, 720, "MTBF should be 720 hours");
  assert.strictEqual(metrics.mttrMinutes, 4.2, "MTTR should be 4.2 minutes");
  assert.ok(metrics.latencyP50Ms > 0, "p50 latency must be positive");
  assert.ok(metrics.latencyP95Ms >= metrics.latencyP50Ms, "p95 must be >= p50");
  assert.ok(metrics.latencyP99Ms >= metrics.latencyP95Ms, "p99 must be >= p95");
  assert.strictEqual(metrics.circuitBreakerStatus.gemini, "CLOSED");
  console.log(`  ✓ Uptime SLA verified: ${metrics.uptimePercent}%, p50: ${metrics.latencyP50Ms}ms, p95: ${metrics.latencyP95Ms}ms`);

  // 2. Synthetic Health Probes
  console.log("\n[Test 2] Synthetic Availability Probes Execution...");
  const probeResults = await engine.runHealthProbes();
  assert.ok(probeResults.length >= 4, "Should execute probes on at least 4 core endpoints");
  for (const prb of probeResults) {
    assert.ok(prb.endpoint.startsWith("/api/"), "Endpoint must start with /api/");
    assert.ok(prb.latencyMs >= 0, "Latency must be non-negative");
    assert.strictEqual(prb.statusCode, 200, "Status code must be 200");
    assert.ok(prb.status === "healthy" || prb.status === "degraded");
  }
  console.log(`  ✓ Executed synthetic probes across ${probeResults.length} endpoints`);

  // 3. Latency Heatmap
  console.log("\n[Test 3] Latency Distribution Heatmap...");
  const heatmap = engine.getLatencyHeatmap();
  assert.strictEqual(heatmap.length, 6, "Heatmap should have 6 4-hour bins");
  assert.ok(heatmap[0].requestCount > 0, "Request count must be positive");
  assert.ok(heatmap[0].timeWindow.includes("00:00"), "First window starts at 00:00");
  console.log("  ✓ Latency heatmap distribution verified across 24-hour cycle");

  // 4. Incident Declaration & Automated Mitigation Playbooks
  console.log("\n[Test 4] Incident Declaration and Automated Mitigation...");
  const incident = engine.declareIncident({
    title: "Upstream Model Fallback Latency Warning",
    service: "Model Gateway (Gemini 2.5 Flash)",
    severity: "medium",
    initialMessage: "Simulated latency test breach",
  });
  assert.ok(incident.id.startsWith("inc_"), "Incident ID must start with inc_");
  assert.strictEqual(incident.status, "investigating", "Initial status must be investigating");
  assert.strictEqual(incident.timeline.length, 1, "Timeline should have 1 initial entry");

  // Trigger automated mitigation playbook: provider_failover
  const mitigationRes = await engine.mitigateIncident({
    incidentId: incident.id,
    mitigationAction: "provider_failover",
    actor: "Reliability-Agent",
  });
  assert.strictEqual(mitigationRes.success, true, "Mitigation should succeed");
  assert.strictEqual(mitigationRes.incident.status, "resolved", "Status must update to resolved");
  assert.strictEqual(mitigationRes.incident.mitigationActionTaken, "provider_failover");
  assert.ok(mitigationRes.incident.resolvedAt > 0, "resolvedAt must be set");
  assert.strictEqual(mitigationRes.incident.timeline.length, 2, "Timeline should have 2 entries");
  console.log("  ✓ Automated mitigation playbook executed and incident marked resolved:", incident.id);

  // 5. Telemetry & Error Tracking
  console.log("\n[Test 5] Error Telemetry & Breadcrumb Capture...");
  const errEvent = engine.captureError({
    message: "Synthetic connection test error",
    service: "Database Connection Pool",
    level: "warning",
    breadcrumbs: ["connectPool", "acquireClient", "ping"],
  });
  assert.ok(errEvent.id.startsWith("err_"));
  assert.strictEqual(errEvent.level, "warning");
  assert.strictEqual(errEvent.breadcrumbs.length, 3);

  const errorList = engine.listErrors(10);
  assert.ok(errorList.some((e) => e.id === errEvent.id), "Captured error must be in error list");
  console.log("  ✓ Error telemetry event captured with breadcrumbs:", errEvent.id);

  // 6. Centralized Tool Registry Integration
  console.log("\n[Test 6] Tool Registry Verification for Phase 48 Tools...");
  const toolMetrics = centralizedToolRegistry.getTool("get_service_reliability_metrics");
  assert.ok(toolMetrics, "Tool 'get_service_reliability_metrics' must be registered");

  const toolProbe = centralizedToolRegistry.getTool("run_reliability_health_probe");
  assert.ok(toolProbe, "Tool 'run_reliability_health_probe' must be registered");

  const toolMitigate = centralizedToolRegistry.getTool("trigger_incident_mitigation");
  assert.ok(toolMitigate, "Tool 'trigger_incident_mitigation' must be registered");

  const execContext = {
    userId: "agent_tester_p48",
    userEmail: "tester_p48@tattva.ai",
    roles: ["admin"],
    sessionId: "sess_p48",
    workspaceId: "ws_p48",
  };

  // Test Tool: get_service_reliability_metrics
  const mExec = await toolMetrics.execute({}, execContext);
  assert.strictEqual(mExec.success, true, "Tool get_service_reliability_metrics should succeed");
  assert.ok(mExec.output.uptimePercent >= 99.95);

  // Test Tool: run_reliability_health_probe
  const pExec = await toolProbe.execute({}, execContext);
  assert.strictEqual(pExec.success, true, "Tool run_reliability_health_probe should succeed");
  assert.ok(pExec.output.probeCount >= 4);

  // Test Tool: trigger_incident_mitigation
  const mitExec = await toolMitigate.execute(
    {
      incidentId: incident.id,
      mitigationAction: "reset_circuit_breaker",
    },
    execContext
  );
  assert.strictEqual(mitExec.success, true, "Tool trigger_incident_mitigation should succeed");
  assert.strictEqual(mitExec.output.status, "resolved");

  console.log("  ✓ All 3 Phase 48 tools successfully executed via Centralized Tool Registry!");
  console.log("\n=== ALL PHASE 48 TESTS PASSED SUCCESSFULLY! ===");
}

runPhase48Tests().catch((err) => {
  console.error("Phase 48 Test Error:", err);
  process.exit(1);
});
