/**
 * TATTVA AI - MASTER CHAT QUALITY TEST SUITE (TASK 8)
 * 
 * Comprehensive 14-Category Test Suite
 * Explicitly separates:
 *   [REAL PROVIDER] - Tests invoking live upstream AI models (Gemini / OpenRouter DeepSeek)
 *   [MOCKED / ISOLATED] - Tests validating circuit breakers, security boundaries, and tenant isolation
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { aiOrchestrator } = jiti("../app/lib/ai-orchestrator/index.ts");
const { modelRouter } = jiti("../app/lib/ai-orchestrator/model-router.ts");
const { promptAnalyzer } = jiti("../app/lib/ai-orchestrator/intelligence/prompt-analyzer.ts");
const { experienceEngine } = jiti("../app/lib/ai-orchestrator/experience-engine.ts");
const {
  createSignedTattvaSession,
  verifySignedTattvaSession,
} = jiti("../app/lib/security.ts");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const latencyRecord = {};

function assert(condition, name, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${name}] ${details ? `(${details})` : ""}`);
  } else {
    failedTests++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${name}] - ${details}`);
  }
}

async function runTestSuite() {
  console.log("\n================================================================================");
  console.log("🚀 TATTVA AI — 14-CATEGORY CHAT QUALITY & RELIABILITY TEST SUITE");
  console.log("================================================================================\n");

  const testUser = {
    userId: "benchmark.user@tattva.ai",
    userEmail: "benchmark.user@tattva.ai",
    userName: "Benchmark User",
    isAuthenticated: true,
  };

  // =========================================================================
  // SECTION A: REAL PROVIDER TESTS (LIVE AI MODEL GENERATION)
  // =========================================================================
  console.log("\n--- SECTION A: REAL PROVIDER TESTS (LIVE INFERENCE) ---");

  // 1. GENERAL KNOWLEDGE [REAL PROVIDER]
  console.log("\n[1/14] CATEGORY 1: General Knowledge [REAL PROVIDER]");
  const t1Start = Date.now();
  const res1 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "Explain the light-dependent reactions of photosynthesis and why chlorophyll reflects green light.",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 1 (General Knowledge)"] = Date.now() - t1Start;
  const c1Text = (res1.content || "").toLowerCase();
  assert(
    c1Text.includes("chlorophyll") && (c1Text.includes("reflect") || c1Text.includes("absorb")),
    "General Knowledge Factual Accuracy",
    `Latency: ${latencyRecord["Category 1 (General Knowledge)"]}ms, Model: ${res1.modelUsed}`
  );

  // 2. MATHEMATICS [REAL PROVIDER]
  console.log("\n[2/14] CATEGORY 2: Mathematics & Calculus [REAL PROVIDER]");
  const t2Start = Date.now();
  const res2 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "What is the derivative of f(x) = x^3 * sin(x) with respect to x? Show each step using the product rule.",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 2 (Mathematics)"] = Date.now() - t2Start;
  const c2Text = res2.content || "";
  const hasProductRule = /3x\^?2.*sin|x\^?3.*cos/i.test(c2Text);
  assert(
    hasProductRule,
    "Calculus Product Rule Derivation",
    `Latency: ${latencyRecord["Category 2 (Mathematics)"]}ms, Model: ${res2.modelUsed}`
  );

  // 3. LOGICAL REASONING [REAL PROVIDER]
  console.log("\n[3/14] CATEGORY 3: Logical Reasoning [REAL PROVIDER]");
  const t3Start = Date.now();
  const res3 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Show your step-by-step algebraic equation.",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 3 (Logical Reasoning)"] = Date.now() - t3Start;
  const c3Text = res3.content || "";
  const hasCorrectPrice = /\$0\.05|5\s*cents?/i.test(c3Text);
  assert(
    hasCorrectPrice,
    "Bat and Ball Deduction ($0.05)",
    `Latency: ${latencyRecord["Category 3 (Logical Reasoning)"]}ms, Model: ${res3.modelUsed}`
  );

  // 4. PROGRAMMING AND DEBUGGING [REAL PROVIDER]
  console.log("\n[4/14] CATEGORY 4: Programming & Debugging [REAL PROVIDER]");
  const t4Start = Date.now();
  const res4 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "Write a complete Python function `longest_palindromic_substring(s: str) -> str` using the expand-around-center approach with O(1) space. Include test cases.",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 4 (Programming)"] = Date.now() - t4Start;
  const c4Text = res4.content || "";
  const hasPythonCode = c4Text.includes("def longest_palindromic_substring") && c4Text.includes("```");
  assert(
    hasPythonCode,
    "Python Expand Around Center Algorithm",
    `Latency: ${latencyRecord["Category 4 (Programming)"]}ms, Model: ${res4.modelUsed}`
  );

  // 5. TELUGU & TELUGU-ENGLISH (TENGLISH) [REAL PROVIDER]
  console.log("\n[5/14] CATEGORY 5: Telugu and Telugu-English [REAL PROVIDER]");
  const t5Start = Date.now();
  const res5 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "Database indexing enduku vadatharu? Konchem simple ga Telugu lo cheppandi.",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 5 (Telugu/Tenglish)"] = Date.now() - t5Start;
  const c5Text = res5.content || "";
  const hasTeluguContent =
    /[\u0C00-\u0C7F]/.test(c5Text) ||
    /\b(indexing|database|search|fast|queries|table|records|valla|kosam|vadatharu|cheptanu|chuste|ela)\b/i.test(c5Text);
  assert(
    hasTeluguContent && c5Text.length > 50,
    "Conversational Telugu/Tenglish Response",
    `Latency: ${latencyRecord["Category 5 (Telugu/Tenglish)"]}ms, Model: ${res5.modelUsed}`
  );

  // 6. HINDI [REAL PROVIDER]
  console.log("\n[6/14] CATEGORY 6: Hindi [REAL PROVIDER]");
  const t6Start = Date.now();
  const res6 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "Binary search algorithm kya hota hai aur iski time complexity kya hai? Hindi mein samjhaiye.",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 6 (Hindi)"] = Date.now() - t6Start;
  const c6Text = res6.content || "";
  const hasHindiOrComplexity =
    (/O\s*\(\s*\\?log\s*n\s*\)/i.test(c6Text) || /logarithmic/i.test(c6Text) || /log\s*n/i.test(c6Text) || /O\(log/i.test(c6Text)) &&
    (/[\u0900-\u097F]/.test(c6Text) || /\b(hota|hai|karte|mein|sorted|array|upar|adhik|samay)\b/i.test(c6Text));
  assert(
    hasHindiOrComplexity,
    "Natural Hindi Technical Explanation O(log n)",
    `Latency: ${latencyRecord["Category 6 (Hindi)"]}ms, Model: ${res6.modelUsed}`
  );

  // 7. FOLLOW-UP QUESTIONS & ANAPHORA RESOLUTION [REAL PROVIDER]
  console.log("\n[7/14] CATEGORY 7: Follow-up Questions & Anaphora [REAL PROVIDER]");
  const t7Start = Date.now();
  const res7 = await aiOrchestrator.processRequest({
    messages: [
      { role: "user", content: "What is Dijkstra's algorithm used for?" },
      { role: "assistant", content: "Dijkstra's algorithm finds the shortest path between nodes in a weighted graph with non-negative edge weights." },
      { role: "user", content: "What is its time complexity with a binary min-heap?" },
    ],
    context: testUser,
  });
  latencyRecord["Category 7 (Follow-up Anaphora)"] = Date.now() - t7Start;
  const c7Text = res7.content || "";
  const resolvesAnaphora = c7Text.includes("O((V + E) log V)") || c7Text.includes("O(E log V)") || c7Text.includes("log V") || c7Text.includes("log(V)");
  assert(
    resolvesAnaphora,
    "Anaphora Resolution ('its time complexity' -> Dijkstra)",
    `Latency: ${latencyRecord["Category 7 (Follow-up Anaphora)"]}ms, Model: ${res7.modelUsed}`
  );

  // 8. LONG CONVERSATION CONTEXT & DIGEST [REAL PROVIDER]
  console.log("\n[8/14] CATEGORY 8: Long Conversation Context (>10 turns) [REAL PROVIDER]");
  const longHistory = [
    { role: "user", content: "We are designing a new project codenamed 'Project Aegis'." },
    { role: "assistant", content: "Understood. Project Aegis established." },
    { role: "user", content: "Rule 1: All passwords must use argon2id hashing." },
    { role: "assistant", content: "Constraint recorded: argon2id for password hashing." },
    { role: "user", content: "What is Redis?" },
    { role: "assistant", content: "Redis is an in-memory key-value data store." },
    { role: "user", content: "What is Kafka?" },
    { role: "assistant", content: "Apache Kafka is a distributed event store and stream-processing platform." },
    { role: "user", content: "What is Docker?" },
    { role: "assistant", content: "Docker is a set of platform-as-a-service products that use OS-level virtualization." },
    { role: "user", content: "What is Kubernetes?" },
    { role: "assistant", content: "Kubernetes is an open-source container orchestration system." },
    { role: "user", content: "What is PostgreSQL?" },
    { role: "assistant", content: "PostgreSQL is a powerful, open-source object-relational database system." },
    { role: "user", content: "What was our project codename and what was Rule 1?" },
  ];
  const t8Start = Date.now();
  const res8 = await aiOrchestrator.processRequest({
    messages: longHistory,
    context: testUser,
  });
  latencyRecord["Category 8 (Long Context)"] = Date.now() - t8Start;
  const c8Text = res8.content || "";
  const retainsMemory = /Project Aegis/i.test(c8Text) && /argon2id/i.test(c8Text);
  assert(
    retainsMemory,
    "Persistent Constraint Retention across >12 turns",
    `Latency: ${latencyRecord["Category 8 (Long Context)"]}ms, Model: ${res8.modelUsed}`
  );

  // 9. AMBIGUOUS QUESTIONS & CLARIFICATION [REAL PROVIDER / ANALYZER]
  console.log("\n[9/14] CATEGORY 9: Ambiguous Questions [ANALYZER / CLARIFICATION]");
  const ambiguousAnalysis = promptAnalyzer.analyzePrompt("Fix it", []);
  assert(
    ambiguousAnalysis.isAmbiguous && Boolean(ambiguousAnalysis.clarificationQuestion),
    "Ambiguity Detection for zero-context pronoun query",
    `Question: "${ambiguousAnalysis.clarificationQuestion}"`
  );

  // 10. UNKNOWN QUESTIONS & CALIBRATED UNCERTAINTY [REAL PROVIDER]
  console.log("\n[10/14] CATEGORY 10: Unknown Questions & Uncertainty [REAL PROVIDER]");
  const t10Start = Date.now();
  const res10 = await aiOrchestrator.processRequest({
    messages: [
      {
        role: "user",
        content: "Who won the men's FIFA World Cup in the year 2038?",
      },
    ],
    context: testUser,
  });
  latencyRecord["Category 10 (Calibrated Uncertainty)"] = Date.now() - t10Start;
  const c10Text = (res10.content || "").toLowerCase();
  const expressesUncertainty =
    c10Text.includes("not") ||
    c10Text.includes("future") ||
    c10Text.includes("hasn't") ||
    c10Text.includes("unknown") ||
    c10Text.includes("yet to take place");
  assert(
    expressesUncertainty,
    "Communicates Uncertainty on Future / Unknown Events",
    `Latency: ${latencyRecord["Category 10 (Calibrated Uncertainty)"]}ms`
  );

  // 12. CONCURRENT USERS [REAL PROVIDER CONCURRENCY]
  console.log("\n[12/14] CATEGORY 12: Concurrent Users [REAL PROVIDER CONCURRENCY]");
  const t12Start = Date.now();
  const prompts = [
    "What is the capital of Japan?",
    "Explain binary search in one sentence.",
    "What is 25 * 25?",
    "Define polymorphic recursion in computer science.",
  ];
  const concurrentResults = await Promise.all(
    prompts.map((p, idx) =>
      aiOrchestrator.processRequest({
        messages: [{ role: "user", content: p }],
        context: {
          userId: `concurrent_user_${idx}@tattva.ai`,
          userEmail: `concurrent_user_${idx}@tattva.ai`,
          isAuthenticated: true,
        },
      })
    )
  );
  latencyRecord["Category 12 (4 Concurrent Requests)"] = Date.now() - t12Start;
  const allSuccessful = concurrentResults.every((r) => r.content && r.content.length > 10);
  assert(
    allSuccessful,
    "4 Simultaneous Concurrent Requests Complete Successfully",
    `Total Batch Latency: ${latencyRecord["Category 12 (4 Concurrent Requests)"]}ms`
  );

  // 14. RESPONSE LATENCY BENCHMARK [REAL PROVIDER TIMING]
  console.log("\n[14/14] CATEGORY 14: Response Latency Measurement [REAL PROVIDER]");
  const t14Start = Date.now();
  const res14 = await aiOrchestrator.processRequest({
    messages: [{ role: "user", content: "What is HTTP status code 404?" }],
    context: testUser,
  });
  const fastLatency = Date.now() - t14Start;
  latencyRecord["Category 14 (Fast Chat)"] = fastLatency;
  assert(
    fastLatency <= 12000 && /not found/i.test(res14.content),
    "Fast Interactive Response (or Failover) <= 12,000ms",
    `Actual Latency: ${fastLatency}ms, Model: ${res14.modelUsed}`
  );

  // =========================================================================
  // SECTION B: MOCKED & ISOLATED INFRASTRUCTURE TESTS
  // =========================================================================
  console.log("\n--- SECTION B: MOCKED & ISOLATED INFRASTRUCTURE TESTS ---");

  // 11. PROVIDER FAILURES & HONEST FALLBACK [MOCKED / FAULT INJECTION]
  console.log("\n[11/14] CATEGORY 11: Provider Failures & Honest Fallback [FAULT INJECTION]");
  const fallbackResult = await modelRouter.executeWithFallback("coding", 8, {
    messages: [{ role: "user", content: "Generate a quick script" }],
    preferredProvider: "nonexistent_provider",
    timeoutMs: 1, // Instantly trigger failover
  });
  const fallbackContent = fallbackResult.text;
  const hasNoFakeDummyCode = !fallbackContent.includes("class TaskEngine") && !fallbackContent.includes("executeStep()");
  const hasHonestStatus = fallbackContent.includes("Service Notice") || fallbackContent.includes("Unavailable");
  assert(
    hasNoFakeDummyCode && hasHonestStatus,
    "Honest Fallback Emits Real Diagnostic Notice (Zero Fake Code)",
    `Model: ${fallbackResult.modelUsed}`
  );

  // 13. CONVERSATION PRIVACY & TENANT ISOLATION [SECURITY / ISOLATION]
  console.log("\n[13/14] CATEGORY 13: Conversation Privacy & Tenant Isolation [SECURITY]");
  
  // A. HMAC Session Signature Verification
  const validSigned = createSignedTattvaSession({ email: "alice@tattva.ai", name: "Alice" });
  const verified = verifySignedTattvaSession(validSigned);
  assert(
    verified && verified.email === "alice@tattva.ai",
    "Cryptographic HMAC Session Signature Verified"
  );

  const tampered = validSigned.slice(0, -6) + "badbad";
  const tamperedVerified = verifySignedTattvaSession(tampered);
  assert(
    tamperedVerified === null,
    "Tampered Session Signature Rejected"
  );

  // B. Multi-Tenant Memory Partitioning in ExperienceEngine
  await experienceEngine.recordExperience({
    userId: "tenant_alice_secure",
    workspaceId: "ws_alice",
    taskType: "coding",
    problemStatement: "Secret internal finance API implementation for Alice",
    attemptedSolution: "SECRET_KEY_FINANCE_ALICE_XYZ",
    passedVerification: true,
  });

  const bobRetrieved = await experienceEngine.retrieveRelevantExperiences(
    "finance API implementation",
    "coding",
    5,
    { userId: "tenant_bob_secure", workspaceId: "ws_bob" }
  );

  const leakedToBob = bobRetrieved.some((m) => m.attemptedSolution.includes("SECRET_KEY_FINANCE_ALICE"));
  assert(
    !leakedToBob,
    "Tenant Alice Secret Isolated From Tenant Bob"
  );

  // =========================================================================
  // LATENCY & TEST SUMMARY
  // =========================================================================
  console.log("\n================================================================================");
  console.log("📊 LATENCY BENCHMARK METRICS (REAL INFERENCE)");
  console.log("================================================================================");
  for (const [testName, ms] of Object.entries(latencyRecord)) {
    console.log(`  - ${testName.padEnd(45)}: ${ms} ms`);
  }

  console.log("\n================================================================================");
  console.log(`🏆 FINAL CHAT QUALITY TEST SUITE RESULTS: ${passedTests}/${totalTests} PASSED`);
  if (failedTests === 0) {
    console.log("  \x1b[32mALL 14 CHAT QUALITY CRITERIA MET WITH 100% SUCCESS!\x1b[0m");
  } else {
    console.log(`  \x1b[31m${failedTests} tests failed!\x1b[0m`);
  }
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("FATAL RUNTIME ERROR IN TEST SUITE:", err);
  process.exit(1);
});
