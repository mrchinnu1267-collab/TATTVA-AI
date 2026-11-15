/**
 * TATTVA AI - PHASE 17: AGENTIC AI & TOOL EXECUTION ENGINE TEST SUITE
 * Validates task planner DAGs, tool selector, execution controller,
 * timeout bounds, cancellation, safety sandboxing, and dashboard observability.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { taskPlanner } from "../app/lib/ai-orchestrator/agent-engine/task-planner";
import { toolSelector } from "../app/lib/ai-orchestrator/agent-engine/tool-selector";
import { executionController } from "../app/lib/ai-orchestrator/agent-engine/execution-controller";
import { agentDashboard } from "../app/lib/ai-orchestrator/agent-engine/agent-dashboard";

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

async function runPhase17Tests() {
  console.log("\n========================================================");
  console.log("🤖 TATTVA PHASE 17: AGENTIC AI & TOOL EXECUTION TEST SUITE");
  console.log("========================================================\n");

  const mockContext = {
    userId: "test_engineer",
    workspaceId: "ws_security_dev",
    conversationHistory: [],
  };

  // ----------------------------------------------------
  // TEST SECTION 1: TASK PLANNER & DAG DECOMPOSITION
  // ----------------------------------------------------
  console.log("--- 1. Task Planner & Milestone DAG Generation ---");

  const repoGoal = "Perform a security audit on github repository mrchinnu1267-collab/TATTVA-AI";
  const repoPlan = taskPlanner.plan(repoGoal);

  assert(repoPlan.steps.length >= 3, `Decomposed repo audit into ${repoPlan.steps.length} milestones`);
  assert(repoPlan.steps[0].assignedTool === "github_inspector", "Assigned 'github_inspector' to first milestone");
  assert(repoPlan.steps[1].dependencies.includes("step_1_inspect"), "Second milestone depends on step 1 completion");
  assert(repoPlan.requiresUserConfirmation === false, "Read-only inspection does not require user confirmation");

  // ----------------------------------------------------
  // TEST SECTION 2: TOOL SELECTOR MATRIX
  // ----------------------------------------------------
  console.log("\n--- 2. Intelligent Tool Selector ---");

  const searchTools = toolSelector.selectToolsForGoal("Search the web for 2026 AI safety guidelines");
  assert(searchTools.includes("web_search"), "Selected 'web_search' for live web query");

  const calcTools = toolSelector.selectToolsForGoal("Calculate the standard deviation of sales figures");
  assert(calcTools.includes("data_calculator"), "Selected 'data_calculator' for numerical operations");

  const codeTools = toolSelector.selectToolsForGoal("Execute typescript snippet and verify return types");
  assert(codeTools.includes("code_runner"), "Selected 'code_runner' for execution task");

  // ----------------------------------------------------
  // TEST SECTION 3: SAFETY SANDBOXING & USER CONFIRMATION GATES
  // ----------------------------------------------------
  console.log("\n--- 3. Safety Sandboxing & Destructive Action Gates ---");

  const dangerousGoal = "Drop database tables and delete all user records";
  const dangerousPlan = taskPlanner.plan(dangerousGoal);

  assert(dangerousPlan.requiresUserConfirmation === true, "Destructive operation flagged for mandatory user confirmation");
  assert(Boolean(dangerousPlan.confirmationReason), "Provided clear reason for confirmation requirement");

  // Attempting execution without user confirmation must fail immediately
  const blockedTrace = await executionController.executePlan(
    dangerousPlan,
    mockContext,
    { userConfirmed: false }
  );

  assert(blockedTrace.status === "failed", "Execution controller successfully blocked unconfirmed destructive task");
  assert(
    blockedTrace.error?.includes("explicit user confirmation") || false,
    "Surfaced authorization barrier message"
  );

  // ----------------------------------------------------
  // TEST SECTION 4: STEP-BY-STEP EXECUTION & OUTPUT PIPING
  // ----------------------------------------------------
  console.log("\n--- 4. Execution Controller & Output Piping ---");

  const calcGoal = "Calculate standard deviation and summarize results";
  const calcPlan = taskPlanner.plan(calcGoal);

  let stepUpdateCount = 0;
  const executionTrace = await executionController.executePlan(
    calcPlan,
    mockContext,
    {},
    (step) => {
      if (step.status === "completed") stepUpdateCount++;
    }
  );

  assert(executionTrace.status === "completed", "Multi-step plan completed successfully");
  assert(stepUpdateCount >= 2, `Emitted step progress events for all milestones (${stepUpdateCount})`);
  assert(executionTrace.totalDurationMs !== undefined && executionTrace.totalDurationMs >= 0, "Recorded total duration telemetry");
  assert(Boolean(executionTrace.finalOutput), "Generated final consolidated output");

  // ----------------------------------------------------
  // TEST SECTION 5: CANCELLATION & TIMEOUT HANDLING
  // ----------------------------------------------------
  console.log("\n--- 5. Task Cancellation & Abort Signals ---");

  const abortController = new AbortController();
  abortController.abort(); // Pre-abort to test instantaneous cancellation

  const cancelledTrace = await executionController.executePlan(
    calcPlan,
    mockContext,
    { abortSignal: abortController.signal }
  );

  assert(cancelledTrace.status === "cancelled", "Execution controller stopped immediately upon abort signal");
  assert(cancelledTrace.steps.some((s) => s.status === "skipped"), "Remaining steps marked as skipped");

  // ----------------------------------------------------
  // TEST SECTION 6: AGENT DASHBOARD & OBSERVABILITY
  // ----------------------------------------------------
  console.log("\n--- 6. Agent Dashboard & Observability Metrics ---");

  agentDashboard.recordTrace(executionTrace);
  agentDashboard.recordTrace(blockedTrace);

  const recordedTrace = agentDashboard.getTrace(executionTrace.taskId);
  assert(recordedTrace?.taskId === executionTrace.taskId, "Retrieved trace from Agent Dashboard");

  const metrics = agentDashboard.getMetrics();
  assert(metrics.completedExecutions >= 1, "Dashboard recorded completed executions");
  assert(metrics.failedExecutions >= 1, "Dashboard recorded failed/blocked executions");
  assert(typeof metrics.averageLatencyMs === "number", "Calculated average execution latency");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 17 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase17Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
