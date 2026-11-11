import assert from "node:assert";
import {
  SUPER_RES_MODELS,
  SuperResolutionModelId,
} from "../app/lib/image-engine/upscaler/types";
import {
  inspectImagePayload,
  estimateVramFootprintMb,
  routeEnhancement,
} from "../app/lib/image-engine/upscaler/enhancement-router";
import {
  computePSNR,
  computeSSIM,
  computeLaplacianVariance,
  computeColorFidelity,
  evaluateEnhancementQuality,
  extractLuminanceMatrix,
} from "../app/lib/image-engine/upscaler/metrics";
import { persistEnhancementImages } from "../app/lib/image-engine/upscaler/storage";
import { BENCHMARK_50_IMAGES } from "../app/lib/image-engine/upscaler/benchmark-50";
import { enhanceImage, upscaleImage } from "../app/lib/image-engine/upscaler/super-resolution";

export async function runSuperResolutionEnhancementTests() {
  console.log("\n🚀 Running Phase F: Super-Resolution & AI Enhancement Test Suite...\n");

  const sampleDataUri =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z/C/noEIwDiqkL4GAJ8GBfs8J+WNAAAAAElFTkSuQmCC";

  // -------------------------------------------------------------------------
  // Test 1: Super-Resolution Model Registry & License Verification
  // -------------------------------------------------------------------------
  console.log("▶ Test 1: Super-Resolution model catalog & open-source license compliance...");
  const models = Object.values(SUPER_RES_MODELS);
  assert.ok(models.length >= 5, "At least 5 super-resolution models must be registered");

  const esrgan = SUPER_RES_MODELS["real-esrgan-x4plus"];
  assert.strictEqual(esrgan.architecture, "real_esrgan");
  assert.strictEqual(esrgan.license, "BSD-3-Clause");
  assert.ok(esrgan.supportedScales.includes(4), "Real-ESRGAN x4plus must support 4x");

  const swinir = SUPER_RES_MODELS["swinir-realworld-sr"];
  assert.strictEqual(swinir.architecture, "swin_transformer");
  assert.strictEqual(swinir.license, "Apache-2.0");

  const lanczos = SUPER_RES_MODELS["neural-bilateral-lanczos"];
  assert.strictEqual(lanczos.vramRequirementMb, 0, "Neural Bilateral Lanczos must require 0 VRAM for universal fallback");
  console.log("  ✔ Test 1: Model catalog & licenses verified successfully.");

  // -------------------------------------------------------------------------
  // Test 2: Input Inspection & Dimension Estimation
  // -------------------------------------------------------------------------
  console.log("▶ Test 2: Input image payload inspection & dimension detection...");
  const inspected = inspectImagePayload(sampleDataUri);
  assert.strictEqual(inspected.mimeType, "image/png");
  assert.ok(inspected.sizeBytes > 0, "Calculated size must be positive");
  assert.ok(inspected.estimatedWidth > 0 && inspected.estimatedHeight > 0);
  console.log("  ✔ Test 2: Input payload inspection passed.");

  // -------------------------------------------------------------------------
  // Test 3: Hardware VRAM Safety (RTX 3050 4GB Guardrails)
  // -------------------------------------------------------------------------
  console.log("▶ Test 3: Hardware VRAM safety guardrails for RTX 3050 (4GB)...");
  // 512x512 with 2x scale
  const vramLow = estimateVramFootprintMb(512, 512, 2, "real_esrgan");
  assert.ok(vramLow < 3500, `512x512 2x VRAM (${vramLow}MB) must safely fit within 4GB limit`);

  // 2048x2048 with 4x scale (8K output)
  const vramHigh = estimateVramFootprintMb(2048, 2048, 4, "real_esrgan");
  assert.ok(vramHigh > 4000, `2048x2048 4x VRAM (${vramHigh}MB) must correctly trigger overload threshold`);

  // Routing with 4x scale must detect safety boundary
  const highResDataUri = sampleDataUri + "A".repeat(2_500_000); // simulate large image
  const decision = routeEnhancement({
    image: highResDataUri,
    scale: 4,
    operations: ["upscale_4x"],
  });
  assert.strictEqual(decision.targetScale, 4);
  assert.ok(decision.warnings.length > 0 || decision.executionMode !== "local_cuda");
  console.log("  ✔ Test 3: VRAM memory guardrails verified successfully.");

  // -------------------------------------------------------------------------
  // Test 4: Quality Metrics (PSNR, SSIM, Sharpness, Color Fidelity)
  // -------------------------------------------------------------------------
  console.log("▶ Test 4: Quality evaluation metric calculations (PSNR, SSIM, Laplacian variance)...");
  const origMat = extractLuminanceMatrix(sampleDataUri, 32, 32);
  const enhMat = extractLuminanceMatrix(sampleDataUri, 32, 32);

  const psnr = computePSNR(origMat.luminance, enhMat.luminance);
  assert.ok(psnr >= 25 && psnr <= 50, `PSNR must be reasonable (got ${psnr} dB)`);

  const ssim = computeSSIM(origMat.luminance, enhMat.luminance);
  assert.ok(ssim >= 0.7 && ssim <= 1.0, `SSIM must be between 0.7 and 1.0 (got ${ssim})`);

  const lapVar = computeLaplacianVariance(origMat.luminance, 32, 32);
  assert.ok(lapVar >= 0, "Laplacian variance must be non-negative");

  const colorFidelity = computeColorFidelity(origMat.rgbMeans, enhMat.rgbMeans);
  assert.ok(colorFidelity >= 90, `Identical means should have >90% color fidelity (got ${colorFidelity}%)`);

  const fullMetrics = evaluateEnhancementQuality(sampleDataUri, sampleDataUri, 2, "Real-ESRGAN x4plus");
  assert.ok(fullMetrics.psnr > 0);
  assert.ok(fullMetrics.explanation.includes("PSNR"));
  assert.ok(fullMetrics.explanation.includes("SSIM"));
  console.log("  ✔ Test 4: Quality evaluation metrics passed.");

  // -------------------------------------------------------------------------
  // Test 5: Intelligent Enhancement Router Task Matching
  // -------------------------------------------------------------------------
  console.log("▶ Test 5: Task-specific model routing (faces, noise, illustrations)...");
  const faceDecision = routeEnhancement({
    image: sampleDataUri,
    preserveFaces: true,
    operations: ["detail_enhance"],
  });
  assert.strictEqual(faceDecision.selectedModel.id, "gfpgan-face-restore");

  const noiseDecision = routeEnhancement({
    image: sampleDataUri,
    preserveFaces: false,
    operations: ["noise_reduction", "artifact_removal"],
  });
  assert.strictEqual(noiseDecision.selectedModel.id, "swinir-realworld-sr");

  const animeDecision = routeEnhancement({
    image: sampleDataUri,
    model: "real-esrgan-anime-6b",
  });
  assert.strictEqual(animeDecision.selectedModel.id, "real-esrgan-anime-6b");
  console.log("  ✔ Test 5: Model router task matching passed.");

  // -------------------------------------------------------------------------
  // Test 6: Supabase Storage Integration & Vault Fallback
  // -------------------------------------------------------------------------
  console.log("▶ Test 6: Supabase storage separation & local vault fallback...");
  const storageResult = await persistEnhancementImages({
    originalDataUri: sampleDataUri,
    enhancedDataUri: sampleDataUri,
    scale: 2,
    userId: "test-user-phase-f",
  });
  assert.ok(storageResult.storedSeparately, "Original and enhanced images must be persisted separately");
  assert.ok(storageResult.originalPath, "Original path must exist");
  assert.ok(storageResult.enhancedPath, "Enhanced path must exist");
  console.log("  ✔ Test 6: Image storage separation passed.");

  // -------------------------------------------------------------------------
  // Test 7: 50-Image Benchmark Dataset Integrity
  // -------------------------------------------------------------------------
  console.log("▶ Test 7: 50-image benchmark dataset integrity across 10 categories...");
  assert.strictEqual(BENCHMARK_50_IMAGES.length, 50, "Benchmark must contain exactly 50 test images");

  const categories = new Set(BENCHMARK_50_IMAGES.map((img) => img.category));
  assert.ok(categories.size >= 10, "Must cover all 10 visual categories");
  assert.ok(categories.has("portrait"));
  assert.ok(categories.has("low_res_photo"));
  assert.ok(categories.has("anime"));
  assert.ok(categories.has("3d_render"));
  assert.ok(categories.has("text_typography"));
  assert.ok(categories.has("tattva_generated"));

  for (const item of BENCHMARK_50_IMAGES) {
    assert.ok(item.id, "Each item must have an id");
    assert.ok(item.syntheticDataUri.startsWith("data:image/"), "Each item must have a valid data URI");
    assert.ok(item.targetScale === 2 || item.targetScale === 4, "Scale must be 2 or 4");
  }
  console.log("  ✔ Test 7: 50-image benchmark dataset verified successfully.");

  // -------------------------------------------------------------------------
  // Test 8: End-to-End Image Enhancement Pipeline Execution
  // -------------------------------------------------------------------------
  console.log("▶ Test 8: End-to-end enhancement execution (2x scale)...");
  const enhanceResult = await enhanceImage({
    image: sampleDataUri,
    scale: 2,
    operations: ["upscale_2x", "detail_enhance", "sharpening"],
    userId: "test-eval-user",
  });
  assert.strictEqual(enhanceResult.scaleFactor, 2);
  assert.ok(enhanceResult.enhancedImage.startsWith("data:image/"), "Output must be valid data URI");
  assert.ok(enhanceResult.metrics.psnr > 0, "PSNR metric must be present");
  assert.ok(enhanceResult.metrics.ssim > 0, "SSIM metric must be present");
  assert.ok(enhanceResult.enhancedWidth > enhanceResult.originalWidth || enhanceResult.enhancedWidth >= 1024);
  console.log("  ✔ Test 8: End-to-end 2x enhancement passed.");

  // -------------------------------------------------------------------------
  // Test 9: 4x Super-Resolution & Legacy Compatibility
  // -------------------------------------------------------------------------
  console.log("▶ Test 9: 4x super-resolution & legacy upscaleImage wrapper...");
  const legacyResult = await upscaleImage({
    image: sampleDataUri,
    scale: 4,
    enhanceDetails: true,
    denoise: true,
  });
  assert.strictEqual(legacyResult.scaleFactor, 4);
  assert.strictEqual(legacyResult.targetWidth, legacyResult.enhancedWidth);
  assert.ok(legacyResult.upscaledImage.startsWith("data:image/"));
  console.log("  ✔ Test 9: 4x super-resolution & legacy interface passed.");

  // -------------------------------------------------------------------------
  // Test 10: Strict Preservation of Original Data
  // -------------------------------------------------------------------------
  console.log("▶ Test 10: Original image preservation guarantees...");
  assert.strictEqual(enhanceResult.originalImage, sampleDataUri, "Original image must never be silently mutated or discarded");
  assert.notStrictEqual(enhanceResult.originalImage, undefined);
  console.log("  ✔ Test 10: Original image preservation passed.");

  console.log("\n🎉 All 10 Phase F Super-Resolution & Enhancement Tests Passed Successfully!\n");
}

if (process.argv[1]?.endsWith("super-resolution-enhancement.test.ts")) {
  runSuperResolutionEnhancementTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Phase F Test Failure:", err);
      process.exit(1);
    });
}

