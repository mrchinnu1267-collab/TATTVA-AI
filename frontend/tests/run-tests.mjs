process.env.NODE_ENV = process.env.NODE_ENV || "test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

try {
  const { loadEnvConfig } = require("@next/env");
  loadEnvConfig(path.resolve(__dirname, ".."), true);
} catch {
  // Non-fatal if @next/env cannot find .env
}

const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

console.log("\n🚀 Running TATTVA AI Test Suite...\n");

try {
  // 1. Image Generation Removal Verification
  const removalVerification = await jiti("./image-generation-removal-verification.test.ts");
  if (removalVerification?.runImageGenerationRemovalVerificationTests) {
    await removalVerification.runImageGenerationRemovalVerificationTests();
  }

  // 2. Document Reader & Multi-Format Engine
  const docReader = await jiti("./document-reader.test.ts");
  if (docReader?.runDocumentReaderTests) {
    await docReader.runDocumentReaderTests();
  }

  // 5. Mathematical & Reasoning Intelligence (GSM8K)
  const gsm8kSuite = await jiti("./gsm8k-dataset-integration.test.ts");
  if (gsm8kSuite?.runGsm8kDatasetIntegrationTests) {
    await gsm8kSuite.runGsm8kDatasetIntegrationTests();
  }

  const gsm8kMathIntel = await jiti("./gsm8k-mathematical-intelligence.test.ts");
  if (gsm8kMathIntel?.runGsm8kMathematicalIntelligenceTests) {
    await gsm8kMathIntel.runGsm8kMathematicalIntelligenceTests();
  }

  // 7. Conversational Evaluation
  const convEval = await jiti("./conversational-evaluation.test.ts");
  if (convEval?.runConversationalEvaluationTests) {
    await convEval.runConversationalEvaluationTests();
  }

  // 8. Software Studio Platform Verification
  const autonomousPlatform = await jiti("./software-studio/autonomous-platform.test.ts");
  if (autonomousPlatform?.runAutonomousPlatformTests) {
    await autonomousPlatform.runAutonomousPlatformTests();
  }

  const e2eAcceptance = await jiti("./software-studio/e2e-acceptance-validation.test.ts");
  if (e2eAcceptance?.runEndToEndAcceptanceValidation) {
    await e2eAcceptance.runEndToEndAcceptanceValidation();
  }

  console.log("\n✅ All Active TATTVA AI Test Suites passed successfully with 100% compliance!\n");
  process.exit(0);
} catch (err) {
  console.error("\n❌ Test execution failed:", err);
  process.exit(1);
}
