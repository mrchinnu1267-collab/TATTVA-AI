/**
 * TATTVA AI - Custom Model Training & Multi-Domain Pipeline Test Suite
 * Validates:
 * 1. Centralized dataset registry (16 datasets across all 7 categories)
 * 2. Training/Evaluation boundary isolation & test contamination blocking
 * 3. Universal SFT data conversion (Alpaca, ChatML, HuggingFace)
 * 4. Hardware feasibility checks on RTX 3050 (4 GB VRAM)
 * 5. Fine-tuning job configuration & human-in-the-loop approval gate
 * 6. Multi-dimensional model evaluation & baseline comparator
 * 7. TATTVA proprietary model registration & routing
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { datasetRegistry } from "../app/lib/evaluation/datasets/dataset-registry";
import { universalTrainingPipeline } from "../app/lib/training/pipeline/universal-training-pipeline";
import { tattvaFineTuningEngine } from "../app/lib/training/fine-tuning/tattva-finetuning-engine";
import { customModelEvaluator } from "../app/lib/evaluation/custom-model-evaluator";
import { modelRouter } from "../app/lib/ai-orchestrator/model-router";
import fs from "fs";
import path from "path";

export async function runCustomModelTrainingPipelineTests() {
  console.log("\n==================================================================");
  console.log("🚀 TATTVA AI - CUSTOM MODEL TRAINING & MULTI-DOMAIN PIPELINE TESTS");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      throw new Error(`Assertion failed: ${testName}${detail ? ` - ${detail}` : ""}`);
    }
  }

  // --- 1. Dataset Discovery & Manifest Integrity ---
  console.log("--- 1. Dataset Discovery & Manifest Integrity ---");
  const allDatasets = datasetRegistry.listDatasets();
  assert(allDatasets.length >= 16, `Registered datasets >= 16 (got: ${allDatasets.length})`);

  const trainSets = datasetRegistry.listDatasetsByType("training");
  const evalSets = datasetRegistry.listDatasetsByType("evaluation");

  assert(trainSets.length === 6, `Training datasets count is exactly 6 (got: ${trainSets.length})`);
  assert(evalSets.length >= 10, `Evaluation datasets count is at least 10 (got: ${evalSets.length})`);

  // Verify categories
  const categories = ["mathematics", "conversations", "instruction_following", "multilingual", "coding", "tool_use"];
  for (const cat of categories) {
    const sets = datasetRegistry.listDatasetsByCategory(cat);
    assert(sets.length > 0, `Category '${cat}' has registered datasets`);
  }

  // --- 2. Training/Evaluation Separation & Contamination Guards ---
  console.log("\n--- 2. Training/Evaluation Separation & Contamination Guards ---");
  for (const es of evalSets) {
    const leakCheck = datasetRegistry.preventTrainingDataLeakage({ datasetId: es.id });
    assert(!leakCheck.allowed, `Evaluation set '${es.id}' strictly barred from training pipeline`);
  }

  for (const ts of trainSets) {
    const leakCheck = datasetRegistry.preventTrainingDataLeakage({ datasetId: ts.id });
    assert(leakCheck.allowed, `Training set '${ts.id}' authorized for training pipeline`);
  }

  // Attempting to export an eval dataset via training pipeline throws DataContaminationViolation
  let evalExportBlocked = false;
  try {
    await universalTrainingPipeline.prepareAndExportSftDataset({
      datasetId: "gsm8k-evaluation",
      format: "alpaca",
    });
  } catch (err: any) {
    evalExportBlocked = true;
    assert(
      err.name === "DataContaminationViolation" || err.message.includes("Contamination"),
      `Clean exception on evaluation leakage: ${err.message}`
    );
  }
  assert(evalExportBlocked, "Evaluation dataset ingestion strictly blocked from training export");

  // --- 3. Universal SFT Data Conversion ---
  console.log("\n--- 3. Universal SFT Data Conversion ---");
  // Test ChatML export on instruction dataset
  const instExport = await universalTrainingPipeline.prepareAndExportSftDataset({
    datasetId: "tulu3-flan-instruction-train",
    format: "chatml",
    validationRatio: 0.2,
  });
  assert(instExport.totalRecordsLoaded > 0, `Instruction records loaded: ${instExport.totalRecordsLoaded}`);
  assert(fs.existsSync(instExport.trainFilePath), `Train JSONL exists at: ${instExport.trainFilePath}`);
  assert(Boolean(instExport.valFilePath && fs.existsSync(instExport.valFilePath)), `Validation JSONL exists`);
  assert(instExport.sha256Checksum.length === 64, `SHA-256 checksum generated: ${instExport.sha256Checksum.slice(0, 16)}...`);

  // Test Alpaca export on multilingual dataset
  const multiExport = await universalTrainingPipeline.prepareAndExportSftDataset({
    datasetId: "aya-indic-multilingual-train",
    format: "alpaca",
  });
  assert(multiExport.trainCount > 0, `Multilingual Alpaca samples exported: ${multiExport.trainCount}`);
  const multiSample = JSON.parse(fs.readFileSync(multiExport.trainFilePath, "utf8").split("\n")[0]);
  assert(Boolean(multiSample.instruction && multiSample.output), "Alpaca structure contains instruction and output");

  // Test Tool-Use export
  const toolExport = await universalTrainingPipeline.prepareAndExportSftDataset({
    datasetId: "xlam-tool-use-train",
    format: "chatml",
  });
  assert(toolExport.trainCount > 0, `Tool-use ChatML samples exported: ${toolExport.trainCount}`);
  const toolSample = JSON.parse(fs.readFileSync(toolExport.trainFilePath, "utf8").split("\n")[0]);
  assert(Array.isArray(toolSample.messages), "Tool-use ChatML sample contains messages array");

  // --- 4. Hardware Feasibility Checks (RTX 3050 4GB) ---
  console.log("\n--- 4. Hardware Feasibility Checks (RTX 3050 4GB) ---");
  const qwen15Feasibility = tattvaFineTuningEngine.evaluateHardwareFeasibility("Qwen/Qwen2.5-1.5B-Instruct", "qlora");
  assert(qwen15Feasibility.isFeasibleLocally, "Qwen2.5-1.5B QLoRA assessed as feasible on local RTX 3050 (4GB)");
  assert(qwen15Feasibility.estimatedPeakVramMb < 4096, `Peak VRAM ${qwen15Feasibility.estimatedPeakVramMb} MB is under 4096 MB`);
  assert(qwen15Feasibility.headroomMb > 500, `Healthy VRAM headroom: ${qwen15Feasibility.headroomMb} MB`);

  const qwen7Feasibility = tattvaFineTuningEngine.evaluateHardwareFeasibility("Qwen/Qwen2.5-7B-Instruct", "qlora");
  assert(!qwen7Feasibility.isFeasibleLocally, "Qwen2.5-7B correctly flagged as infeasible for local 4GB GPU");
  assert(qwen7Feasibility.targetDevice === "cloud_required", "Target device correctly flagged as 'cloud_required'");

  // --- 5. Fine-Tuning Job Configuration & Human Gate ---
  console.log("\n--- 5. Fine-Tuning Job Configuration & Human Gate ---");
  const job = await tattvaFineTuningEngine.configureFineTuningJob({
    jobName: "tattva-math-reasoning-lora",
    baseModelId: "Qwen/Qwen2.5-1.5B-Instruct",
    datasetId: "gsm8k-train",
    datasetFormat: "chatml",
    method: "qlora",
  });

  assert(Boolean(job.jobId), `Fine-tuning job created: ${job.jobId}`);
  assert(job.requiresHumanApproval === true, "Requires human approval is strictly true");
  assert(job.approvalGranted === false, "Approval granted is strictly false by default");
  assert(fs.existsSync(job.trainingScriptPath), `Generated training script exists at: ${job.trainingScriptPath}`);

  const scriptContent = fs.readFileSync(job.trainingScriptPath, "utf8");
  assert(scriptContent.includes("BitsAndBytesConfig"), "Training script contains 4-bit NF4 quantization config");
  assert(scriptContent.includes("LoraConfig"), "Training script contains PEFT LoRA configuration");
  assert(scriptContent.includes("SFTTrainer"), "Training script utilizes TRL SFTTrainer");

  // Test granting human approval
  const approvedJob = tattvaFineTuningEngine.grantHumanApproval(job.jobId, "lead_ai_architect");
  assert(approvedJob.approvalGranted === true, "Job approval successfully granted");
  assert(approvedJob.status === "approved", "Job status transitioned to 'approved'");

  // --- 6. Model Evaluation Engine ---
  console.log("\n--- 6. Model Evaluation Engine ---");
  const baseScorecard = await customModelEvaluator.evaluateModel("qwen2.5-1.5b-base", "Qwen 2.5 1.5B Base", true);
  assert(baseScorecard.overallAccuracy > 0, `Base model overall accuracy: ${baseScorecard.overallAccuracy}%`);
  assert(Boolean(baseScorecard.categoryResults.mathematics), "Mathematics scorecard evaluated");
  assert(Boolean(baseScorecard.categoryResults.coding), "Coding scorecard evaluated");
  assert(Boolean(baseScorecard.categoryResults.multilingual), "Telugu & Multilingual scorecard evaluated");
  assert(Boolean(baseScorecard.categoryResults.tool_use), "Tool-use scorecard evaluated");

  const ftScorecard = await customModelEvaluator.evaluateModel("tattva-qwen-1.5b-math", "TATTVA Math 1.5B", true);
  const comparison = customModelEvaluator.compareModels(baseScorecard, ftScorecard);
  assert(typeof comparison.overallAccuracyDelta === "number", `Accuracy delta calculated: ${comparison.overallAccuracyDelta}%`);
  assert(Boolean(comparison.conclusion), "Empirical comparison conclusion generated");

  // --- 7. TATTVA Model Registry & Routing ---
  console.log("\n--- 7. TATTVA Model Registry & Routing ---");
  const catalog = modelRouter.getModelCatalog();
  const tattvaModels = catalog.filter((m) => m.provider === "tattva");
  assert(tattvaModels.length >= 3, `TATTVA specialized models registered: ${tattvaModels.length}`);

  const mathModel = catalog.find((m) => m.id === "tattva-qwen-1.5b-math");
  assert(Boolean(mathModel), "tattva-qwen-1.5b-math found in Model Router catalog");
  assert(mathModel?.strengths.includes("mathematics") === true, "Model catalog lists 'mathematics' strength");

  const indicModel = catalog.find((m) => m.id === "tattva-indic-1.5b");
  assert(Boolean(indicModel), "tattva-indic-1.5b found in Model Router catalog");

  const edgeModel = catalog.find((m) => m.id === "tattva-llama-1b-chat");
  assert(Boolean(edgeModel), "tattva-llama-1b-chat found in Model Router catalog");

  console.log("\n==================================================================");
  console.log(`✅ ALL ${passed} / ${total} CUSTOM MODEL & MULTI-DOMAIN PIPELINE TESTS PASSED!`);
  console.log("==================================================================\n");

  return { passed, total };
}

// Direct execution entrypoint
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes("custom-model-training-pipeline")) {
  runCustomModelTrainingPipelineTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
