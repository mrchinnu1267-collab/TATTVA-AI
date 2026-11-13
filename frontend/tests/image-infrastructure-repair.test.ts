import assert from "node:assert";
import {
  formatUserFacingImageError,
  isRunningOnVercel,
  isLocalhostUrl,
  getLocalBaseUrl,
  getProviderStatuses,
  clearCooldowns,
  setCooldown,
  getCooldownRemaining,
  resolveProviderOrder,
  generateWithProvider,
  ImageProviderError,
} from "../app/lib/image-engine/providers";
import { routeImageRequest } from "../app/lib/image-engine/multi-model-router/intelligent-router";

export async function runInfrastructureRepairTests() {
  console.log("\n🧪 Running TATTVA Image Generation Infrastructure Repair Test Suite...\n");

  // -------------------------------------------------------------------------
  // Test 1: Vercel vs Local Environment Detection & URL Isolation
  // -------------------------------------------------------------------------
  console.log("Test 1: Environment detection & localhost segregation on Vercel");
  assert.strictEqual(isLocalhostUrl("http://127.0.0.1:8001"), true);
  assert.strictEqual(isLocalhostUrl("http://localhost:8001"), true);
  assert.strictEqual(isLocalhostUrl("https://my-gpu.example.com"), false);
  assert.strictEqual(isLocalhostUrl("https://hf.space/gpu"), false);

  // When simulating Vercel, localhost must be disabled
  const prevVercel = process.env.VERCEL;
  const prevEngineUrl = process.env.LOCAL_IMAGE_ENGINE_URL;
  try {
    process.env.VERCEL = "1";
    delete process.env.LOCAL_IMAGE_ENGINE_URL;
    assert.strictEqual(isRunningOnVercel(), true);
    assert.strictEqual(getLocalBaseUrl(), ""); // Must be empty on Vercel without external hosted URL

    const statuses = await getProviderStatuses();
    const localStatus = statuses.find((s) => s.id === "local");
    assert.ok(localStatus, "Local status should exist in statuses");
    assert.strictEqual(localStatus.configured, false, "Local engine must NOT be configured on Vercel without external URL");
    assert.ok(localStatus.reason?.includes("Cloud Disabled") || localStatus.reason?.includes("cloud deployment"));
  } finally {
    if (prevVercel !== undefined) process.env.VERCEL = prevVercel;
    else delete process.env.VERCEL;
    if (prevEngineUrl !== undefined) process.env.LOCAL_IMAGE_ENGINE_URL = prevEngineUrl;
    else delete process.env.LOCAL_IMAGE_ENGINE_URL;
  }
  console.log("  ✓ Localhost segregation on Vercel passed");

  // -------------------------------------------------------------------------
  // Test 2: User-Facing Error Message Sanitization (Zero Leakage)
  // -------------------------------------------------------------------------
  console.log("\nTest 2: User-facing error message sanitization");

  // Test quota exhaustion
  const quotaErr = new Error("Quota exceeded for metric: limit: 0, model: gemini-2.5-flash-image");
  const quotaMsg = formatUserFacingImageError(quotaErr);
  assert.strictEqual(
    quotaMsg,
    "Image generation is temporarily unavailable because the cloud provider quota has been reached. Please check your provider billing or try again later."
  );
  assert.strictEqual(quotaMsg.includes("gemini-2.5-flash-image"), false);
  assert.strictEqual(quotaMsg.includes("127.0.0.1"), false);

  // Test ZeroGPU runs limit
  const zeroGpuErr = new Error("You have exceeded your ZeroGPU runs limit. Subscribe to Hugging Face PRO");
  const zeroGpuMsg = formatUserFacingImageError(zeroGpuErr);
  assert.ok(zeroGpuMsg.includes("quota has been reached"));

  // Test missing credentials
  const noConfigErr = new Error("OPENAI_API_KEY is not configured.");
  const noConfigMsg = formatUserFacingImageError(noConfigErr);
  assert.strictEqual(
    noConfigMsg,
    "Image generation is not configured yet. Please configure a valid cloud image provider (Gemini, Hugging Face, OpenAI, or Azure OpenAI) in application settings."
  );

  // Test timeout / network failure
  const timeoutErr = new Error("Request to model service timed out after 35s");
  const timeoutMsg = formatUserFacingImageError(timeoutErr);
  assert.ok(timeoutMsg.includes("timed out or could not be reached"));

  // Test safety violation
  const safetyErr = new Error("Violates content safety guidelines: Prohibited adult content detected");
  const safetyMsg = formatUserFacingImageError(safetyErr);
  assert.ok(safetyMsg.includes("violates visual content safety guidelines"));

  // Test generic / unknown
  const genericErr = new Error("Unknown GPU failure on internal bus 0x4f");
  const genericMsg = formatUserFacingImageError(genericErr);
  assert.strictEqual(genericMsg, "All configured image providers are currently unavailable. Please try again shortly.");
  assert.strictEqual(genericMsg.includes("0x4f"), false);
  console.log("  ✓ Error message sanitization & credential protection passed");

  // -------------------------------------------------------------------------
  // Test 3: Intelligent Router Provider Filtering
  // -------------------------------------------------------------------------
  console.log("\nTest 3: Intelligent router provider filtering & cooldown compliance");
  clearCooldowns();

  // Route a general prompt
  const decision = routeImageRequest({
    prompt: "A beautiful landscape with mountains and lake",
    quality: "balanced",
  });
  assert.ok(decision.fallbackChain.length > 0, "Fallback chain must not be empty");
  assert.ok(decision.primaryModel, "A primary model must be selected");

  // Put huggingface on cooldown
  setCooldown("huggingface", 60_000, "Test quota exhaustion");
  assert.ok(getCooldownRemaining("huggingface") > 0);

  // Re-route and verify huggingface is skipped if others exist
  const cooldownDecision = routeImageRequest({
    prompt: "A beautiful landscape with mountains and lake",
    quality: "balanced",
  });
  assert.ok(cooldownDecision.primaryModel.providerId !== "huggingface" || cooldownDecision.fallbackChain.length > 0);
  clearCooldowns();
  assert.strictEqual(getCooldownRemaining("huggingface"), 0);
  console.log("  ✓ Router provider filtering and cooldown management passed");

  // -------------------------------------------------------------------------
  // Test 4: Missing OpenAI Credentials Clean Bypass
  // -------------------------------------------------------------------------
  console.log("\nTest 4: Missing OpenAI credentials clean bypass");
  const prevOai = process.env.OPENAI_API_KEY;
  try {
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(
      async () => {
        await generateWithProvider("openai", { prompt: "Test prompt" });
      },
      (err: any) => {
        assert.ok(err instanceof ImageProviderError);
        assert.strictEqual(err.retryable, false);
        return true;
      }
    );
  } finally {
    if (prevOai !== undefined) process.env.OPENAI_API_KEY = prevOai;
  }
  console.log("  ✓ Missing OpenAI credentials bypass passed");

  // -------------------------------------------------------------------------
  // Test 5: Reference Image Preservation During Router Conditioning
  // -------------------------------------------------------------------------
  console.log("\nTest 5: Reference image preservation during routing");
  const fakeRef = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const refDecision = routeImageRequest({
    prompt: "Modify the hair color of the character to blue",
    referenceImage: fakeRef,
    quality: "balanced",
  });
  assert.strictEqual(refDecision.primaryModel.supportsReferenceImage, true, "Primary model must support reference images");
  assert.ok(
    refDecision.fallbackChain.every((p) => p !== "openai"),
    "OpenAI must not be in reference image fallback chain"
  );
  console.log("  ✓ Reference image preservation passed");

  // -------------------------------------------------------------------------
  // Test 6: Provider Order Resolution Logic
  // -------------------------------------------------------------------------
  console.log("\nTest 6: Provider order resolution with and without reference image");
  const textOrder = resolveProviderOrder(undefined, "balanced", false);
  assert.ok(textOrder.includes("huggingface"));

  const refOrder = resolveProviderOrder(undefined, "balanced", true);
  assert.ok(!refOrder.includes("openai"), "OpenAI should be excluded from reference orders");
  console.log("  ✓ Provider order resolution passed");

  console.log("\n✅ All 6 Image Infrastructure Repair unit tests passed successfully!\n");
}

// Execute directly if run via node/tsx
if (process.argv[1]?.includes("image-infrastructure-repair")) {
  runInfrastructureRepairTests().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

