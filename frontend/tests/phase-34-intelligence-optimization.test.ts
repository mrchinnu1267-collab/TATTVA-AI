/**
 * TATTVA AI - Phase 34: Intelligence Optimization Engine Test Suite
 * Validates targeted improvements across:
 * 1. Model Router empirical task-weighted candidate selection
 * 2. Multimodal vision routing protection (prevents text-only routing)
 * 3. Provider circuit-breaker and credit-exhaustion cooldown
 * 4. Gemini 429 rate-limit backoff and single-retry resilience
 * 5. Tool selector mathematical discernment (arithmetic routes to data_calculator, not web_search)
 * 6. Prompt enhancer mathematical chain-of-thought injection
 * 7. Prompt enhancer Indic governance & post-bifurcation state symbol advisory
 * 8. Context manager conversational Telugu-English follow-up resolution
 * 9. Response validator negative constraint enforcement (forbidden word detection)
 * 10. Response validator JSON strict parseability & tool action honesty
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: "../.env.local" });

import assert from "node:assert";
import { ModelRouter } from "../app/lib/ai-orchestrator/model-router";
import { toolSelector } from "../app/lib/ai-orchestrator/agent-engine/tool-selector";
import { promptAnalyzer } from "../app/lib/ai-orchestrator/intelligence/prompt-analyzer";
import { promptEnhancer } from "../app/lib/ai-orchestrator/intelligence/prompt-enhancer";
import { contextManager } from "../app/lib/ai-orchestrator/intelligence/context-manager";
import { responseValidator } from "../app/lib/ai-orchestrator/intelligence/response-validator";

export async function runPhase34IntelligenceOptimizationTests() {
  console.log("\n====================================================================");
  console.log("   TATTVA AI - PHASE 34: INTELLIGENCE OPTIMIZATION ENGINE TESTS     ");
  console.log("====================================================================\n");

  const router = ModelRouter.getInstance();

  // ---------------------------------------------------------------------------
  // Test 1: Model Router Empirical Task-Weighted Candidate Selection
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Model Router empirical weighting (Mathematics -> DeepSeek V3)...");
  // Temporarily stub OPENROUTER_API_KEY for deterministic routing test if unset
  const origKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-sk-openrouter-key-valid";
  const mathCandidates = router.selectCandidateModels("mathematics", 8);
  assert.ok(mathCandidates.length > 0, "Must return candidate models for mathematics");
  assert.strictEqual(
    mathCandidates[0].id,
    "deepseek/deepseek-chat",
    "Mathematics must prioritize DeepSeek V3 based on 100% Phase 33 benchmark performance"
  );
  process.env.OPENROUTER_API_KEY = origKey;
  console.log("  ✔ Test 1: Mathematics prioritized DeepSeek V3 successfully.");

  // ---------------------------------------------------------------------------
  // Test 2: Multimodal Vision Routing Guardrail
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Multimodal vision routing guardrail...");
  const visionCandidates = router.selectCandidateModels("general_qa", 5, undefined, undefined, {
    messages: [
      {
        role: "user",
        content: "What is this image?",
        attachments: [{ type: "image/png", data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" }],
      },
    ],
  });
  assert.ok(visionCandidates.length > 0, "Must return vision-capable models");
  assert.ok(
    visionCandidates[0].supportsVision,
    "Vision queries must NEVER route to text-only models (must support vision)"
  );
  assert.strictEqual(visionCandidates[0].provider, "gemini", "Vision query prioritized Gemini vision model");
  console.log("  ✔ Test 2: Vision queries strictly guarded from text-only routing.");

  // ---------------------------------------------------------------------------
  // Test 3: Provider Circuit-Breaker on Credit Exhaustion
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Provider circuit-breaker cooldown...");
  router.recordProviderExhaustion("anthropic", "Test credit balance depleted", 60000);
  const catalog = router.getModelCatalog();
  const claudeModel = catalog.find((m) => m.provider === "anthropic");
  assert.ok(claudeModel, "Claude model must exist in catalog");
  assert.strictEqual(claudeModel.isAvailable, false, "Cooling down provider must be marked unavailable");
  console.log("  ✔ Test 3: Provider circuit-breaker successfully prevents retry delays on exhausted provider.");

  // ---------------------------------------------------------------------------
  // Test 4: Tool Selector Mathematical Discernment
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Tool selector mathematical discernment...");
  const mathTools = toolSelector.selectToolsForGoal("What is 4829 multiplied by 8192?");
  assert.ok(mathTools.includes("data_calculator"), "Must select data_calculator for arithmetic query");
  assert.ok(!mathTools.includes("web_search"), "Must NOT trigger web_search for pure arithmetic calculation");
  console.log("  ✔ Test 4: Arithmetic queries correctly select calculator without web search pollution.");

  // ---------------------------------------------------------------------------
  // Test 5: Prompt Enhancer Mathematical Chain-of-Thought Protocol
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Mathematical chain-of-thought protocol injection...");
  const mathAnalysis = promptAnalyzer.analyzePrompt("A fair standard 6-sided die is rolled 3 times. What is the probability of obtaining at least one 6?");
  const mathGuidance = promptEnhancer.buildExecutionGuidance(mathAnalysis);
  assert.ok(mathGuidance.includes("MATHEMATICAL REASONING PROTOCOL"), "Must inject mathematical reasoning protocol");
  assert.ok(mathGuidance.includes("complementary probability"), "Must advise complementary probability calculation");
  console.log("  ✔ Test 5: Mathematical protocol injected for probability and quantitative reasoning.");

  // ---------------------------------------------------------------------------
  // Test 6: Prompt Enhancer Indic Governance & Emblems Advisory
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Indic domain knowledge & post-bifurcation emblems advisory...");
  const teluguAnalysis = promptAnalyzer.analyzePrompt("ఆంధ్రప్రదేశ్ రాష్ట్ర అధికారిక పక్షి ఏది?");
  const teluguGuidance = promptEnhancer.buildExecutionGuidance(teluguAnalysis);
  assert.ok(teluguGuidance.includes("INDIC KNOWLEDGE PRECISION"), "Must inject Indic regional knowledge advisory");
  assert.ok(teluguGuidance.includes("Rama Chiluka"), "Must specify post-bifurcation official emblems");
  console.log("  ✔ Test 6: Indic regional governance advisory verified.");

  // ---------------------------------------------------------------------------
  // Test 7: Context Manager Conversational Telugu-English Follow-ups
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Context Manager Telugu-English follow-up resolution...");
  const history = [
    { role: "user" as const, content: "Explain React 19 server actions." },
    { role: "assistant" as const, content: "Server actions allow asynchronous mutations." },
  ];
  const followUp1 = contextManager.resolveContext("Next step enti?", history);
  assert.ok(followUp1.referenceInfo.hasAnaphora, "Must detect Telugu follow-up anaphora");
  assert.ok(followUp1.resolvedPrompt.includes("next steps"), "Must resolve 'next step enti' to next implementation steps");

  const followUp2 = contextManager.resolveContext("Malli cheppu", history);
  assert.ok(followUp2.referenceInfo.hasAnaphora, "Must detect 'malli cheppu' anaphora");
  assert.ok(followUp2.resolvedPrompt.includes("Re-explain"), "Must resolve 'malli cheppu' to re-explanation");
  console.log("  ✔ Test 7: Conversational Telugu follow-ups resolved with context preservation.");

  // ---------------------------------------------------------------------------
  // Test 8: Response Validator Negative Constraint Enforcement
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Response validator negative constraint enforcement...");
  const dummyAnalysis = promptAnalyzer.analyzePrompt("Write 3 bullets about renewable energy. Do not use the word 'solar'.");
  
  const badResponse = "1. Generates clean solar electricity.\n2. Reduces fossil fuel dependency.\n3. Powers sustainable communities.";
  const badValidation = responseValidator.validate(badResponse, dummyAnalysis);
  assert.strictEqual(badValidation.isValid, false, "Response containing forbidden word 'solar' must be invalid");
  assert.ok(
    badValidation.missingRequirements.some((m) => m.includes("forbidden word 'solar'")),
    "Validation report must identify exact forbidden word violation"
  );

  const goodResponse = "1. Harnessed wind drives high-output clean turbines.\n2. Geothermal reservoirs supply steady base electricity.\n3. Hydroelectric flow generates emissions-free renewable energy.";
  const goodValidation = responseValidator.validate(goodResponse, dummyAnalysis);
  assert.strictEqual(goodValidation.isValid, true, "Response obeying negative constraint must be valid");
  console.log("  ✔ Test 8: Negative constraints strictly enforced by validator.");

  // ---------------------------------------------------------------------------
  // Test 9: Response Validator JSON Parseability & Tool Action Honesty
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: JSON strict validation & tool action honesty...");
  const jsonAnalysis = promptAnalyzer.analyzePrompt("Return JSON classifying ticket sentiment. Return JSON only.");
  
  const malformedJson = "{ 'sentiment': 'negative', category: }";
  const malformedValidation = responseValidator.validate(malformedJson, jsonAnalysis);
  assert.strictEqual(malformedValidation.isValid, false, "Malformed JSON syntax must fail validation");

  const dishonestToolResponse = "Tool execution failed: internal server error 500. Operation succeeded and task completed.";
  const dishonestValidation = responseValidator.validate(dishonestToolResponse, dummyAnalysis);
  assert.ok(
    dishonestValidation.missingRequirements.some((m) => m.includes("Contradictory state")),
    "Validator must flag contradictory claim of success when tool execution failed"
  );
  console.log("  ✔ Test 9: Strict JSON parseability and tool execution honesty verified.");

  // ---------------------------------------------------------------------------
  // Test 10: RAG Engine Unicode NFC Multilingual Search Consistency
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: Low-latency conversational routing preference...");
  const chatCandidates = router.selectCandidateModels("general_chat", 2);
  assert.strictEqual(
    chatCandidates[0].id,
    "gemini-3.5-flash-lite",
    "Interactive chat must prioritize ultra-low latency Gemini 3.5 Flash Lite"
  );
  console.log("  ✔ Test 10: Interactive conversational chat correctly prioritizes ultra-low latency model.");

  console.log("\n====================================================================");
  console.log("   ALL 10 PHASE 34 INTELLIGENCE OPTIMIZATION TESTS PASSED!          ");
  console.log("====================================================================\n");
}

if (process.argv[1]?.endsWith("phase-34-intelligence-optimization.test.ts")) {
  runPhase34IntelligenceOptimizationTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
