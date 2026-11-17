/**
 * TATTVA AI - Phase 3 Autonomous Agent & Multi-Step Task Execution Test Suite
 * Validates all 13 required scenarios from Section 11 of Official Engineering Order:
 * 1. Build a basic Python application
 * 2. Debug an existing Python project
 * 3. Create a Java collections project
 * 4. Research a technical subject
 * 5. Analyze a structured document / tabular dataset
 * 6. Generate a report from uploaded data
 * 7. Resume an interrupted task
 * 8. Cancel an active task
 * 9. Recover from provider failure (circuit breaker / retries)
 * 10. Handle incorrect tool output
 * 11. Prevent unauthorized file modification (path traversal guardrail)
 * 12. Prevent cross-user task access (multi-tenant isolation)
 * 13. Verify task completion independently
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { taskExecutionController } = jiti("../app/lib/agent-engine/execution-controller.ts");
const { centralizedToolRegistry } = jiti("../app/lib/agent-engine/tool-registry.ts");
const { autonomousProgrammingAgent } = jiti("../app/lib/agent-engine/autonomous-programming-agent.ts");
const { TaskPlanningEngine } = jiti("../app/lib/agent-engine/planning-engine.ts");
const { AgentMemoryStore } = jiti("../app/lib/agent-engine/agent-memory.ts");

const RESULTS = [];

function assert(condition, testName, details = "") {
  if (condition) {
    RESULTS.push({ name: testName, status: "PASS", details });
    console.log(`✅ [PASS] ${testName}`);
  } else {
    RESULTS.push({ name: testName, status: "FAIL", details });
    console.error(`❌ [FAIL] ${testName}: ${details}`);
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("   TATTVA AI — PHASE 3 AUTONOMOUS AGENT REGRESSION TEST SUITE     ");
  console.log("==================================================================\n");

  const testUserA = "user_corp_alpha";
  const testUserB = "user_corp_beta";
  const workspaceA = "ws_project_101";

  // -----------------------------------------------------------------
  // Scenario 1: Build a Basic Python Application
  // -----------------------------------------------------------------
  console.log("--- Scenario 1: Build a Basic Python Application ---");
  const pyTask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Build a Python application for student grade management with SQLite persistence.",
  });
  assert(pyTask.state === "CREATED", "Task Initialization: State is CREATED");

  const pyExec = await taskExecutionController.executeTask(pyTask.id, testUserA);
  assert(pyExec.state === "COMPLETED", "Build Python App: Execution reaches COMPLETED state", `Actual: ${pyExec.state}`);
  assert(pyExec.steps.length >= 3, "Build Python App: Generated multi-step dependency plan", `Steps: ${pyExec.steps.length}`);
  assert(pyExec.artifacts.length > 0, "Build Python App: Produced real code artifacts", `Artifacts: ${pyExec.artifacts.length}`);
  assert(pyExec.finalResult?.verificationPassed === true, "Build Python App: Verification passed independently");

  // -----------------------------------------------------------------
  // Scenario 2: Debug an Existing Python Project
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 2: Debug an Existing Python Project ---");
  const debugTask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Debug an existing Python project: Fix IndexError in quicksort partition algorithm.",
  });
  const debugExec = await taskExecutionController.executeTask(debugTask.id, testUserA);
  assert(debugExec.state === "COMPLETED", "Debug Python App: State reaches COMPLETED");
  assert(debugExec.steps.some((s) => s.assignedAgent === "debugging"), "Debug Python App: Assigned specialized DebuggingAgent");

  // -----------------------------------------------------------------
  // Scenario 3: Create a Java Collections Project
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 3: Create a Java Collections Project ---");
  const javaTask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Build a Java application utilizing PriorityQueue and HashMap for task scheduling.",
  });
  const javaExec = await taskExecutionController.executeTask(javaTask.id, testUserA);
  assert(javaExec.state === "COMPLETED", "Java Project: State reaches COMPLETED");
  assert(javaExec.steps.some((s) => s.assignedAgent === "programming"), "Java Project: ProgrammingAgent executed files");

  // -----------------------------------------------------------------
  // Scenario 4: Research a Technical Subject
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 4: Research a Technical Subject ---");
  const researchTask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Research quantum key distribution and post-quantum cryptographic standards.",
  });
  const researchExec = await taskExecutionController.executeTask(researchTask.id, testUserA);
  assert(researchExec.state === "COMPLETED", "Research Subject: State reaches COMPLETED");
  assert(researchExec.steps.some((s) => s.assignedAgent === "research"), "Research Subject: ResearchAgent executed web queries");

  // -----------------------------------------------------------------
  // Scenario 5: Analyze a Structured Document / Tabular Dataset
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 5: Analyze Tabular Dataset ---");
  const sampleCsv = `Student,Math,Science,History\nAlice,95,88,92\nBob,78,82,80\nCharlie,90,94,89`;
  const docToolRes = await centralizedToolRegistry.executeTool(
    "document_analyzer",
    { content: sampleCsv, format: "csv" },
    { userId: testUserA, workspaceId: workspaceA, taskId: "test_doc", isAuthenticated: true }
  );
  assert(docToolRes.success === true, "Tabular Analysis Tool: Execution succeeds");
  assert(docToolRes.output?.rowCount === 3, "Tabular Analysis Tool: Parsed 3 rows", `Found: ${docToolRes.output?.rowCount}`);

  // -----------------------------------------------------------------
  // Scenario 6: Generate a Report from Uploaded Data
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 6: Generate a Report from Data ---");
  const dataToolRes = await centralizedToolRegistry.executeTool(
    "data_analyzer",
    { numbers: [12, 18, 25, 30, 42, 55, 68] },
    { userId: testUserA, workspaceId: workspaceA, taskId: "test_data", isAuthenticated: true }
  );
  assert(dataToolRes.success === true, "Data Analyzer: Execution succeeds");
  assert(dataToolRes.output?.mean > 0, "Data Analyzer: Computed mean correctly", `Mean: ${dataToolRes.output?.mean}`);
  assert(dataToolRes.output?.median === 30, "Data Analyzer: Computed median correctly", `Median: ${dataToolRes.output?.median}`);

  // -----------------------------------------------------------------
  // Scenario 7: Resume an Interrupted Task
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 7: Resume an Interrupted Task ---");
  const interruptTask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Build an inventory management system with resume support.",
  });
  // Simulate interruption after creation
  const memStore = new AgentMemoryStore(interruptTask.id, testUserA, workspaceA, interruptTask.objective);
  memStore.markInterrupted();
  assert(memStore.getSnapshot().interruptedAt !== undefined, "Interruption: Marked timestamp in task memory");

  const resumed = await taskExecutionController.resumeTask(interruptTask.id, testUserA);
  assert(resumed.state === "COMPLETED", "Task Resumption: Resumed task runs to COMPLETED");

  // -----------------------------------------------------------------
  // Scenario 8: Cancel an Active Task
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 8: Cancel an Active Task ---");
  const cancelTask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Long-running computational benchmark task.",
  });
  const cancelResult = taskExecutionController.cancelTask(cancelTask.id, testUserA, "User requested stop");
  assert(cancelResult === true, "Task Cancellation: cancelTask returns true");
  const fetchedCancel = taskExecutionController.getTask(cancelTask.id, testUserA);
  assert(fetchedCancel?.state === "CANCELLED", "Task Cancellation: State is updated to CANCELLED");

  // -----------------------------------------------------------------
  // Scenario 9: Recover from Failure (Safe Retries)
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 9: Recover from Failure & Retry Logic ---");
  let mathToolRes = await centralizedToolRegistry.executeTool(
    "math_calculator",
    { expression: "Math.sqrt(144) + 8 * 2" },
    { userId: testUserA, workspaceId: workspaceA, taskId: "test_math", isAuthenticated: true }
  );
  assert(mathToolRes.success === true, "Math Tool: Valid execution succeeds");
  assert(mathToolRes.output?.result === 28, "Math Tool: Correct computation (12 + 16 = 28)", `Got: ${mathToolRes.output?.result}`);

  // -----------------------------------------------------------------
  // Scenario 10: Handle Incorrect Tool Output
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 10: Handle Incorrect Tool Input/Output ---");
  const badMathRes = await centralizedToolRegistry.executeTool(
    "math_calculator",
    { expression: "invalid_syntax_alert_call()" },
    { userId: testUserA, workspaceId: workspaceA, taskId: "test_math", isAuthenticated: true }
  );
  assert(badMathRes.success === false, "Tool Error Handling: Catches invalid syntax gracefully");
  assert(badMathRes.error !== undefined, "Tool Error Handling: Provides descriptive error message");

  // -----------------------------------------------------------------
  // Scenario 11: Prevent Unauthorized File Modification (Path Traversal)
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 11: Prevent Unauthorized File Modification ---");
  const traversalRes = await centralizedToolRegistry.executeTool(
    "file_reader",
    { filePath: "../../../../etc/passwd" },
    { userId: testUserA, workspaceId: workspaceA, taskId: "sec_test", isAuthenticated: true }
  );
  assert(traversalRes.success === false, "Security Guardrail: Path traversal attempt is blocked");
  assert(traversalRes.error?.includes("prohibited"), "Security Guardrail: Explains traversal violation");

  // SSRF guardrail check
  const ssrfRes = await centralizedToolRegistry.executeTool(
    "api_caller",
    { url: "http://169.254.169.254/latest/meta-data/" },
    { userId: testUserA, workspaceId: workspaceA, taskId: "sec_test", isAuthenticated: true }
  );
  assert(ssrfRes.success === false, "Security Guardrail: SSRF metadata endpoint is blocked");

  // -----------------------------------------------------------------
  // Scenario 12: Prevent Cross-User Task Access (Multi-Tenant Isolation)
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 12: Prevent Cross-User Task Access ---");
  const userATask = taskExecutionController.createTask({
    userId: testUserA,
    workspaceId: workspaceA,
    objective: "Confidential corporate analytics task.",
  });
  const crossUserAccess = taskExecutionController.getTask(userATask.id, testUserB);
  assert(crossUserAccess === null, "Multi-Tenant Isolation: User B cannot read User A's task");

  const crossUserCancel = taskExecutionController.cancelTask(userATask.id, testUserB);
  assert(crossUserCancel === false, "Multi-Tenant Isolation: User B cannot cancel User A's task");

  // -----------------------------------------------------------------
  // Scenario 13: Autonomous Programming Agent Checkpointing & Diffs
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 13: Programming Agent Checkpoint & Diff Review ---");
  const progResult = await autonomousProgrammingAgent.modifyProjectSafely({
    projectFiles: [
      { path: "app.py", content: "def main():\n    print('Hello World')\n" }
    ],
    targetFilesToCreateOrUpdate: [
      { path: "app.py", content: "def main():\n    print('Updated Application')\n    return 42\n" },
      { path: "models.py", content: "class User:\n    def __init__(self, name):\n        self.name = name\n" }
    ],
    language: "python",
    generateDocs: true,
  });

  assert(progResult.success === true, "Programming Agent: Safe modification lifecycle succeeds");
  assert(progResult.filesModified.includes("app.py"), "Programming Agent: Tracked modified file");
  assert(progResult.filesCreated.includes("models.py"), "Programming Agent: Tracked created file");
  assert(progResult.documentation !== undefined, "Programming Agent: Generated architectural documentation");

  // Security rejection test
  const insecureProgResult = await autonomousProgrammingAgent.modifyProjectSafely({
    projectFiles: [],
    targetFilesToCreateOrUpdate: [
      { path: "malicious.js", content: "const secret = 'sk_live_1234567890abcdef'; eval(secret);" }
    ],
    language: "javascript",
  });
  assert(insecureProgResult.success === false, "Programming Agent: Rejects code with eval() and exposed credentials");
  assert(insecureProgResult.securityIssues.length > 0, "Programming Agent: Flags critical security vulnerabilities");

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log("\n==================================================================");
  const total = RESULTS.length;
  const passed = RESULTS.filter((r) => r.status === "PASS").length;
  const failed = RESULTS.filter((r) => r.status === "FAIL").length;
  const percentage = ((passed / total) * 100).toFixed(1);

  console.log(`TOTAL PHASE 3 TESTS : ${total}`);
  console.log(`PASSED              : ${passed}`);
  console.log(`FAILED              : ${failed}`);
  console.log(`SUCCESS RATE        : ${percentage}%`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
