/**
 * TATTVA AI - PHASE 19: CUSTOM MODEL DEVELOPMENT TEST SUITE
 * Validates ChatML formatting, Indic dataset curation, LoRA/QLoRA configs,
 * VRAM estimation, model registry benchmarks, and deployment manifests.
 *
 * Authored by: kotapati Gowtham Chowdary
 */

import { datasetCurator } from "../app/lib/custom-models/dataset-curator";
import { trainingConfigurator } from "../app/lib/custom-models/training-config";
import { modelRegistry } from "../app/lib/custom-models/model-registry";

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

async function runPhase19Tests() {
  console.log("\n========================================================");
  console.log("⚡ TATTVA PHASE 19: CUSTOM MODEL DEVELOPMENT TEST SUITE");
  console.log("========================================================\n");

  // ----------------------------------------------------
  // TEST SECTION 1: CHATML & INDIC DATASET CURATION
  // ----------------------------------------------------
  console.log("--- 1. ChatML Formatting & Indic Dataset Curation ---");

  const exampleA = datasetCurator.curateExample(
    "ex_indic_001",
    "You are TATTVA AI, a bilingual assistant.",
    "భారతదేశ రాజధాని ఏది? (What is capital of India?)",
    "భారతదేశ రాజధాని న్యూఢిల్లీ (New Delhi). ఇది దేశ పరిపాలనా మరియు రాజకీయ కేంద్రం.",
    "indic_geography"
  );

  assert(exampleA !== null, "Curated high-quality Indic training example");
  assert(exampleA!.language === "te", "Detected Telugu Indic language script");
  assert(exampleA!.qualityScore >= 80, `Assigned strong quality score: ${exampleA!.qualityScore}/100`);

  const chatML = datasetCurator.formatToChatML(exampleA!.messages);
  assert(chatML.includes("<|im_start|>system"), "Formatted system prompt with <|im_start|> tag");
  assert(chatML.includes("<|im_start|>user"), "Formatted user query with <|im_start|> tag");
  assert(chatML.includes("<|im_start|>assistant"), "Formatted assistant response with <|im_start|> tag");
  assert(chatML.includes("<|im_end|>"), "Preserved standard ChatML turn terminator <|im_end|>");

  // ----------------------------------------------------
  // TEST SECTION 2: DATASET FILTERING & JSONL EXPORT
  // ----------------------------------------------------
  console.log("\n--- 2. Dataset Quality Filtering & JSONL Export ---");

  // Low-quality refusal example should be filtered out
  const badExample = datasetCurator.curateExample(
    "ex_bad_002",
    "System",
    "hi",
    "I cannot assist with this.",
    "general"
  );
  assert(badExample === null, "Successfully filtered out unhelpful or low-quality canned responses");

  const jsonlOutput = datasetCurator.exportToJSONL([exampleA!]);
  assert(jsonlOutput.length > 0, "Exported valid JSONL dataset");
  assert(jsonlOutput.includes("ex_indic_001"), "JSONL record contains unique sample identifier");

  // ----------------------------------------------------
  // TEST SECTION 3: LORA / QLORA TRAINING SPECIFICATIONS
  // ----------------------------------------------------
  console.log("\n--- 3. LoRA/QLoRA Hyperparameters & Hardware Estimation ---");

  const spec3B = trainingConfigurator.generateSpecification("3B");
  assert(spec3B.modelName === "TATTVA-SLM-3B-Indic", "Generated 3B SLM configuration");
  assert(spec3B.quantization === "4bit", "Configured 4-bit NormalFloat (NF4) quantization");
  assert(spec3B.lora.r === 32, "Assigned LoRA rank r=32 for 3B parameter model");
  assert(spec3B.lora.targetModules.includes("q_proj"), "Targeted key attention projections (q_proj)");
  assert(spec3B.estimatedVRAMGb <= 12, `VRAM footprint calculated within consumer bounds: ${spec3B.estimatedVRAMGb} GB`);

  const spec7B = trainingConfigurator.generateSpecification("7B");
  assert(spec7B.lora.r === 64, "Assigned expanded LoRA rank r=64 for 7B parameter model");
  assert(spec7B.estimatedVRAMGb <= 20, `7B VRAM calculated within RTX 3090/4090 capacity: ${spec7B.estimatedVRAMGb} GB`);

  const pythonScript = trainingConfigurator.generatePythonTrainingScript(spec3B);
  assert(pythonScript.includes("FastLanguageModel.from_pretrained"), "Generated Unsloth FastLanguageModel import");
  assert(pythonScript.includes("load_in_4bit=True"), "Enforced 4-bit loading parameter");

  // ----------------------------------------------------
  // TEST SECTION 4: MODEL REGISTRY & BENCHMARKS
  // ----------------------------------------------------
  console.log("\n--- 4. Model Registry & Serving Manifests ---");

  const models = modelRegistry.listModels();
  assert(models.length >= 2, `Registered ${models.length} model checkpoints in local catalog`);

  const model3B = modelRegistry.getModel("TATTVA-SLM-3B-Indic-Enterprise");
  assert(model3B !== undefined, "Retrieved 3B Indic Enterprise checkpoint");
  assert(model3B!.benchmarks.mmmluHindiAccuracy > 70, `Recorded MMLU Hindi benchmark: ${model3B!.benchmarks.mmmluHindiAccuracy}%`);
  assert(model3B!.benchmarks.mmmluTeluguAccuracy > 70, `Recorded MMLU Telugu benchmark: ${model3B!.benchmarks.mmmluTeluguAccuracy}%`);
  assert(model3B!.benchmarks.inferenceLatencyMs <= 100, `Inference latency within targets: ${model3B!.benchmarks.inferenceLatencyMs}ms`);

  const ollamaConfig = modelRegistry.getServingConfig("TATTVA-SLM-3B-Indic-Enterprise", "ollama");
  assert(Boolean(ollamaConfig?.modelfile), "Generated Ollama Modelfile manifest");

  const vllmConfig = modelRegistry.getServingConfig("TATTVA-SLM-3B-Indic-Enterprise", "vllm");
  assert(Boolean(vllmConfig?.command), "Generated vLLM server launch command");

  console.log("\n========================================================");
  console.log(`🏁 PHASE 19 TEST RESULTS: ${testsPassed}/${testsRun} PASSED (${Math.round((testsPassed / testsRun) * 100)}%)`);
  console.log("========================================================\n");
}

runPhase19Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
