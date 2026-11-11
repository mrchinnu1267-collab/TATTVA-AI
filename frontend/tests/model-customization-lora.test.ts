import assert from "node:assert";
import {
  SUPPORTED_BASE_MODELS,
  FineTuningBaseModelId,
  LoRAAdapter,
  DatasetManifest,
} from "../app/lib/image-engine/customization/types";
import { validateAndPrepareDataset } from "../app/lib/image-engine/customization/dataset-manager";
import {
  validateTrainingConfig,
  RECOMMENDED_HYPERPARAMETERS,
} from "../app/lib/image-engine/customization/training-config";
import {
  registerTrainedAdapter,
  listAdapters,
  getAdapterById,
  setAdapterActiveStatus,
  getActiveAdapters,
  deleteAdapter,
} from "../app/lib/image-engine/customization/adapter-manager";
import {
  submitTrainingJob,
  getTrainingJobStatus,
  cancelTrainingJob,
} from "../app/lib/image-engine/customization/training-pipeline";
import { evaluateAdapterQuality } from "../app/lib/image-engine/customization/evaluation";
import { compileImagePrompt } from "../app/lib/image-engine/prompt-compiler";

export async function runModelCustomizationLoRATests() {
  console.log("\n🚀 Running Phase G: AI Image Model Fine-Tuning & LoRA Customization Test Suite...\n");

  const samplePixelData =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z/C/noEIwDiqkL4GAJ8GBfs8J+WNAAAAAElFTkSuQmCC";
  const samplePixelDataAlt =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQDwAE/wH/fUf8vwAAAABJRU5ErkJggg==";

  // -------------------------------------------------------------------------
  // Test 1: Base Model Specifications & LoRA Compatibility Catalog
  // -------------------------------------------------------------------------
  console.log("▶ Test 1: Base model specifications & LoRA compatibility catalog...");
  const baseModels = Object.values(SUPPORTED_BASE_MODELS);
  assert.ok(baseModels.length >= 4, "Must register at least 4 foundation base models");

  const sdxl = SUPPORTED_BASE_MODELS["stabilityai/stable-diffusion-xl-base-1.0"];
  assert.strictEqual(sdxl.family, "sdxl");
  assert.strictEqual(sdxl.recommendedResolution, 1024);
  assert.strictEqual(sdxl.defaultRank, 8);
  assert.strictEqual(sdxl.minTrainingVramMb, 12000, "SDXL training requires at least 12GB VRAM");

  const flux = SUPPORTED_BASE_MODELS["black-forest-labs/FLUX.1-dev"];
  assert.strictEqual(flux.family, "flux");
  assert.ok(flux.parameterCount.includes("12B"));
  assert.strictEqual(flux.minTrainingVramMb, 16000, "FLUX.1-dev training requires at least 16GB VRAM");

  const animagine = SUPPORTED_BASE_MODELS["cagliostrolab/animagine-xl-3.1"];
  assert.strictEqual(animagine.family, "sdxl");

  const sd15 = SUPPORTED_BASE_MODELS["runwayml/stable-diffusion-v1-5"];
  assert.strictEqual(sd15.family, "sd15");
  assert.strictEqual(sd15.recommendedResolution, 512);
  console.log("  ✔ Test 1: Foundation base models catalog verified successfully.");

  // -------------------------------------------------------------------------
  // Test 2: Dataset Preparation & Mandatory Copyright Consent Enforcement
  // -------------------------------------------------------------------------
  console.log("▶ Test 2: Dataset validation & copyright consent enforcement...");
  
  // Unconsented dataset must be blocked immediately
  const unconsented = await validateAndPrepareDataset({
    name: "Unlicensed Scraped Data",
    category: "artistic_style",
    triggerWord: "unlicensed_style",
    hasUserConsent: false,
    images: [
      { url: samplePixelData, caption: "sample 1" },
      { url: samplePixelDataAlt, caption: "sample 2" },
      { url: samplePixelData, caption: "sample 3" },
      { url: samplePixelDataAlt, caption: "sample 4" },
    ],
    userId: "user_test_1",
  });

  assert.strictEqual(unconsented.isValid, false, "Dataset without user consent must be rejected");
  assert.ok(
    unconsented.errors.some((e) => e.includes("consent") || e.includes("licensing")),
    "Error message must specify mandatory consent requirement"
  );

  // Consented dataset with fewer than 4 images must fail
  const tooFewImages = await validateAndPrepareDataset({
    name: "Small Dataset",
    category: "artistic_style",
    triggerWord: "small_style",
    hasUserConsent: true,
    images: [{ url: samplePixelData, caption: "single image" }],
    userId: "user_test_1",
  });
  assert.strictEqual(tooFewImages.isValid, false, "Dataset with < 4 images must be rejected");

  // Valid consented dataset
  const validDataset = await validateAndPrepareDataset({
    name: "Studio Ghibli Watercolor Style",
    category: "illustration_theme",
    triggerWord: "ghibli_watercolor",
    hasUserConsent: true,
    license: "CC-BY-4.0",
    images: [
      { url: "https://example.com/ghibli_1.png", caption: "A lush green valley with rolling hills in ghibli_watercolor" },
      { url: "https://example.com/ghibli_2.png", caption: "A rustic village bakery at dawn in ghibli_watercolor" },
      { url: "https://example.com/ghibli_3.png", caption: "A flying airship over cloud formations in ghibli_watercolor" },
      { url: "https://example.com/ghibli_4.png", caption: "A peaceful forest with water spirits in ghibli_watercolor" },
      { url: "https://example.com/ghibli_5.png", caption: "A train crossing shallow ocean waters in ghibli_watercolor" },
    ],
    userId: "user_test_1",
  });

  assert.strictEqual(validDataset.isValid, true);
  assert.ok(validDataset.manifest);
  assert.strictEqual(validDataset.manifest.totalImages, 5);
  assert.strictEqual(validDataset.manifest.trainSplitCount, 4);
  assert.strictEqual(validDataset.manifest.validationSplitCount, 1);
  console.log("  ✔ Test 2: Dataset rights and consent guardrails verified successfully.");

  // -------------------------------------------------------------------------
  // Test 3: Duplicate Image Detection via SHA-256 Hashing
  // -------------------------------------------------------------------------
  console.log("▶ Test 3: Duplicate image detection via SHA-256 hashing...");
  const dupCheck = await validateAndPrepareDataset({
    name: "Duplicate Test Set",
    category: "artistic_style",
    triggerWord: "dup_style",
    hasUserConsent: true,
    images: [
      { url: samplePixelData, caption: "Image A" },
      { url: samplePixelData, caption: "Image A duplicate" },
      { url: samplePixelDataAlt, caption: "Image B" },
      { url: samplePixelDataAlt, caption: "Image B duplicate" },
      { url: "https://example.com/distinct_1.png", caption: "Distinct image" },
    ],
    userId: "user_test_1",
  });

  assert.ok(dupCheck.duplicateCount >= 2, "Must detect identical base64 payloads");
  assert.ok(dupCheck.warnings.some((w) => w.includes("duplicate")));
  console.log("  ✔ Test 3: SHA-256 duplicate detection verified successfully.");

  // -------------------------------------------------------------------------
  // Test 4: Hyperparameter Validation & RTX 3050 4GB Memory Boundary
  // -------------------------------------------------------------------------
  console.log("▶ Test 4: Training hyperparameters & RTX 3050 4GB VRAM safety boundary...");
  // SDXL requires 12 GB VRAM -> must route to cloud GPU and advise user
  const sdxlConfigCheck = validateTrainingConfig(
    { steps: 800, loraRank: 16 },
    "stabilityai/stable-diffusion-xl-base-1.0",
    10
  );

  assert.strictEqual(sdxlConfigCheck.isValid, true);
  assert.strictEqual(
    sdxlConfigCheck.hardwareRecommendation.target,
    "cloud_gpu",
    "SDXL training must be assigned to cloud_gpu due to RTX 3050 4GB VRAM limit"
  );
  assert.ok(sdxlConfigCheck.hardwareRecommendation.estimatedCostUsd > 0);
  assert.ok(sdxlConfigCheck.hardwareRecommendation.reason.includes("4 GB VRAM"));

  // Check invalid hyperparameter detection
  const invalidConfig = validateTrainingConfig(
    { steps: 50, learningRate: 0.5, loraRank: 256 as any },
    "stabilityai/stable-diffusion-xl-base-1.0",
    10
  );
  assert.strictEqual(invalidConfig.isValid, false);
  assert.ok(invalidConfig.errors.length >= 2, "Must flag out-of-range steps and learning rate");
  console.log("  ✔ Test 4: RTX 3050 hardware safety and hyperparameter limits verified.");

  // -------------------------------------------------------------------------
  // Test 5: LoRA Adapter Registration & Safetensors Weight Handling
  // -------------------------------------------------------------------------
  console.log("▶ Test 5: LoRA adapter lifecycle & safetensors serialization...");
  const dummyWeights = Buffer.from("safetensors_test_binary_weights_payload_12345678");
  const adapter = await registerTrainedAdapter({
    name: "Cyberpunk Hologram 3D",
    version: "1.0.0",
    baseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    category: "3d_render_style",
    triggerWord: "cypk_holo",
    weightsBuffer: dummyWeights,
    rank: 16,
    alpha: 16,
    scale: 0.85,
    lossHistory: [
      { step: 100, loss: 0.28 },
      { step: 500, loss: 0.09 },
      { step: 800, loss: 0.065 },
    ],
    userId: "user_test_alice",
    workspaceId: "ws_alpha",
    datasetManifestId: "manifest_123",
  });

  assert.ok(adapter.id.startsWith("lora_"));
  assert.strictEqual(adapter.name, "Cyberpunk Hologram 3D");
  assert.strictEqual(adapter.triggerWord, "cypk_holo");
  assert.strictEqual(adapter.finalLoss, 0.065);
  assert.strictEqual(adapter.scale, 0.85);

  const retrieved = await getAdapterById(adapter.id, "user_test_alice");
  assert.ok(retrieved);
  assert.strictEqual(retrieved.id, adapter.id);
  console.log("  ✔ Test 5: Adapter registration & retrieval verified.");

  // -------------------------------------------------------------------------
  // Test 6: Multi-Adapter Activation & Scale Controls
  // -------------------------------------------------------------------------
  console.log("▶ Test 6: Multi-adapter activation & scale modulation...");
  await setAdapterActiveStatus(adapter.id, "user_test_alice", true, 0.95);
  const activeList = getActiveAdapters("user_test_alice");
  assert.ok(activeList.some((a) => a.id === adapter.id && a.scale === 0.95));

  // Scale clamp boundary verification
  await setAdapterActiveStatus(adapter.id, "user_test_alice", true, 2.5); // Should clamp to 1.5
  const clamped = await getAdapterById(adapter.id, "user_test_alice");
  assert.strictEqual(clamped?.scale, 1.5, "Scale must clamp to max 1.5");
  console.log("  ✔ Test 6: Multi-adapter toggle & scale clamping verified.");

  // -------------------------------------------------------------------------
  // Test 7: Training Job State Machine & Cancellation
  // -------------------------------------------------------------------------
  console.log("▶ Test 7: Training job lifecycle state machine & cancellation...");
  assert.ok(validDataset.manifest);
  
  // Cloud authorization must be requested for SDXL
  await assert.rejects(
    async () => {
      await submitTrainingJob({
        adapterName: "Unconfirmed Cloud Job",
        dataset: validDataset.manifest!,
        baseModel: "stabilityai/stable-diffusion-xl-base-1.0",
        config: { steps: 300 },
        userId: "user_test_alice",
        workspaceId: "ws_alpha",
        confirmCloudGpuCharge: false, // Not confirmed
      });
    },
    /Cloud GPU authorization required/,
    "Must throw error when cloud GPU charge is not confirmed"
  );

  // Submit authorized job
  const job = await submitTrainingJob({
    adapterName: "Authorized Ghibli LoRA",
    dataset: validDataset.manifest!,
    baseModel: "cagliostrolab/animagine-xl-3.1",
    config: { steps: 400, loraRank: 16 },
    userId: "user_test_alice",
    workspaceId: "ws_alpha",
    confirmCloudGpuCharge: true,
  });

  assert.ok(job.id.startsWith("job_"));
  assert.strictEqual(job.baseModel, "cagliostrolab/animagine-xl-3.1");

  // Check initial state
  const statusCheck = getTrainingJobStatus(job.id, "user_test_alice");
  assert.ok(statusCheck);
  assert.ok(statusCheck.status === "queued" || statusCheck.status === "running");

  // Test cancellation
  const cancelled = cancelTrainingJob(job.id, "user_test_alice");
  assert.strictEqual(cancelled, true, "Job must cancel successfully");
  const cancelledStatus = getTrainingJobStatus(job.id, "user_test_alice");
  assert.strictEqual(cancelledStatus?.status, "cancelled");
  console.log("  ✔ Test 7: Training job queue, execution and cancellation verified.");

  // -------------------------------------------------------------------------
  // Test 8: Comparative Quality Evaluation & Overfitting Audit
  // -------------------------------------------------------------------------
  console.log("▶ Test 8: Comparative quality evaluation & overfitting detection...");
  const report = await evaluateAdapterQuality(adapter);
  assert.strictEqual(report.adapterId, adapter.id);
  assert.ok(report.styleConsistencyScore >= 60 && report.styleConsistencyScore <= 100);
  assert.ok(report.promptAdherenceScore >= 60 && report.promptAdherenceScore <= 100);
  assert.ok(["low", "medium", "high"].includes(report.overfittingRisk));
  assert.ok(report.recommendations.length > 0);
  assert.ok(report.recommendations.some((r) => r.includes("scale")));
  console.log("  ✔ Test 8: Comparative benchmark & diagnostic report verified.");

  // -------------------------------------------------------------------------
  // Test 9: Prompt Compiler & Engine Integration with Trigger Word
  // -------------------------------------------------------------------------
  console.log("▶ Test 9: Prompt compiler integration with LoRA trigger keywords...");
  const rawPrompt = "A futuristic sports car driving through a neon metropolis at night";
  const compiled = compileImagePrompt({
    prompt: rawPrompt,
    provider: "huggingface",
    activeAdapterId: adapter.id,
    adapterScale: 0.85,
  });

  assert.strictEqual(compiled.activeAdapterId, adapter.id);
  assert.strictEqual(compiled.adapterScale, 0.85);
  console.log("  ✔ Test 9: LoRA metadata propagation through prompt compiler verified.");

  // -------------------------------------------------------------------------
  // Test 10: Multi-Tenant & Workspace Security Isolation
  // -------------------------------------------------------------------------
  console.log("▶ Test 10: Multi-tenant & workspace security access isolation...");
  // User Bob attempting to access User Alice's adapter
  await assert.rejects(
    async () => {
      await getAdapterById(adapter.id, "user_test_bob");
    },
    /Access denied/,
    "User Bob must not be allowed to access User Alice's private LoRA adapter"
  );

  // Bob listing adapters must only see Bob's adapters or system presets
  const bobAdapters = await listAdapters({ userId: "user_test_bob" });
  assert.ok(!bobAdapters.some((a) => a.id === adapter.id));

  // System presets must be visible to all users
  assert.ok(bobAdapters.some((a) => a.userId === "system_preset"));

  // Clean up
  await deleteAdapter(adapter.id, "user_test_alice");
  const postDelete = await getAdapterById(adapter.id, "user_test_alice");
  assert.strictEqual(postDelete, null, "Adapter must be removed after deletion");
  console.log("  ✔ Test 10: Tenant and workspace security isolation verified.");

  console.log("\n✨ All 10 Phase G: AI Image Model Fine-Tuning & LoRA Customization tests PASSED successfully!\n");
}

// Allow direct execution via tsx
if (process.argv[1]?.includes("model-customization-lora.test.ts")) {
  runModelCustomizationLoRATests().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
}
