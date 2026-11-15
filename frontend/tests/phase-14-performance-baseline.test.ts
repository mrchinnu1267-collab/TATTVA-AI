/**
 * TATTVA AI - Phase 14 Performance Baseline Test Suite
 * Validates 12-Category Foundation Intelligence Benchmarking
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { baselineEvaluator } from "../app/lib/evaluation/baseline/baseline-evaluator";
import { BASELINE_EVALUATION_QUESTIONS } from "../app/lib/evaluation/baseline/baseline-dataset";
import { BaselineCategory } from "../app/lib/evaluation/baseline/types";

export async function runPhase14BaselineTests() {
  console.log("\n========================================================");
  console.log("📊 TATTVA PHASE 14: PERFORMANCE BASELINE TEST SUITE");
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

  // 1. Corpus Category Coverage Check (All 12 Categories)
  console.log("--- 1. Baseline Corpus Category Representation ---");
  const categoriesInCorpus = new Set(BASELINE_EVALUATION_QUESTIONS.map((q) => q.category));
  const expectedCategories: BaselineCategory[] = [
    "general_knowledge",
    "logical_reasoning",
    "mathematical_reasoning",
    "instruction_following",
    "prompt_understanding",
    "conversational_capability",
    "coding",
    "context_retention",
    "multilingual_understanding",
    "tool_usage",
    "document_understanding",
    "retrieval_accuracy",
  ];

  for (const cat of expectedCategories) {
    assert(categoriesInCorpus.has(cat), `Category '${cat}' is represented in baseline corpus`);
  }

  // 2. Mock Handler for Model A (High-performing model, ~90% accuracy)
  console.log("--- 2. Single Model Baseline Evaluation Execution ---");
  const modelAResult = await baselineEvaluator.evaluateModel("gemini", "gemini-2.5-flash", {
    mockHandler: async (q) => {
      switch (q.id) {
        case "gk_01":
          return { text: "Amaravati is the capital of Andhra Pradesh, situated on the Krishna River.", latencyMs: 650 };
        case "lr_01":
          return { text: "No, it does not necessarily follow because some flowers fading quickly may not include any roses.", latencyMs: 720 };
        case "mr_01":
          return { text: "Speed is 72 km/h = 20 m/s. Total distance = 460 m. Train length = 460 - 260 = 200 m.", latencyMs: 800 };
        case "if_01":
          return { text: '{"title": "K8s Guide", "version": "1.0", "tags": ["docker", "serverless", "devops"]}', latencyMs: 610 };
        case "pu_01":
          return { text: "FROM python:3.11\nWORKDIR /app\nCOPY . .\nCMD [\"uvicorn\", \"main:app\"]", latencyMs: 630 };
        case "cc_01":
          return { text: "Take a deep breath and a short break. It happens to all developers! A typo can be sneaky.", latencyMs: 710 };
        case "code_01":
          return { text: "function isValidPalindrome(s: string): boolean { const clean = s.toLowerCase().replace(/[^a-z0-9]/g, ''); return clean === clean.split('').reverse().join(''); }", latencyMs: 850 };
        case "cr_01":
          return { text: "Your pet is an African Grey Parrot named Aristotle.", latencyMs: 640 };
        case "ml_01":
          return { text: "Solar electricity/power is very beneficial for environmental protection.", latencyMs: 780 };
        case "tu_01":
          return { text: "Using the calculation tool, 8492 * 3291 = 27947172.", latencyMs: 690 };
        case "du_01":
          return { text: "According to the report excerpt on Page 14, the churn rate was 1.2% with $14.2M recurring revenue.", latencyMs: 820 };
        case "ra_01":
          return { text: "TATTVA AI utilizes Mulberry32 PRNG to ensure 100% reproducible benchmark question sampling.", latencyMs: 740 };
        default:
          return { text: "Default accurate response", latencyMs: 700 };
      }
    },
  });

  assert(Boolean(modelAResult.modelId === "gemini-2.5-flash"), "Model ID matches evaluation target");
  assert(modelAResult.overallScore >= 90, `Model A achieved high score: ${modelAResult.overallScore}/100`);
  assert(modelAResult.overallAccuracy === 100, `Model A accuracy is 100% (${modelAResult.overallAccuracy}%)`);
  assert(Object.keys(modelAResult.categoryScores).length === 12, "Scored all 12 distinct categories");

  // 3. Hallucination and Rubric Violation Grading Test
  console.log("--- 3. Hallucination Detection & Rubric Penalties ---");
  const flawedModelResult = await baselineEvaluator.evaluateModel("openai", "gpt-4o-mini", {
    mockHandler: async (q) => {
      if (q.id === "gk_01") {
        // Hallucination: Claims Hyderabad is current capital
        return { text: "The capital of Andhra Pradesh is Hyderabad on the Musi river.", latencyMs: 500 };
      }
      if (q.id === "lr_01") {
        // Flawed logic: claims YES it follows
        return { text: "Yes, it necessarily follows that roses fade quickly.", latencyMs: 520 };
      }
      if (q.id === "if_01") {
        // Negative keyword violation: includes markdown and conversational filler
        return { text: "Here is your JSON object:\n```json\n{\"title\": \"A\", \"version\": \"1\", \"tags\": [\"a\"]}\n```", latencyMs: 480 };
      }
      return { text: "Generic answer", latencyMs: 500 };
    },
  });

  const gkScore = flawedModelResult.categoryScores.general_knowledge;
  assert(gkScore.hallucinationRatePercentage > 0, "Correctly flagged hallucination on incorrect capital answer");
  assert(gkScore.passedQuestions === 0, "General knowledge failed on hallucinated answer");

  const lrScore = flawedModelResult.categoryScores.logical_reasoning;
  assert(lrScore.passedQuestions === 0, "Logical reasoning failed on flawed deductive step");

  const ifScore = flawedModelResult.categoryScores.instruction_following;
  assert(ifScore.passedQuestions === 0, "Instruction following penalized on markdown constraint violation");

  // 4. Multi-Model Comparative Baseline Report
  console.log("--- 4. Comparative Baseline Report Generation ---");
  const comparisonReport = baselineEvaluator.generateComparisonReport([modelAResult, flawedModelResult]);

  assert(Boolean(comparisonReport.id), `Generated comparison report: ${comparisonReport.id}`);
  assert(comparisonReport.models.length === 2, "Report evaluates both models");
  assert(Boolean(comparisonReport.summaryStrengthsAndWeaknesses["gemini-2.5-flash"]), "Generated strength/weakness profile for Model A");

  // 5. Vault Persistence
  console.log("--- 5. Vault Persistence & Report Retrieval ---");
  const retrievedReport = baselineEvaluator.getReportById(comparisonReport.id);
  assert(Boolean(retrievedReport && retrievedReport.id === comparisonReport.id), `Retrieved baseline report from vault: ${retrievedReport?.id}`);

  // Summary
  console.log("\n========================================================");
  console.log(`🏁 PHASE 14 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    throw new Error(`Phase 14 tests failed: ${total - passed} failure(s)`);
  }
  return { passed, total };
}

if (require.main === module || process.argv.includes("--run")) {
  runPhase14BaselineTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
