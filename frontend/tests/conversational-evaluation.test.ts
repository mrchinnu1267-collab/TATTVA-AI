/**
 * TATTVA AI - Conversational & Multilingual AI Evaluation Test Suite
 * Validates Multi-Turn Context Retention, Telugu-English Code-Switching,
 * Tool & Arithmetic Discernment, Topic Shift, and Rubric Scoring.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { conversationalEvaluator } from "../app/lib/evaluation/conversational/conversational-evaluator";

export async function runConversationalEvaluationTests() {
  console.log("\n========================================================");
  console.log("💬 TATTVA CONVERSATIONAL & MULTILINGUAL EVALUATION SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // 1. Loading Conversational Test Cases
  console.log("--- 1. Conversational Benchmark Test Cases ---");
  const testCases = conversationalEvaluator.loadTestCases("conversational-multiturn-eval");
  assert(testCases.length >= 4, `Loaded ${testCases.length} multi-turn conversational benchmark cases`);

  const categories = testCases.map((tc) => tc.category);
  assert(categories.includes("context_retention"), "Includes 'context_retention' test case");
  assert(categories.includes("code_switching"), "Includes 'code_switching' test case");
  assert(categories.includes("tool_selection"), "Includes 'tool_selection' test case");
  assert(categories.includes("topic_shift"), "Includes 'topic_shift' test case");

  // 2. Multi-Turn Context Retention Test
  console.log("--- 2. Multi-Turn Context Retention Assessment ---");
  const contextCase = testCases.find((tc) => tc.category === "context_retention")!;
  assert(Boolean(contextCase), "Found context retention test case");

  // Successful context retention mock
  const passingResult = await conversationalEvaluator.evaluateTestCase(
    contextCase,
    "gemini",
    "gemini-2.5-flash",
    async () => ({ text: "Based on our conversation, your dog Leo is a Golden Retriever, which typically needs 60-90 minutes of daily exercise." })
  );
  assert(passingResult.status === "pass", `Context retention passed with score: ${passingResult.score}/100`);
  assert(passingResult.criteriaPassed.length > 0, `Passed criteria verified: ${passingResult.criteriaPassed[0]}`);

  // Failing context retention mock (forgotten dog breed)
  const failingResult = await conversationalEvaluator.evaluateTestCase(
    contextCase,
    "gemini",
    "gemini-2.5-flash",
    async () => ({ text: "Dogs need regular exercise depending on what kind of dog you have." })
  );
  assert(failingResult.status !== "pass", `Correctly penalized forgotten context (status: ${failingResult.status}, score: ${failingResult.score}/100)`);

  // 3. Telugu Code-Switching Test
  console.log("--- 3. Indic / Telugu Code-Switching Assessment ---");
  const codeSwitchCase = testCases.find((tc) => tc.category === "code_switching")!;
  assert(Boolean(codeSwitchCase), "Found Telugu code-switching test case");

  const codeSwitchResult = await conversationalEvaluator.evaluateTestCase(
    codeSwitchCase,
    "gemini",
    "gemini-2.5-flash",
    async () => ({ text: "For your exams next week, here is a structured 7-day study plan: Day 1-2 Math revision, Day 3-4 Science formulas..." })
  );
  assert(codeSwitchResult.status === "pass", `Telugu code-switching passed with score: ${codeSwitchResult.score}/100`);

  // 4. Arithmetic & Tool Discernment Test
  console.log("--- 4. Arithmetic & Tool Discernment Assessment ---");
  const toolCase = testCases.find((tc) => tc.category === "tool_selection")!;
  assert(Boolean(toolCase), "Found tool selection test case");

  const toolResult = await conversationalEvaluator.evaluateTestCase(
    toolCase,
    "gemini",
    "gemini-2.5-flash",
    async () => ({ text: "The product of 4,892 and 8,086 is 39,559,168." })
  );
  assert(toolResult.status === "pass", `Arithmetic calculation verified (score: ${toolResult.score}/100)`);

  // 5. Complete Conversational Evaluation Run
  console.log("--- 5. Full Conversational Benchmark Run Execution ---");
  const summary = await conversationalEvaluator.runConversationalEvaluation(
    "gemini",
    "gemini-2.5-flash",
    "conversational-multiturn-eval",
    async (messages) => {
      const fullText = messages.map((m: any) => m.content).join(" ");
      if (fullText.includes("Leo") || fullText.includes("golden retriever")) {
        return { text: "Leo is a golden retriever and needs daily exercise and adult retriever nutrition." };
      }
      if (fullText.includes("exam") || fullText.includes("schedule")) {
        return { text: "Sure, here is your structured study schedule plan for your upcoming exam: Day 1-2 Math revision, Day 3-4 Science." };
      }
      if (fullText.includes("4829") || fullText.includes("multiplied") || fullText.includes("8192")) {
        return { text: "The exact calculation result is 39,559,168." };
      }
      return { text: "Python asyncio provides an event loop for cooperative multitasking and asynchronous I/O." };
    }
  );

  assert(Boolean(summary.id), `Generated run ID: ${summary.id}`);
  assert(summary.totalCases === testCases.length, `Evaluated all ${summary.totalCases} cases`);
  assert(summary.overallScore >= 80, `High overall benchmark score: ${summary.overallScore}/100`);
  assert(Boolean(summary.categoryScores["context_retention"]), "Computed category score for 'context_retention'");

  // 6. Persistence & Retrieval
  console.log("--- 6. Vault Persistence & History ---");
  const retrieved = conversationalEvaluator.getSummaryById(summary.id);
  assert(Boolean(retrieved && retrieved.id === summary.id), `Successfully retrieved run from vault: ${retrieved?.id}`);

  const history = conversationalEvaluator.listSummaries();
  assert(history.length >= 1, `Conversational run history contains ${history.length} summaries`);

  // Summary
  console.log("\n========================================================");
  console.log(`🏁 CONVERSATIONAL EVALUATION TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Conversational Evaluation tests failed: ${total - passed} failure(s)`);
  }
  return { passed, total };
}

if (require.main === module || process.argv.includes("--run")) {
  runConversationalEvaluationTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
