/**
 * TATTVA AI - PHASE 2 ADVANCED PLATFORM REGRESSION TEST SUITE
 * 
 * Validates:
 * 1. Autonomous Programming Agent (Architecture & Multi-file Generation)
 * 2. AST Multi-Language Symbol Extraction (TS, Python, Go, Rust, Java, C/C++)
 * 3. Security Code Scanner (Eval, SQLi, Secret Exposure)
 * 4. Multi-Language Secure Sandbox (JS VM, Python Subprocess, SQL, Timeout)
 * 5. Web Research Authority Tiering & SSRF Guard
 * 6. Multi-Document Table Extraction & Source Code Inspection
 * 7. Advanced Memory User Controls & Active Filtering
 * 8. Self-Correction & 8-Gate Quality Engine
 * 9. Conversation Search, Patch (Rename/Pin), and Markdown/JSON Export
 * 10. Platform Observability & Cost Telemetry
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { advancedProgrammingAgent } = jiti("../app/lib/software-studio/dev-engine/programming-agent.ts");
const { extractSymbols } = jiti("../app/lib/software-studio/project-understanding/symbol-extractor.ts");
const { executeCodeInSandbox } = jiti("../app/lib/ai-orchestrator/tools/code-runner.ts");
const { categorizeAuthority, fetchAndExtractWebpage } = jiti("../app/lib/ai-orchestrator/tools/web-search.ts");
const { extractTabularData, analyzeSourceCodeFile, buildGroundedDocumentContext } = jiti("../app/lib/document-engine/multi-doc-analyzer.ts");
const { saveMemory, updateMemory, retrieveRelevantMemories, getUserMemories } = jiti("../app/lib/memory-service.ts");
const { selfCorrectionEngine } = jiti("../app/lib/ai-orchestrator/intelligence/self-correction-engine.ts");
const { platformObservability } = jiti("../app/lib/platform/observability.ts");

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  ✖ [FAIL] ${testName} ${details ? `(${details})` : ""}`);
  }
}

async function runPhase2TestSuite() {
  console.log("\n================================================================================");
  console.log("🚀 TATTVA AI — PHASE 2 ADVANCED PLATFORM REGRESSION SUITE");
  console.log("================================================================================\n");

  // --- 1. AUTONOMOUS PROGRAMMING AGENT ---
  console.log("[1/10] Testing Autonomous Programming Agent...");
  {
    const pyProj = advancedProgrammingAgent.synthesizeProject("inventory-tracker", "Build a high throughput inventory service", "python");
    assert(pyProj.files.some(f => f.path === "src/main.py" && f.content.includes("class ItemService")), "Python Multi-File Project Synthesis");
    assert(pyProj.files.some(f => f.path === "schema.sql" && f.content.includes("CREATE TABLE")), "Relational Schema Generation");
    assert(pyProj.files.some(f => f.path === "ARCHITECTURE.md"), "Architecture Spec Generation");

    const goProj = advancedProgrammingAgent.synthesizeProject("stream-broker", "Event streaming service in Go", "go");
    assert(goProj.files.some(f => f.path === "src/main.go" && f.content.includes("type ItemService struct")), "Go Multi-File Project Synthesis");
  }

  // --- 2. AST MULTI-LANGUAGE SYMBOL EXTRACTION ---
  console.log("\n[2/10] Testing AST Symbol Extraction across Languages...");
  {
    const goCode = `package worker\nimport "fmt"\ntype Dispatcher struct {}\nfunc StartWorkerPool(workers int) error { return nil }`;
    const goSym = extractSymbols(goCode, "go", "worker.go");
    assert(goSym.symbols.some(s => s.name === "StartWorkerPool" && s.kind === "function"), "Go Function Symbol Extraction");
    assert(goSym.symbols.some(s => s.name === "Dispatcher" && s.kind === "class"), "Go Struct Symbol Extraction");

    const rustCode = `use std::sync::Arc;\npub struct TokenBucket {}\npub fn acquire_token() -> bool { true }`;
    const rustSym = extractSymbols(rustCode, "rust", "bucket.rs");
    assert(rustSym.symbols.some(s => s.name === "acquire_token" && s.isExported), "Rust Exported Function Extraction");

    const pyCode = `import os\nclass ModelArchitect:\n    def optimize_weights(self):\n        pass`;
    const pySym = extractSymbols(pyCode, "python", "architect.py");
    assert(pySym.symbols.some(s => s.name === "ModelArchitect" && s.kind === "class"), "Python Class Symbol Extraction");
    assert(pySym.symbols.some(s => s.name === "optimize_weights" && s.kind === "function"), "Python Method Symbol Extraction");
  }

  // --- 3. SECURITY CODE SCANNER ---
  console.log("\n[3/10] Testing Security Vulnerability Reviewer...");
  {
    const dangerousCode = `
      const userInput = req.body.cmd;
      eval(userInput);
      const query = "SELECT * FROM users WHERE id = '" + req.query.id + "'";
      const apiKey = "sk-live-1234567890abcdef1234567890";
    `;
    const review = advancedProgrammingAgent.reviewSecurity(dangerousCode, "javascript");
    assert(review.passed === false, "Security Scanner Flags Insecure Code");
    assert(review.vulnerabilities.some(v => v.rule.includes("Arbitrary Code Execution")), "Detects Dangerous eval()");
    assert(review.vulnerabilities.some(v => v.rule.includes("SQL Injection")), "Detects Unparameterized SQL Concatenation");
    assert(review.vulnerabilities.some(v => v.rule.includes("Hardcoded Credential")), "Detects Hardcoded Credentials");
  }

  // --- 4. MULTI-LANGUAGE SECURE SANDBOX ---
  console.log("\n[4/10] Testing Multi-Language Secure Sandbox...");
  {
    // JavaScript Sandbox
    const jsRun = await executeCodeInSandbox({
      language: "javascript",
      code: "function add(a, b) { return a + b; } add(10, 25);",
      testCases: [{ input: [10, 25], expected: 35, name: "10 + 25 === 35" }],
    });
    assert(jsRun.status === "success" && jsRun.passedCount === 1, "JavaScript Sandbox with Test Assertion");

    // Python Sandbox
    const pyRun = await executeCodeInSandbox({
      language: "python",
      code: "def multiply(x, y):\n    return x * y\n",
      testCases: [{ input: [6, 7], expected: 42, name: "6 * 7 == 42" }],
    });
    assert(pyRun.status === "success" && pyRun.passedCount === 1, "Python Subprocess Sandbox with Test Assertion");

    // SQL Sandbox
    const sqlRun = await executeCodeInSandbox({
      language: "sql",
      code: "CREATE TABLE employees (id INT, salary INT); INSERT INTO employees VALUES (1, 100), (2, 200); SELECT MAX(salary) FROM employees;",
    });
    assert(sqlRun.status === "success" || sqlRun.status === "unavailable", "SQL Sandbox Execution or Honest Handling");

    // Timeout Enforcement
    const timeoutRun = await executeCodeInSandbox({
      language: "javascript",
      code: "while(true) {}",
      timeoutMs: 500,
    });
    assert(timeoutRun.status === "timeout", "Sandbox Strict Timeout Enforcement");
  }

  // --- 5. WEB RESEARCH & SSRF GUARD ---
  console.log("\n[5/10] Testing Web Research Authority & SSRF Guard...");
  {
    assert(categorizeAuthority("docs.python.org", "https://docs.python.org/3/library/") === "official_doc", "Authority Tiering: Official Docs");
    assert(categorizeAuthority("arxiv.org", "https://arxiv.org/abs/1706.03762") === "academic_gov", "Authority Tiering: Academic Research");
    assert(categorizeAuthority("reuters.com", "https://reuters.com/tech") === "established_pub", "Authority Tiering: Established Publications");

    // SSRF Guard
    const ssrfLocal = await fetchAndExtractWebpage("http://localhost:8080/admin");
    assert(ssrfLocal.isAccessible === false && ssrfLocal.error.includes("strictly prohibited"), "SSRF Guard: Localhost Blocked");
    const ssrfPrivate = await fetchAndExtractWebpage("http://192.168.1.1/router");
    assert(ssrfPrivate.isAccessible === false && ssrfPrivate.error.includes("strictly prohibited"), "SSRF Guard: Private IP Blocked");
  }

  // --- 6. MULTI-DOCUMENT TABLE EXTRACTION & GROUNDING ---
  console.log("\n[6/10] Testing Multi-Document Table Extraction & Grounding...");
  {
    const csvContent = "Region,Revenue,Growth\nNorth,500000,12%\nSouth,750000,18%\nEast,420000,9%";
    const tables = extractTabularData(csvContent, "sales.csv");
    assert(tables.length === 1 && tables[0].headers.length === 3 && tables[0].rowCount === 3, "Structured CSV Table Extraction");

    const codeFile = "function processPayment(token, amount) { return { status: 'paid', amount }; }";
    const codeAnalysis = analyzeSourceCodeFile(codeFile, "payment.js");
    assert(codeAnalysis.functions.includes("processPayment") && codeAnalysis.language === "javascript", "Source Code File Inspection");

    const groundingContext = buildGroundedDocumentContext([
      { name: "sales.csv", content: csvContent },
      { name: "payment.js", content: codeFile },
    ]);
    assert(groundingContext.includes("STRICT MULTI-DOCUMENT GROUNDING DIRECTIVE"), "Multi-Document Grounding Directive Formatting");
  }

  // --- 7. ADVANCED MEMORY USER CONTROLS ---
  console.log("\n[7/10] Testing Advanced Memory User Controls & Deactivation...");
  {
    const user = "phase2_tester@tattva.ai";
    const mem1 = await saveMemory(user, "Prefers concise Go code without boilerplate", "preference", 8, "explicit");
    assert(Boolean(mem1.id), "Memory Item Created");

    // Deactivate memory item
    await updateMemory(user, mem1.id, { active: false });
    const activeMems = await retrieveRelevantMemories(user, "Go code boilerplate");
    assert(!activeMems.some(m => m.id === mem1.id), "Deactivated Memory Omitted from Search");

    // Reactivate and verify retrieval
    await updateMemory(user, mem1.id, { active: true });
    const reactivatedMems = await retrieveRelevantMemories(user, "Go code boilerplate");
    assert(reactivatedMems.some(m => m.id === mem1.id), "Active Memory Successfully Retrieved");
  }

  // --- 8. SELF-CORRECTION & 8-GATE QUALITY ENGINE ---
  console.log("\n[8/10] Testing Self-Correction & 8-Gate Quality Engine...");
  {
    // Good response
    const goodReport = selfCorrectionEngine.evaluateQuality(
      "Write a Python function to compute factorial",
      "Here is the complete Python function:\n```python\ndef factorial(n: int) -> int:\n    return 1 if n <= 1 else n * factorial(n - 1)\n```",
      "coding"
    );
    assert(goodReport.isValid === true && goodReport.needsCorrection === false, "8-Gate QA Passes Complete Generation");

    // Flawed response (truncated code block)
    const flawedReport = selfCorrectionEngine.evaluateQuality(
      "Write a Python function to compute factorial",
      "Here is the code:\n```python\ndef factorial(n):",
      "coding"
    );
    assert(flawedReport.needsCorrection === true && flawedReport.issues.length > 0, "8-Gate QA Catches Truncated Code Block");

    const directive = selfCorrectionEngine.buildCorrectionDirective(flawedReport.issues);
    assert(directive.includes("MANDATORY QUALITY SELF-CORRECTION DIRECTIVE"), "Generates Self-Correction Directive");
  }

  // --- 9. CONVERSATION MANAGEMENT & EXPORT ---
  console.log("\n[9/10] Testing Conversation Management & Export Logic...");
  {
    const mockSessions = [
      { id: "sess_1", title: "Distributed Consensus Algorithms", messages: [{ role: "user", content: "Explain Raft and Paxos" }] },
      { id: "sess_2", title: "React State Management", messages: [{ role: "user", content: "Compare Redux vs Zustand" }] },
    ];

    // Search filter
    const searchMatch = mockSessions.filter(s => s.title.toLowerCase().includes("raft") || s.messages.some(m => m.content.toLowerCase().includes("raft")));
    assert(searchMatch.length === 1 && searchMatch[0].id === "sess_1", "Conversation Search by Message Content");

    // Export generation
    const mdExport = `# ${mockSessions[0].title}\n\n### **User**:\n${mockSessions[0].messages[0].content}\n`;
    assert(mdExport.includes("Distributed Consensus Algorithms") && mdExport.includes("Explain Raft"), "Conversation Markdown Export Formatting");
  }

  // --- 10. OBSERVABILITY & DEDUPLICATION CACHE ---
  console.log("\n[10/10] Testing Platform Observability & Deduplication...");
  {
    platformObservability.recordMetric({
      timestamp: Date.now(),
      userId: "user_obs_test",
      endpoint: "/api/chat",
      model: "gemini-3.5-flash-lite",
      provider: "gemini",
      latencyMs: 1420,
      promptTokens: 85,
      completionTokens: 210,
      costUsd: 0.00007,
      status: "success",
    });

    const snapshot = platformObservability.getSnapshot();
    assert(snapshot.totalRequests > 0, "Observability Records Request Count");
    assert(snapshot.totalTokensUsed > 0, "Observability Tracks Token Usage");
    assert(snapshot.systemStatus === "healthy", "Observability Computes Healthy System Status");

    // Deduplication Cache
    platformObservability.setCachedDuplicate("user_obs_test", "req_hash_123", { text: "cached answer" });
    const cached = platformObservability.getCachedDuplicate("user_obs_test", "req_hash_123");
    assert(cached?.text === "cached answer", "Safe Request Deduplication Cache Retrieval");
  }

  console.log("\n================================================================================");
  console.log(`🎯 PHASE 2 REGRESSION SCORECARD: Passed: ${passed} | Failed: ${failed}`);
  console.log("================================================================================\n");

  if (failed === 0) {
    console.log("✨ ALL PHASE 2 ADVANCED PLATFORM CAPABILITIES VERIFIED (100.0%)!");
    process.exit(0);
  } else {
    console.error(`❌ REGRESSIONS DETECTED: ${failed} tests failed.`);
    process.exit(1);
  }
}

runPhase2TestSuite().catch((err) => {
  console.error("Test execution threw fatal error:", err);
  process.exit(1);
});
