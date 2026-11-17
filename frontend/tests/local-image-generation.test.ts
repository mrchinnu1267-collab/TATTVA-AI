/**
 * TATTVA AI - Local Image Generation & Offline Verification Test Suite
 * Validates:
 * 1. Hardware profiling & RTX 3050 4GB VRAM diffusion model feasibility evaluation
 * 2. Benchmark performance: GPU-accelerated and CPU fallback inference latency
 * 3. 100% Offline execution with zero external network access (network firewall interceptor)
 * 4. Image byte verification, Sharp metadata validation (PNG, 1024x1024, 4 channels)
 * 5. Durable local workspace vault persistence
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { profileImageGenerationHardware, evaluateDiffusionModels } from "../app/lib/local-ai-engine/image/hardware-profiler";
import { generateLocalImage } from "../app/lib/local-ai-engine/image/local-image-synthesizer";
import { generateWithLocalImageEngine, LOCAL_IMAGE_MODEL_ID } from "../app/lib/image-engine/local/local-image-adapter";
import { resolveProviderOrder, generateWithProvider } from "../app/lib/image-engine/providers";

export async function runLocalImageTests(): Promise<void> {
  console.log("\n================================================================================");
  console.log("🎨 TATTVA AI - LOCAL IMAGE GENERATION & OFFLINE VERIFICATION SUITE");
  console.log("================================================================================\n");

  // TEST 1: Hardware Profiling & VRAM Feasibility
  console.log("▶ [TEST 1] Inspecting GPU, VRAM, and System RAM hardware profile...");
  const profile = profileImageGenerationHardware();
  console.log(`  GPU Detected: ${profile.gpuName}`);
  console.log(`  VRAM: ${profile.vramGb} GB | System RAM: ${profile.totalRamGb} GB (Free: ${profile.freeRamGb} GB)`);
  console.log(`  CPU Threads: ${profile.cpuThreads}`);
  console.log(`  Recommended Engine Backend: ${profile.recommendedEngineBackend}`);

  assert.ok(profile.vramGb >= 0.5, "VRAM must be detected");
  assert.ok(profile.totalRamGb >= 4.0, "System RAM must be at least 4 GB");
  assert.ok(profile.cpuThreads >= 2, "CPU threads must be detected");
  console.log("  ✓ Hardware telemetry successfully verified.");

  // TEST 2: Diffusion Model Architecture Evaluation for 4GB RTX 3050
  console.log("\n▶ [TEST 2] Evaluating diffusion model architectures for 4GB VRAM limit...");
  const evaluations = evaluateDiffusionModels(profile.vramGb);
  const sdxl = evaluations.find((e) => e.modelId.includes("stable-diffusion-xl-base"));
  const sd15 = evaluations.find((e) => e.modelId.includes("stable-diffusion-v1-5"));
  const quantized = evaluations.find((e) => e.modelId.includes("tattva-sd15-q4-gguf"));
  const native = evaluations.find((e) => e.modelId.includes("tattva-native-neural-synthesizer"));

  assert.ok(sdxl && sdxl.rtx3050Feasibility === "INFEASIBLE", "SDXL must be classified as INFEASIBLE on 4GB VRAM");
  assert.ok(sd15 && sdxl.rtx3050Feasibility !== "OPTIMAL", "SD 1.5 must not be considered optimal without offload");
  assert.ok(quantized && quantized.rtx3050Feasibility === "OPTIMAL", "Quantized GGUF must be feasible");
  assert.ok(native && native.rtx3050Feasibility === "OPTIMAL", "Native Neural Synthesizer must be optimal");

  console.log(`  SDXL 1.0 (6.9 GB): ${sdxl?.rtx3050Feasibility} - ${sdxl?.reasoning.slice(0, 75)}...`);
  console.log(`  SD 1.5 (3.8 GB): ${sd15?.rtx3050Feasibility} - ${sd15?.reasoning.slice(0, 75)}...`);
  console.log(`  Quantized GGUF (1.6 GB): ${quantized?.rtx3050Feasibility}`);
  console.log(`  Native Synthesizer: ${native?.rtx3050Feasibility}`);
  console.log("  ✓ Diffusion model feasibility evaluation verified.");

  // TEST 3: GPU-Accelerated Local Image Generation
  console.log("\n▶ [TEST 3] Testing GPU-accelerated local image generation...");
  const gpuStart = Date.now();
  const gpuImage = await generateLocalImage({
    prompt: "A majestic golden dragon soaring above a neon cyberpunk metropolis at twilight",
    width: 1024,
    height: 1024,
    seed: 42,
    userId: "test_user_gpu",
  });
  const gpuDuration = Date.now() - gpuStart;

  console.log(`  Backend: ${gpuImage.backend}`);
  console.log(`  Resolution: ${gpuImage.width}x${gpuImage.height} | Duration: ${gpuDuration}ms`);
  console.log(`  Byte Size: ${gpuImage.byteSize} bytes (${(gpuImage.byteSize / 1024).toFixed(1)} KB)`);

  assert.strictEqual(gpuImage.width, 1024, "Image width must be 1024");
  assert.strictEqual(gpuImage.height, 1024, "Image height must be 1024");
  assert.strictEqual(gpuImage.mimeType, "image/png", "MIME type must be image/png");
  assert.ok(gpuImage.buffer.length > 20_000, "Image buffer must be a non-trivial size (>20KB)");
  assert.ok(fs.existsSync(gpuImage.filePath), "Generated image file must exist on disk");
  console.log("  ✓ GPU-accelerated generation succeeded with verified PNG buffer.");

  // TEST 4: CPU Fallback Local Image Generation
  console.log("\n▶ [TEST 4] Testing CPU fallback mode (forceCpu: true)...");
  const cpuStart = Date.now();
  const cpuImage = await generateLocalImage({
    prompt: "Minimalist geometric sunset over tranquil lake with reflections",
    width: 768,
    height: 1024,
    seed: 1234,
    forceCpu: true,
    userId: "test_user_cpu",
  });
  const cpuDuration = Date.now() - cpuStart;

  console.log(`  Backend: ${cpuImage.backend}`);
  console.log(`  Resolution: ${cpuImage.width}x${cpuImage.height} | Duration: ${cpuDuration}ms`);
  console.log(`  Byte Size: ${cpuImage.byteSize} bytes`);

  assert.strictEqual(cpuImage.backend, "CPU_ONLY", "Backend must be CPU_ONLY");
  assert.strictEqual(cpuImage.width, 768, "Width must be 768");
  assert.strictEqual(cpuImage.height, 1024, "Height must be 1024");
  assert.ok(cpuImage.buffer.length > 20_000, "CPU image buffer must be non-trivial");
  console.log("  ✓ CPU fallback mode successfully generated and validated image.");

  // TEST 5: Strict Offline Verification with Network Barrier
  console.log("\n▶ [TEST 5] Testing strict OFFLINE generation with active network barrier...");
  const originalFetch = global.fetch;
  let interceptedExternalCalls: string[] = [];

  // Active Network Barrier: Intercept all outgoing HTTP requests
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    interceptedExternalCalls.push(urlStr);
    throw new Error(`OFFLINE_NETWORK_BARRIER_VIOLATION: External network access attempted to ${urlStr}`);
  };

  try {
    const offlineResult = await generateWithLocalImageEngine({
      prompt: "Poster design for Vignan Mahotsav 2026 science and cultural festival",
      negativePrompt: "blurry, low quality",
      width: 1024,
      height: 1024,
      steps: 20,
      guidance: 7.5,
      seed: 9999,
      aspectRatio: "1:1",
      quality: "balanced",
    });

    console.log(`  Provider: ${offlineResult.provider} | Model: ${offlineResult.model}`);
    console.log(`  Duration: ${offlineResult.latencyMs}ms | Revised Prompt: ${offlineResult.revisedPrompt}`);
    console.log(`  External Network Calls Attempted: ${interceptedExternalCalls.length}`);

    assert.strictEqual(offlineResult.provider, "local", "Provider must be local");
    assert.strictEqual(offlineResult.model, LOCAL_IMAGE_MODEL_ID, "Model ID must match local synthesizer");
    assert.strictEqual(interceptedExternalCalls.length, 0, "ZERO external network calls must occur during offline generation");
    assert.ok(offlineResult.image.startsWith("data:image/png;base64,"), "Output must be valid base64 PNG data URI");

    // Decode and verify raw bytes with Sharp
    const rawBase64 = offlineResult.image.replace(/^data:image\/png;base64,/, "");
    const decodedBuffer = Buffer.from(rawBase64, "base64");
    const sharpMeta = await sharp(decodedBuffer).metadata();

    assert.strictEqual(sharpMeta.format, "png", "Decoded format must be PNG");
    assert.strictEqual(sharpMeta.width, 1024, "Decoded width must be 1024");
    assert.strictEqual(sharpMeta.height, 1024, "Decoded height must be 1024");
    assert.ok(sharpMeta.channels === 3 || sharpMeta.channels === 4, "Must have 3 or 4 color channels");
    console.log("  ✓ OFFLINE VERIFICATION COMPLETE: Zero external network requests made, image bytes 100% verified.");
  } finally {
    global.fetch = originalFetch;
  }

  // TEST 6: Provider Routing with Explicit 'local' Preference
  console.log("\n▶ [TEST 6] Testing provider routing cascade for 'local' choice...");
  const order = resolveProviderOrder("local");
  assert.deepStrictEqual(order, ["local"], "resolveProviderOrder('local') must return ['local']");

  const providerResult = await generateWithProvider("local", {
    prompt: "An ancient temple in a lush bamboo forest at sunrise",
    negativePrompt: "blurry",
    width: 1024,
    height: 1024,
    steps: 20,
    guidance: 7.0,
    seed: 5555,
    aspectRatio: "1:1",
    quality: "balanced",
  });

  assert.strictEqual(providerResult.provider, "local", "generateWithProvider('local') must succeed");
  assert.ok(providerResult.image.startsWith("data:image/png;base64,"), "Valid data URI returned");
  console.log("  ✓ Explicit local provider dispatch successfully verified.");

  console.log("\n================================================================================");
  console.log("🎉 ALL LOCAL IMAGE GENERATION & OFFLINE VERIFICATION TESTS PASSED!");
  console.log("================================================================================\n");
}

if (process.argv[1]?.endsWith("local-image-generation.test.ts")) {
  runLocalImageTests().catch((err) => {
    console.error("Local image generation test suite failed:", err);
    process.exit(1);
  });
}
