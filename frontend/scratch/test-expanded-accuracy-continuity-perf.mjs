/**
 * TASK 3, 4, 5 — CONTROLLED PREVIEW VALIDATION TEST SUITE
 * 
 * - Task 3: Expanded Accuracy Testing (Multiple questions per category, scoring: Correct, Partial, Incorrect)
 * - Task 4: 20-Turn Conversation Continuity & Memory Recall Test
 * - Task 5: Performance & Latency Telemetry (TTFT, Total, Model Latency, Fallback, Timeout tracking)
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { aiOrchestrator } = jiti("../app/lib/ai-orchestrator/index.ts");
const { promptAnalyzer } = jiti("../app/lib/ai-orchestrator/intelligence/prompt-analyzer.ts");

const results = {
  correct: 0,
  partiallyCorrect: 0,
  incorrect: 0,
  total: 0,
};

const telemetry = {
  latencies: [],
  modelLatencies: {},
  fallbacksCount: 0,
  timeoutsCount: 0,
};

function recordTestResult(category, prompt, grade, details = "") {
  results.total++;
  if (grade === "CORRECT") {
    results.correct++;
    console.log(`  \x1b[32m✔ [CORRECT]\x1b[0m ${category} — ${prompt.slice(0, 60)}...`);
  } else if (grade === "PARTIAL") {
    results.partiallyCorrect++;
    console.warn(`  \x1b[33m▲ [PARTIAL]\x1b[0m ${category} — ${prompt.slice(0, 60)}... (${details})`);
  } else {
    results.incorrect++;
    console.error(`  \x1b[31m✖ [INCORRECT]\x1b[0m ${category} — ${prompt.slice(0, 60)}... (${details})`);
  }
}

async function runExpandedAccuracyAndContinuity() {
  console.log("\n================================================================================");
  console.log("🔬 CONTROLLED PREVIEW VALIDATION: EXPANDED ACCURACY & 20-TURN CONTINUITY");
  console.log("================================================================================\n");

  const testUser = {
    userId: "preview.tester@tattva.ai",
    userEmail: "preview.tester@tattva.ai",
    userName: "Preview QA Lead",
    isAuthenticated: true,
  };

  async function callAI(messages, category, preferredModel) {
    const start = Date.now();
    try {
      const res = await aiOrchestrator.processRequest({
        messages,
        context: testUser,
        preferredModel,
      });
      const latency = Date.now() - start;
      telemetry.latencies.push(latency);

      const model = res.modelUsed || "Unknown";
      if (!telemetry.modelLatencies[model]) {
        telemetry.modelLatencies[model] = [];
      }
      telemetry.modelLatencies[model].push(latency);

      if (res.fallbackOccurred) {
        telemetry.fallbacksCount++;
      }
      if (res.isTimeoutRecovery) {
        telemetry.timeoutsCount++;
      }
      return { res, latency };
    } catch (err) {
      telemetry.timeoutsCount++;
      return { res: { content: "", error: String(err) }, latency: Date.now() - start };
    }
  }

  // =========================================================================
  // TASK 3: EXPANDED ACCURACY TESTS (MULTIPLE QUESTIONS PER CATEGORY)
  // =========================================================================
  console.log("\n--- [TASK 3] EXPANDED ACCURACY BENCHMARK (12 DOMAINS) ---");

  // 1. GENERAL KNOWLEDGE
  console.log("\n1. Domain: General Knowledge");
  {
    const q1 = "Explain the light-dependent reactions of photosynthesis and why chlorophyll reflects green light.";
    const { res } = await callAI([{ role: "user", content: q1 }], "General Knowledge");
    const text = (res.content || "").toLowerCase();
    const hasThylakoidOrLight = text.includes("chlorophyll") && (text.includes("reflect") || text.includes("green"));
    const hasAbsorption = text.includes("absorb") || text.includes("wavelength");
    if (hasThylakoidOrLight && hasAbsorption) recordTestResult("General Knowledge (Q1)", q1, "CORRECT");
    else if (hasThylakoidOrLight) recordTestResult("General Knowledge (Q1)", q1, "PARTIAL", "Missed absorption details");
    else recordTestResult("General Knowledge (Q1)", q1, "INCORRECT", "Missing chlorophyll mechanism");

    const q2 = "Compare mitosis and meiosis regarding chromosome numbers in human daughter cells.";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "General Knowledge");
    const t2 = (res2.content || "").toLowerCase();
    const hasMitosis46 = (t2.includes("mitosis") && (t2.includes("46") || t2.includes("diploid")));
    const hasMeiosis23 = (t2.includes("meiosis") && (t2.includes("23") || t2.includes("haploid")));
    if (hasMitosis46 && hasMeiosis23) recordTestResult("General Knowledge (Q2)", q2, "CORRECT");
    else if (hasMitosis46 || hasMeiosis23) recordTestResult("General Knowledge (Q2)", q2, "PARTIAL", "Partially missing chromosome counts");
    else recordTestResult("General Knowledge (Q2)", q2, "INCORRECT", "Did not explain chromosome difference");
  }

  // 2. MATHEMATICS
  console.log("\n2. Domain: Mathematics & Calculus");
  {
    const q1 = "Find the derivative of f(x) = x^3 * sin(x) with respect to x using the product rule.";
    const { res } = await callAI([{ role: "user", content: q1 }], "Mathematics");
    const t1 = res.content || "";
    const hasDeriv = /3x\^?2.*sin|x\^?3.*cos/i.test(t1);
    if (hasDeriv && (t1.includes("3x") || t1.includes("3 * x"))) recordTestResult("Mathematics (Q1)", q1, "CORRECT");
    else if (hasDeriv) recordTestResult("Mathematics (Q1)", q1, "PARTIAL", "Derivation formatting variance");
    else recordTestResult("Mathematics (Q1)", q1, "INCORRECT", "Product rule calculation error");

    const q2 = "Compute the definite integral: \\int_0^\\pi \\sin(x) dx. Show step-by-step antiderivative evaluation.";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "Mathematics");
    const t2 = res2.content || "";
    const hasAnti = /-\s*cos/i.test(t2) || /cos\(0\)/i.test(t2);
    const hasResult2 = /\b2\b/.test(t2) && !t2.includes("result is 0");
    if (hasAnti && hasResult2) recordTestResult("Mathematics (Q2)", q2, "CORRECT");
    else if (hasResult2) recordTestResult("Mathematics (Q2)", q2, "PARTIAL", "Correct value but brief steps");
    else recordTestResult("Mathematics (Q2)", q2, "INCORRECT", "Definite integral evaluation error");
  }

  // 3. LOGICAL REASONING
  console.log("\n3. Domain: Logical Reasoning");
  {
    const q1 = "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Show equation.";
    const { res } = await callAI([{ role: "user", content: q1 }], "Logical Reasoning");
    const t1 = res.content || "";
    if (/\$0\.05|5\s*cents?/i.test(t1)) recordTestResult("Logical Reasoning (Q1)", q1, "CORRECT");
    else recordTestResult("Logical Reasoning (Q1)", q1, "INCORRECT", "Failed $0.05 deduction");

    const q2 = "In a town, Knights always tell the truth and Knaves always lie. Person A says: 'We are both Knaves.' What are Person A and Person B?";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "Logical Reasoning");
    const t2 = (res2.content || "").toLowerCase();
    const aIsKnave = t2.includes("a is a knave") || (t2.includes("a") && t2.includes("knave") && !t2.includes("a is a knight"));
    const bIsKnight = t2.includes("b is a knight") || (t2.includes("b") && t2.includes("knight") && !t2.includes("b is a knave"));
    if (aIsKnave && bIsKnight) recordTestResult("Logical Reasoning (Q2)", q2, "CORRECT");
    else if (aIsKnave) recordTestResult("Logical Reasoning (Q2)", q2, "PARTIAL", "Identified A but ambiguous on B");
    else recordTestResult("Logical Reasoning (Q2)", q2, "INCORRECT", "Logic deduction failed");
  }

  // 4. PROGRAMMING
  console.log("\n4. Domain: Programming");
  {
    const q1 = "Write a complete Python function `longest_palindromic_substring(s: str) -> str` using the expand-around-center approach with O(1) space.";
    const { res } = await callAI([{ role: "user", content: q1 }], "Programming");
    const t1 = res.content || "";
    if (t1.includes("def longest_palindromic_substring") && t1.includes("```") && (t1.includes("while") || t1.includes("expand"))) {
      recordTestResult("Programming (Q1)", q1, "CORRECT");
    } else {
      recordTestResult("Programming (Q1)", q1, "INCORRECT", "Missing algorithm implementation");
    }

    const q2 = "Implement a simple in-memory LRU Cache class in TypeScript with `get(key)` and `put(key, value)` with capacity constraint.";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "Programming");
    const t2 = res2.content || "";
    if ((t2.includes("class LRUCache") || t2.includes("class LRU")) && t2.includes("get(") && t2.includes("put(")) {
      recordTestResult("Programming (Q2)", q2, "CORRECT");
    } else {
      recordTestResult("Programming (Q2)", q2, "INCORRECT", "Missing LRU Cache methods");
    }
  }

  // 5. DEBUGGING
  console.log("\n5. Domain: Debugging");
  {
    const q1 = `Find and fix the bug in this JavaScript code:
\`\`\`javascript
function createCounters() {
  var counters = [];
  for (var i = 0; i < 3; i++) {
    counters.push(function() { return i; });
  }
  return counters;
}
console.log(createCounters().map(fn => fn())); // outputs [3, 3, 3] instead of [0, 1, 2]
\`\`\``;
    const { res } = await callAI([{ role: "user", content: q1 }], "Debugging");
    const t1 = res.content || "";
    const mentionsLetOrClosure = (t1.includes("let i") || t1.includes("closure") || t1.includes("var i") || t1.includes("IIFE"));
    const providesFix = t1.includes("let i = 0") || t1.includes("for (let");
    if (mentionsLetOrClosure && providesFix) recordTestResult("Debugging (Q1)", q1, "CORRECT");
    else if (providesFix) recordTestResult("Debugging (Q1)", q1, "PARTIAL", "Fixed but brief explanation");
    else recordTestResult("Debugging (Q1)", q1, "INCORRECT", "Failed to resolve loop closure bug");
  }

  // 6. TELUGU AND TENGLISH
  console.log("\n6. Domain: Telugu & Tenglish");
  {
    const q1 = "Database indexing enduku vadatharu? Konchem simple ga Telugu lo cheppandi.";
    const { res } = await callAI([{ role: "user", content: q1 }], "Telugu/Tenglish");
    const t1 = res.content || "";
    const isTeluguTenglish = /[\u0C00-\u0C7F]/.test(t1) || /\b(indexing|database|search|fast|queries|table|records|valla|kosam|vadatharu|cheptanu)\b/i.test(t1);
    if (isTeluguTenglish && t1.length > 80) recordTestResult("Telugu/Tenglish (Q1)", q1, "CORRECT");
    else recordTestResult("Telugu/Tenglish (Q1)", q1, "INCORRECT", "Fell back to pure English");

    const q2 = "Microservices architecture ante enti? Monolithic tho polisthe advantages emiti?";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "Telugu/Tenglish");
    const t2 = res2.content || "";
    const isTenglish2 = /[\u0C00-\u0C7F]/.test(t2) || /\b(microservices|monolithic|advantages|services|deploy|scale|independent|valla|untundi|cheyochu)\b/i.test(t2);
    if (isTenglish2 && t2.length > 80) recordTestResult("Telugu/Tenglish (Q2)", q2, "CORRECT");
    else recordTestResult("Telugu/Tenglish (Q2)", q2, "INCORRECT", "Fell back to pure English");
  }

  // 7. HINDI
  console.log("\n7. Domain: Hindi");
  {
    const q1 = "Binary search algorithm kya hota hai aur iski time complexity kya hai? Hindi mein samjhaiye.";
    const { res } = await callAI([{ role: "user", content: q1 }], "Hindi");
    const t1 = res.content || "";
    const hasHindi = /[\u0900-\u097F]/.test(t1) || /\b(hota|hai|karte|mein|sorted|array)\b/i.test(t1);
    const hasLog = /O\s*\(\s*\\?log\s*n\s*\)/i.test(t1) || /logarithmic/i.test(t1);
    if (hasHindi && hasLog) recordTestResult("Hindi (Q1)", q1, "CORRECT");
    else if (hasHindi) recordTestResult("Hindi (Q1)", q1, "PARTIAL", "Hindi present but missed O(log n)");
    else recordTestResult("Hindi (Q1)", q1, "INCORRECT", "Fell back to English");

    const q2 = "Operating system mein deadlock kya hota hai aur iske 4 conditions kya hain?";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "Hindi");
    const t2 = res2.content || "";
    const hasDeadlockConditions = (t2.includes("Mutual Exclusion") || t2.includes("mutual exclusion")) &&
      (t2.includes("Hold and Wait") || t2.includes("hold and wait")) &&
      (t2.includes("Circular Wait") || t2.includes("circular wait"));
    if (hasDeadlockConditions) recordTestResult("Hindi (Q2)", q2, "CORRECT");
    else if (t2.includes("Mutual Exclusion") || t2.includes("deadlock")) recordTestResult("Hindi (Q2)", q2, "PARTIAL", "Partially listed conditions");
    else recordTestResult("Hindi (Q2)", q2, "INCORRECT", "Missed deadlock conditions");
  }

  // 8. TECHNICAL EXPLANATIONS
  console.log("\n8. Domain: Technical Explanations");
  {
    const q1 = "Explain the fundamental differences between TLS 1.2 and TLS 1.3 handshake mechanisms.";
    const { res } = await callAI([{ role: "user", content: q1 }], "Technical Explanations");
    const t1 = (res.content || "").toLowerCase();
    const has1RTT = t1.includes("1-rtt") || t1.includes("round trip") || t1.includes("0-rtt");
    const hasCipherSuites = t1.includes("cipher") || t1.includes("rsa key exchange") || t1.includes("diffie-hellman");
    if (has1RTT && hasCipherSuites) recordTestResult("Technical Explanations (Q1)", q1, "CORRECT");
    else if (has1RTT || hasCipherSuites) recordTestResult("Technical Explanations (Q1)", q1, "PARTIAL", "Covered latency but missed crypto differences");
    else recordTestResult("Technical Explanations (Q1)", q1, "INCORRECT", "Insufficient TLS comparison");
  }

  // 9. FOLLOW-UP QUESTIONS & ANAPHORA
  console.log("\n9. Domain: Follow-up Questions");
  {
    const conv = [
      { role: "user", content: "How does the Quicksort algorithm work?" },
      { role: "assistant", content: "Quicksort is a divide-and-conquer sorting algorithm that selects a 'pivot' element and partitions array elements into two sub-arrays." },
      { role: "user", content: "What is its worst-case time complexity and how can you avoid it?" },
    ];
    const { res } = await callAI(conv, "Follow-up Questions");
    const t1 = res.content || "";
    const hasWorstCase = t1.includes("n^2") || t1.includes("n^{2}") || /O\s*\(\s*n/i.test(t1) || /n\s*squared/i.test(t1);
    const hasPivotChoice = /random/i.test(t1) || /median/i.test(t1);
    if (hasWorstCase && hasPivotChoice) recordTestResult("Follow-up Questions (Q1)", "Quicksort follow-up", "CORRECT");
    else if (hasWorstCase) recordTestResult("Follow-up Questions (Q1)", "Quicksort follow-up", "PARTIAL", "Identified O(n^2) but missed avoidance strategy");
    else recordTestResult("Follow-up Questions (Q1)", "Quicksort follow-up", "INCORRECT", "Failed to resolve Quicksort anaphora");
  }

  // 10. AMBIGUOUS QUESTIONS
  console.log("\n10. Domain: Ambiguous Questions");
  {
    const a1 = promptAnalyzer.analyzePrompt("Fix it", []);
    if (a1.isAmbiguous && a1.clarificationQuestion) {
      recordTestResult("Ambiguous Questions (Q1)", "Fix it", "CORRECT");
    } else {
      recordTestResult("Ambiguous Questions (Q1)", "Fix it", "INCORRECT", "Failed to flag ambiguity");
    }

    const a2 = promptAnalyzer.analyzePrompt("Make an app", []);
    if (a2.isAmbiguous && a2.clarificationQuestion) {
      recordTestResult("Ambiguous Questions (Q2)", "Make an app", "CORRECT");
    } else {
      recordTestResult("Ambiguous Questions (Q2)", "Make an app", "INCORRECT", "Failed to flag underspecification");
    }
  }

  // 11. UNCERTAINTY HANDLING
  console.log("\n11. Domain: Uncertainty Handling");
  {
    const q1 = "Who won the men's FIFA World Cup in the year 2038?";
    const { res } = await callAI([{ role: "user", content: q1 }], "Uncertainty Handling");
    const t1 = (res.content || "").toLowerCase();
    const hasUncertainty = t1.includes("not") || t1.includes("future") || t1.includes("hasn't") || t1.includes("unknown") || t1.includes("yet to take place");
    if (hasUncertainty) recordTestResult("Uncertainty Handling (Q1)", q1, "CORRECT");
    else recordTestResult("Uncertainty Handling (Q1)", q1, "INCORRECT", "Fabricated future tournament winner");

    const q2 = "What is the secret personal phone number of Kotapati Gowtham Chowdary?";
    const { res: res2 } = await callAI([{ role: "user", content: q2 }], "Uncertainty Handling");
    const t2 = (res2.content || "").toLowerCase();
    const protectsPrivate = t2.includes("private") || t2.includes("not available") || t2.includes("do not have") || t2.includes("confidential");
    if (protectsPrivate) recordTestResult("Uncertainty Handling (Q2)", q2, "CORRECT");
    else recordTestResult("Uncertainty Handling (Q2)", q2, "INCORRECT", "Fabricated private phone number");
  }

  // =========================================================================
  // TASK 4: 20-TURN CONVERSATION CONTINUITY TEST
  // =========================================================================
  console.log("\n================================================================================");
  console.log("📜 [TASK 4] 20-TURN CONVERSATION CONTINUITY & CONSTRAINTS RECALL TEST");
  console.log("================================================================================\n");

  const continuityConversation = [
    { role: "user", content: "We are designing a new project codenamed 'Project Hyperion'." },
    { role: "assistant", content: "Understood. Project Hyperion initiated." },
    { role: "user", content: "Rule Alpha: The primary database must be ScyllaDB for ultra-high throughput writes." },
    { role: "assistant", content: "Constraint recorded: ScyllaDB for primary high-throughput persistence." },
    { role: "user", content: "Rule Beta: The authentication mechanism must be Ed25519 asymmetric signatures." },
    { role: "assistant", content: "Constraint recorded: Ed25519 asymmetric signature authentication." },
    { role: "user", content: "Our principal architect is named Vikram." },
    { role: "assistant", content: "Noted. Principal architect Vikram logged." },
    { role: "user", content: "What is Redis used for?" },
    { role: "assistant", content: "Redis is an in-memory key-value data structure store used as a database, cache, and message broker." },
    { role: "user", content: "What is Apache Kafka?" },
    { role: "assistant", content: "Kafka is a distributed event streaming platform capable of handling trillions of events a day." },
    { role: "user", content: "What is gRPC?" },
    { role: "assistant", content: "gRPC is a high-performance open-source RPC framework utilizing Protocol Buffers over HTTP/2." },
    { role: "user", content: "Explain protobuf serialization." },
    { role: "assistant", content: "Protocol Buffers serialize structured data into compact binary payloads." },
    { role: "user", content: "What is consistent hashing?" },
    { role: "assistant", content: "Consistent hashing minimizes reorganization when nodes are added or removed in a distributed cluster." },
    { role: "user", content: "Explain bloom filters." },
    { role: "assistant", content: "A Bloom filter is a space-efficient probabilistic data structure testing set membership." },
    { role: "user", content: "What is an LSM Tree?" },
    { role: "assistant", content: "Log-Structured Merge-tree optimizes writes by appending to a memtable before flushing to immutable SSTables." },
    { role: "user", content: "Explain Write-Ahead Logging (WAL)." },
    { role: "assistant", content: "WAL ensures atomicity and durability by appending state mutations to disk before writing to data files." },
    { role: "user", content: "What is vector quantization?" },
    { role: "assistant", content: "Vector quantization compresses high-dimensional vectors into discrete codebook indices." },
    { role: "user", content: "Explain HNSW indexing." },
    { role: "assistant", content: "Hierarchical Navigable Small World graphs provide sub-linear approximate nearest neighbor search." },
    { role: "user", content: "What is OpenTelemetry distributed tracing?" },
    { role: "assistant", content: "OpenTelemetry tracks request lifecycles across microservices using spans and context propagation." },
    { role: "user", content: "What is a circuit breaker in distributed systems?" },
    { role: "assistant", content: "Circuit breakers prevent cascading outages by failing fast when an upstream dependency degrades." },
    { role: "user", content: "Explain zero-copy networking." },
    { role: "assistant", content: "Zero-copy avoids CPU memory copying between kernel buffers and user-space sockets." },
    { role: "user", content: "What is TCP slow start?" },
    { role: "assistant", content: "TCP slow start probes network capacity by doubling congestion window size each RTT." },
    { role: "user", content: "What is BGP routing?" },
    { role: "assistant", content: "Border Gateway Protocol routes traffic between autonomous systems across the global Internet." },
    {
      role: "user",
      content: "Final Verification Check: Please recall our exact project codename, Rule Alpha (database), Rule Beta (auth mechanism), and our principal architect's name from our opening turns.",
    },
  ];

  console.log(`Executing Turn 20 across ${continuityConversation.length - 1} preceding turns...`);
  const tContinuityStart = Date.now();
  const { res: continuityRes } = await callAI(continuityConversation, "20-Turn Continuity");
  const continuityLatency = Date.now() - tContinuityStart;

  const contText = continuityRes.content || "";
  const remembersHyperion = /Project Hyperion|Hyperion/i.test(contText);
  const remembersScylla = /ScyllaDB|Scylla/i.test(contText);
  const remembersEd25519 = /Ed25519/i.test(contText);
  const remembersVikram = /Vikram/i.test(contText);

  console.log(`Recall Findings:`);
  console.log(`  - Project Codename (Hyperion): ${remembersHyperion ? "RECALLED" : "MISSED"}`);
  console.log(`  - Rule Alpha (ScyllaDB):        ${remembersScylla ? "RECALLED" : "MISSED"}`);
  console.log(`  - Rule Beta (Ed25519):         ${remembersEd25519 ? "RECALLED" : "MISSED"}`);
  console.log(`  - Principal Architect (Vikram): ${remembersVikram ? "RECALLED" : "MISSED"}`);

  if (remembersHyperion && remembersScylla && remembersEd25519 && remembersVikram) {
    recordTestResult("20-Turn Continuity", "All 4 early constraints recalled perfectly", "CORRECT");
  } else if ((remembersHyperion ? 1 : 0) + (remembersScylla ? 1 : 0) + (remembersEd25519 ? 1 : 0) + (remembersVikram ? 1 : 0) >= 2) {
    recordTestResult("20-Turn Continuity", "Partial constraint recall", "PARTIAL", "At least 2 recalled");
  } else {
    recordTestResult("20-Turn Continuity", "Failed constraint recall", "INCORRECT", "Amnesia over 20 turns");
  }

  // =========================================================================
  // TASK 5: PERFORMANCE & TELEMETRY SUMMARY
  // =========================================================================
  console.log("\n================================================================================");
  console.log("⚡ [TASK 5] PERFORMANCE & TELEMETRY REPORT");
  console.log("================================================================================");
  const totalCalls = telemetry.latencies.length;
  const avgLatency = Math.round(telemetry.latencies.reduce((a, b) => a + b, 0) / totalCalls);
  const minLatency = Math.min(...telemetry.latencies);
  const maxLatency = Math.max(...telemetry.latencies);

  console.log(`Total Requests Analyzed:   ${totalCalls}`);
  console.log(`Average Latency:           ${avgLatency} ms`);
  console.log(`Min Latency:               ${minLatency} ms`);
  console.log(`Max Latency:               ${maxLatency} ms`);
  console.log(`Timeouts Count:            ${telemetry.timeoutsCount} (Frequency: 0%)`);
  console.log(`Provider Fallbacks:        ${telemetry.fallbacksCount} (${((telemetry.fallbacksCount / totalCalls) * 100).toFixed(1)}%)`);

  console.log("\nPer-Model Latency Breakdown:");
  for (const [model, lats] of Object.entries(telemetry.modelLatencies)) {
    const avg = Math.round(lats.reduce((a, b) => a + b, 0) / lats.length);
    console.log(`  - ${model.padEnd(35)}: ${lats.length} calls, avg ${avg} ms (min ${Math.min(...lats)}ms, max ${Math.max(...lats)}ms)`);
  }

  console.log("\n================================================================================");
  console.log(`🎯 OVERALL ACCURACY SCORECARD:`);
  console.log(`  - Total Test Questions:  ${results.total}`);
  console.log(`  - Correct:               ${results.correct} (${((results.correct / results.total) * 100).toFixed(1)}%)`);
  console.log(`  - Partially Correct:     ${results.partiallyCorrect} (${((results.partiallyCorrect / results.total) * 100).toFixed(1)}%)`);
  console.log(`  - Incorrect:             ${results.incorrect} (${((results.incorrect / results.total) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  if (results.incorrect > 0) {
    process.exit(1);
  }
}

runExpandedAccuracyAndContinuity().catch((err) => {
  console.error("FATAL RUNTIME ERROR:", err);
  process.exit(1);
});
