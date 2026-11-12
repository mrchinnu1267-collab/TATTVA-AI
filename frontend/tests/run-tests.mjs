import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

console.log("\n🚀 Running TATTVA AI Test Suite...\n");

try {
  await jiti("./prompt-compiler-phase-a.test.ts");
  await jiti("./reference-conditioning-phase-b.test.ts");
  await jiti("./multi-model-router-phase-c.test.ts");
  await jiti("./spatial-control-phase-d.test.ts");
  const phaseE = await jiti("./visual-evaluation-phase-e.test.ts");
  if (phaseE?.runVisualEvaluationPhaseETests) {
    await phaseE.runVisualEvaluationPhaseETests();
  }
  const infraRepair = await jiti("./image-infrastructure-repair.test.ts");
  if (infraRepair?.runInfrastructureRepairTests) {
    await infraRepair.runInfrastructureRepairTests();
  }
  const phaseF = await jiti("./super-resolution-enhancement.test.ts");
  if (phaseF?.runSuperResolutionEnhancementTests) {
    await phaseF.runSuperResolutionEnhancementTests();
  }
  const phaseG = await jiti("./model-customization-lora.test.ts");
  if (phaseG?.runModelCustomizationLoRATests) {
    await phaseG.runModelCustomizationLoRATests();
  }
  const phaseH = await jiti("./image-editing-manipulation.test.ts");
  if (phaseH?.runImageEditingManipulationTests) {
    await phaseH.runImageEditingManipulationTests();
  }
  const phaseI = await jiti("./subject-consistency.test.ts");
  if (phaseI?.runSubjectConsistencyTests) {
    await phaseI.runSubjectConsistencyTests();
  }
  const promptAccuracy = await jiti("./prompt-accuracy-system.test.ts");
  if (promptAccuracy?.runPromptAccuracySystemTests) {
    await promptAccuracy.runPromptAccuracySystemTests();
  }
  const phaseJ = await jiti("./model-benchmarking-intelligence.test.ts");
  if (phaseJ?.runModelBenchmarkingIntelligenceTests) {
    await phaseJ.runModelBenchmarkingIntelligenceTests();
  }
  const phaseK = await jiti("./production-reliability-engineering.test.ts");
  if (phaseK?.runProductionReliabilityTests) {
    await phaseK.runProductionReliabilityTests();
  }
  const phaseL = await jiti("./unified-image-studio-phase-l.test.ts");
  if (phaseL?.runUnifiedImageStudioPhaseLTests) {
    await phaseL.runUnifiedImageStudioPhaseLTests();
  }
  const phaseM = await jiti("./phase-m-validation.test.ts");
  if (phaseM?.runPhaseMAccuracyValidationTests) {
    await phaseM.runPhaseMAccuracyValidationTests();
  }
  const phaseN = await jiti("./phase-n-continuous-learning.test.ts");
  if (phaseN?.runPhaseNContinuousLearningTests) {
    await phaseN.runPhaseNContinuousLearningTests();
  }
  const phaseO = await jiti("./phase-o-regression-testing.test.ts");
  if (phaseO?.runPhaseORegressionTestingTests) {
    await phaseO.runPhaseORegressionTestingTests();
  }
  const phaseP = await jiti("./phase-p-production-release.test.ts");
  if (phaseP?.runPhasePProductionReleaseTests) {
    await phaseP.runPhasePProductionReleaseTests();
  }
  const phaseQ = await jiti("./phase-q-production-monitoring.test.ts");
  if (phaseQ?.runPhaseQProductionMonitoringTests) {
    await phaseQ.runPhaseQProductionMonitoringTests();
  }
  const phaseR = await jiti("./phase-r-accuracy-research.test.ts");
  if (phaseR?.runPhaseRAccuracyResearchTests) {
    await phaseR.runPhaseRAccuracyResearchTests();
  }
  const phaseS = await jiti("./phase-s-nextgen-architecture.test.ts");
  if (phaseS?.runPhaseSNextGenArchitectureTests) {
    await phaseS.runPhaseSNextGenArchitectureTests();
  }
  const phaseT = await jiti("./phase-t-accuracy-optimization.test.ts");
  if (phaseT?.runPhaseTAccuracyOptimizationTests) {
    await phaseT.runPhaseTAccuracyOptimizationTests();
  }
  const phaseU = await jiti("./phase-u-real-world-validation.test.ts");
  if (phaseU?.runPhaseURealWorldValidationTests) {
    await phaseU.runPhaseURealWorldValidationTests();
  }
  const phaseV = await jiti("./phase-v-final-certification.test.ts");
  if (phaseV?.runPhaseVFinalCertificationTests) {
    await phaseV.runPhaseVFinalCertificationTests();
  }
  await jiti("./main-chat.test.ts");
  await jiti("./image-generation-multimodel.test.ts");
  await jiti("./prompt-accuracy-50.test.ts");
  await jiti("./multimodal-rag-vision.test.ts");
  await jiti("./safety-input-validation.test.ts");
  await jiti("./workspace-applications.test.ts");
  await jiti("./auth-redirect.test.ts");
  await jiti("./claude-connectors.test.ts");
  await jiti("./connectors-e2e.test.ts");
  await jiti("./document-reader.test.ts");
  await jiti("./human-intelligence.test.ts");
  await jiti("./research-file-engine.test.ts");
  console.log("\n✅ All Test Suites passed successfully!\n");
  process.exit(0);
} catch (err) {
  console.error("\n❌ Test execution failed:", err);
  process.exit(1);
}
