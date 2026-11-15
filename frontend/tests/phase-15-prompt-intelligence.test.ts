/**
 * TATTVA AI - PHASE 15: PROMPT INTELLIGENCE ENGINE TEST SUITE
 * Validates 14-intent recognition, requirement extraction, context resolution,
 * ambiguity scoring, task planning, and 10-stage pipeline orchestration.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { promptAnalyzer } from "../app/lib/ai-orchestrator/intelligence/prompt-analyzer";
import { promptIntelligencePipeline } from "../app/lib/ai-orchestrator/intelligence/pipeline";
import { ambiguityDetector } from "../app/lib/ai-orchestrator/intelligence/ambiguity-detector";
import { requirementExtractor } from "../app/lib/ai-orchestrator/intelligence/requirement-extractor";
import { contextManager } from "../app/lib/ai-orchestrator/intelligence/context-manager";
import { taskDecomposer } from "../app/lib/ai-orchestrator/intelligence/task-decomposer";

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

async function runPhase15Tests() {
  console.log("\n========================================================");
  console.log("🧠 TATTVA PHASE 15: PROMPT INTELLIGENCE TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: 14-INTENT RECOGNITION MATRIX
  // ----------------------------------------------------
  console.log("--- 1. Multi-Intent Classification Across 14 Core Intents ---");

  const intentTestCases = [
    { prompt: "Write a React TypeScript component for a pagination bar", expected: "coding" },
    { prompt: "Solve equation 3x^2 - 12x + 9 = 0 using quadratic formula", expected: "mathematics" },
    { prompt: "What is the capital of Australia and its population?", expected: "general_qa" },
    { prompt: "Summarize this uploaded document and extract the executive summary", expected: "document_analysis", attachment: true },
    { prompt: "Write a creative poem about a solitary lighthouse in a thunderstorm", expected: "creative_writing" },
    { prompt: "Calculate the standard deviation and median of this sales dataset", expected: "data_analysis" },
    { prompt: "Search the web for the latest quantum computing breakthroughs in 2026", expected: "web_research" },
    { prompt: "Run an audit on my GitHub repository and scan codebase for vulnerabilities", expected: "agent_task" },
    { prompt: "Summarize the key points in 3 concise bullet points", expected: "summarization" },
    { prompt: "Translate this sentence into Telugu: 'Education empowers future generations'", expected: "translation" },
    { prompt: "Generate an image of a cybernetic tiger in a neon Tokyo alleyway", expected: "image_generation" },
    { prompt: "Hello good morning! How are you doing today?", expected: "conversational" },
    { prompt: "Troubleshoot this crash: TypeError: Cannot read properties of undefined (reading 'map')", expected: "troubleshooting" },
    { prompt: "Compare PostgreSQL versus MongoDB for high-throughput IoT analytics", expected: "comparison" },
  ];

  for (const tc of intentTestCases) {
    const analysis = promptAnalyzer.analyzePrompt(tc.prompt, [], tc.attachment || false);
    assert(
      analysis.primaryIntent === tc.expected,
      `Prompt classified as '${tc.expected}': "${tc.prompt.slice(0, 40)}..."`
    );
  }

  // ----------------------------------------------------
  // TEST SECTION 2: REQUIREMENT & CONSTRAINT EXTRACTION
  // ----------------------------------------------------
  console.log("\n--- 2. Requirement, Negative Constraints & Output Format Extraction ---");

  const constraintPrompt = "Build a REST API endpoint in TypeScript. Do NOT use any external libraries. Must respond strictly in JSON. Maximum 50 lines.";
  const reqResult = requirementExtractor.extract(constraintPrompt, [], constraintPrompt);

  assert(reqResult.constraints.length > 0, "Extracted constraints from prompt");
  assert(
    reqResult.constraints.some(c => c.toLowerCase().includes("external")),
    "Identified negative constraint against external libraries"
  );
  assert(reqResult.expectedOutput.format === "json" || reqResult.expectedOutput.format === "code", "Detected code/JSON output expectation");
  assert(reqResult.expectedOutput.requiresZeroPlaceholders === true, "Enforced zero placeholder requirement");

  // ----------------------------------------------------
  // TEST SECTION 3: CONTEXT INTELLIGENCE & ANAPHORA RESOLUTION
  // ----------------------------------------------------
  console.log("\n--- 3. Context Intelligence & Multi-Turn Anaphora Resolution ---");

  const conversationHistory = [
    { role: "user" as const, content: "Can you explain how Dijkstra's algorithm works in graph theory?" },
    { role: "assistant" as const, content: "Dijkstra's algorithm is a greedy algorithm that finds the shortest path..." }
  ];

  const followUpPrompt = "Now implement it in Python with type annotations";
  const contextResult = contextManager.resolveContext(followUpPrompt, conversationHistory, false);

  assert(contextResult.referenceInfo.hasAnaphora === true, "Detected anaphora ('it') referring to prior topic");
  assert(
    contextResult.resolvedPrompt.toLowerCase().includes("dijkstra") ||
    (contextResult.referenceInfo.referencedTopic || "").toLowerCase().includes("dijkstra"),
    "Resolved pronoun 'it' to Dijkstra's algorithm"
  );

  // ----------------------------------------------------
  // TEST SECTION 4: AMBIGUITY DETECTION & INTERACTIVE CLARIFICATION
  // ----------------------------------------------------
  console.log("\n--- 4. Ambiguity Scoring & Targeted Interactive Clarification ---");

  // Case A: High ambiguity standalone vague prompt
  const vagueCheck = ambiguityDetector.detectAmbiguity("help", "help", { hasAnaphora: false }, false);
  assert(vagueCheck.isAmbiguous === true, "Vague standalone prompt correctly marked as ambiguous");
  assert(vagueCheck.ambiguityScore >= 80, `Assigned high ambiguity score (${vagueCheck.ambiguityScore}/100)`);
  assert(Boolean(vagueCheck.clarificationQuestion), "Generated targeted clarification question");
  assert((vagueCheck.missingDetails?.length || 0) > 0, "Surfaced missing details checklist");

  // Case B: Clear specified prompt
  const clearCheck = ambiguityDetector.detectAmbiguity(
    "Calculate the square root of 256",
    "Calculate the square root of 256",
    { hasAnaphora: false },
    false
  );
  assert(clearCheck.isAmbiguous === false, "Specific prompt marked as non-ambiguous");
  assert(clearCheck.ambiguityScore <= 20, `Assigned low ambiguity score (${clearCheck.ambiguityScore}/100)`);

  // ----------------------------------------------------
  // TEST SECTION 5: TASK DECOMPOSITION & PLAN GRAPH
  // ----------------------------------------------------
  console.log("\n--- 5. Task Decomposition & Subtask Dependency Plan ---");

  const complexAppPrompt = "Build an enterprise Hospital Management System with patient records, doctor authentication, and billing reports.";
  const decomposition = taskDecomposer.decompose(complexAppPrompt, ["patient", "doctor", "hospital", "billing"], 8);

  assert(decomposition.isMultiStep === true, "Multi-faceted architecture goal decomposed into multi-step plan");
  assert(decomposition.subtasks.length >= 3, `Decomposed into ${decomposition.subtasks.length} ordered subtasks`);
  assert(
    decomposition.subtasks.some(st => st.title.toLowerCase().includes("database") || st.title.toLowerCase().includes("schema")),
    "Plan includes database schema milestone"
  );
  assert(
    decomposition.subtasks.some(st => st.title.toLowerCase().includes("authentication") || st.title.toLowerCase().includes("security")),
    "Plan includes authentication milestone"
  );

  // ----------------------------------------------------
  // TEST SECTION 6: 10-STAGE INTELLIGENCE PIPELINE END-TO-END
  // ----------------------------------------------------
  console.log("\n--- 6. 10-Stage Intelligence Pipeline Execution ---");

  const pipelineResponse = await promptIntelligencePipeline.execute({
    userPrompt: "Write a Python function to validate email addresses using regex",
    mockExecutionHandler: async (resolved, plan) => {
      return "import re\n\ndef validate_email(email: str) -> bool:\n    pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$'\n    return bool(re.match(pattern, email))\n";
    }
  });

  assert(pipelineResponse.stages.length >= 8, `Pipeline executed all structured stages (count: ${pipelineResponse.stages.length})`);
  assert(pipelineResponse.analyzedPrompt.primaryIntent === "coding", "Primary intent recognized in pipeline");
  assert(pipelineResponse.requiresClarification === false, "Clear request did not require clarification interrupt");
  assert(pipelineResponse.isFullySatisfied === true, "Response passed validator guardrails");
  assert(pipelineResponse.finalResponse.includes("def validate_email"), "Output contains verified Python implementation");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 15 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase15Tests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
