import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import assert from "node:assert";
import { getProviderStatuses, clearCooldowns, setCooldown } from "../app/lib/image-engine/providers";
import { generateImage } from "../app/lib/image-engine/engine";
import { routeImageRequest } from "../app/lib/image-engine/multi-model-router/intelligent-router";

export async function runDoraemonAvailabilityTest() {
  console.log("\n🧪 Running Doraemon Provider Availability & Fallback Verification...\n");

  // Step 1: Check Provider Runtime Statuses
  console.log("Step 1: Inspect provider runtime statuses and granular health flags");
  const statuses = await getProviderStatuses();
  for (const s of statuses) {
    console.log(`  - [${s.id}] ${s.label}: status=${s.status}, available=${s.available}, model=${s.model}`);
    assert.ok(
      [
        "AVAILABLE",
        "DEGRADED",
        "RATE_LIMITED",
        "AUTHENTICATION_FAILED",
        "QUOTA_EXCEEDED",
        "CONFIGURATION_ERROR",
        "TEMPORARILY_UNAVAILABLE",
      ].includes(s.status),
      `Invalid status for provider ${s.id}: ${s.status}`
    );
  }
  console.log("  ✓ Granular health statuses confirmed on all providers.");

  // Step 2: Route request for "Create an image of Doraemon."
  console.log("\nStep 2: Inspect routing decision and fallback chain for Doraemon");
  const decision = routeImageRequest({
    prompt: "Create an image of Doraemon.",
    quality: "balanced",
  });
  console.log(`  - Primary Model: ${decision.primaryModel.id} (${decision.primaryModel.providerId})`);
  console.log(`  - Fallback Chain: ${decision.fallbackChain.join(" -> ")}`);
  assert.ok(decision.fallbackChain.length >= 2, "Fallback chain must contain multiple backup providers");
  assert.ok(decision.fallbackChain.includes("pollinations"), "Fallback chain must include Pollinations cloud fallback");
  console.log("  ✓ Fallback chain resilience confirmed.");

  // Step 3: Simulate Gemini quota exhaustion cooldown and execute generation
  console.log("\nStep 3: Execute real generation of Doraemon with Gemini in quota exhaustion cooldown");
  setCooldown("gemini", 120_000, "Simulated 429 quota exhaustion");

  const startTime = Date.now();
  const result = await generateImage({
    prompt: "Create an image of Doraemon.",
    quality: "balanced",
    verify: false, // Pure generation test
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  - Success! Image generated in ${durationSec}s`);
  console.log(`  - Active Provider: ${result.metadata.provider}`);
  console.log(`  - Model: ${result.metadata.model}`);
  console.log(`  - Image size: ${result.image.length} chars (valid base64: ${result.image.startsWith("data:image/")})`);

  assert.ok(result.image.startsWith("data:image/"), "Must return a valid data URI");
  assert.ok(result.image.length > 5000, "Image must have meaningful byte payload");
  assert.ok(
    ["huggingface", "pollinations", "local"].includes(result.metadata.provider),
    `Provider must be one of the healthy fallbacks, got ${result.metadata.provider}`
  );

  clearCooldowns();
  console.log("\n✅ Doraemon Availability & Fallback Verification passed with 100% success!\n");
}

if (process.argv[1]?.includes("test-doraemon-availability")) {
  runDoraemonAvailabilityTest().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
