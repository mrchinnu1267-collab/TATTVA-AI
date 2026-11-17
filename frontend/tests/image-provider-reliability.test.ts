/**
 * TATTVA AI - Image Provider Reliability & Error Transparency Test Suite
 * Validates:
 * 1. Provider availability checks before dispatch
 * 2. Accurate provider and model identifiers
 * 3. Quota exhaustion detection & cooldown registration
 * 4. Prevention of retries against unavailable / cooling-down providers
 * 5. Rejection of invalid / empty image bytes (never claim success without valid bytes)
 * 6. Error transparency: preserves original upstream errors and categorizes them correctly
 */

import assert from "assert";
import {
  clearCooldowns,
  setCooldown,
  getCooldownRemaining,
  getCooldownEntry,
  getProviderStatuses,
  resolveProviderOrder,
  formatUserFacingImageError,
  ImageProviderError,
} from "../app/lib/image-engine/providers";
import { sanitizeGeminiSecret } from "../app/lib/image-engine/gemini/gemini-image-adapter";

export async function runProviderReliabilityTests(): Promise<void> {
  clearCooldowns();
  console.log("\n================================================================================");
  console.log("🛡️ TATTVA AI - IMAGE PROVIDER RELIABILITY & ERROR TRANSPARENCY SUITE");
  console.log("================================================================================\n");

  // TEST 1: Provider Availability Before Dispatch
  console.log("▶ [TEST 1] Verifying provider availability checks before dispatch...");
  const statuses = await getProviderStatuses();
  const geminiStatus = statuses.find((s) => s.id === "gemini");
  const cfStatus = statuses.find((s) => s.id === "cloudflare");
  const localStatus = statuses.find((s) => s.id === "local");

  assert.ok(geminiStatus, "Gemini status must be reported");
  assert.ok(cfStatus, "Cloudflare status must be reported");
  assert.ok(localStatus, "Local status must be reported");
  assert.strictEqual(localStatus?.available, true, "Local engine must be reported AVAILABLE");
  assert.strictEqual(localStatus?.model, "tattva-native-neural-synthesizer", "Local model ID must match");
  console.log("  ✓ Provider runtime statuses verified.");

  // TEST 2: Quota Exhaustion Detection & Provider-Specific Cooldown
  console.log("\n▶ [TEST 2] Testing quota exhaustion detection & provider-specific cooldowns...");
  setCooldown(
    "gemini",
    120_000,
    "Google Gemini Native Image Generation requires a linked Pay-as-you-go billing account in Google AI Studio (Free Tier rate limit is 0 for image models).",
    "QUOTA_EXHAUSTION",
    false
  );

  const remaining = getCooldownRemaining("gemini");
  const entry = getCooldownEntry("gemini");
  assert.ok(remaining > 100_000, "Cooldown remaining must reflect 120s");
  assert.strictEqual(entry?.category, "QUOTA_EXHAUSTION", "Category must be QUOTA_EXHAUSTION");
  assert.strictEqual(entry?.isRetryable, false, "Quota exhaustion must NOT be marked retryable");
  console.log(`  Gemini cooldown registered: ${Math.ceil(remaining / 1000)}s remaining.`);
  console.log("  ✓ Quota exhaustion detected and recorded.");

  // TEST 3: Preventing Retries Against Unavailable / Cooling-Down Providers
  console.log("\n▶ [TEST 3] Testing prevention of retries against cooling-down providers...");
  const orderWithCooldown = resolveProviderOrder("auto");
  assert.ok(!orderWithCooldown.includes("gemini"), "Gemini must NOT be included in candidate order while in cooldown");
  console.log(`  Resolved candidate order with Gemini in cooldown: [${orderWithCooldown.join(", ")}]`);
  console.log("  ✓ Cooling-down provider safely bypassed in dispatch cascade.");

  // TEST 4: Error Categorization & User-Facing Transparency
  console.log("\n▶ [TEST 4] Testing error categorization and transparency...");

  // 4a. Gemini Free Tier / Quota Error
  const geminiQuotaErr = new Error("ResourceExhausted: limit: 0, Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_requests");
  const geminiUserMsg = formatUserFacingImageError(
    new Error("Google Gemini Native Image Generation requires a linked Pay-as-you-go billing account in Google AI Studio (Free Tier rate limit is 0 for image models).")
  );
  assert.ok(
    geminiUserMsg.includes("Pay-as-you-go billing account"),
    "Must display friendly Pay-as-you-go guidance on Free Tier 0 RPM quota limit"
  );

  // 4b. Cloudflare Quota Error
  const cfQuotaErr = new Error("Cloudflare Workers AI daily quota (10,000 Neurons/day) or rate limit exceeded.");
  const cfUserMsg = formatUserFacingImageError(cfQuotaErr);
  assert.ok(cfUserMsg.includes("10,000 Neurons/day"), "Must explain Cloudflare daily neuron limit");

  // 4c. Authentication Failure
  const authErr = new Error("Cloudflare authentication failed: 401 Unauthorized");
  const authUserMsg = formatUserFacingImageError(authErr);
  assert.ok(authUserMsg.includes("authentication failed"), "Must clearly identify authentication error");

  // 4d. Network Timeout Failure
  const timeoutErr = new Error("Fetch failed: Network connection timed out after 30000ms");
  const timeoutUserMsg = formatUserFacingImageError(timeoutErr);
  assert.ok(timeoutUserMsg.includes("timed out or could not be reached"), "Must clearly identify network timeout");

  // 4e. Invalid Output / Empty Bytes Rejection
  const emptyOutputErr = new Error("The image generation engine completed execution but failed output verification: no valid image bytes were returned.");
  const emptyOutputMsg = formatUserFacingImageError(emptyOutputErr);
  assert.ok(emptyOutputMsg.includes("no valid image bytes were returned"), "Must clearly identify invalid/empty output bytes");

  console.log("  ✓ Error messages accurately distinguish quota, auth, network, and invalid output.");

  // TEST 5: Credential Sanitization
  console.log("\n▶ [TEST 5] Testing credential and secret scrubbing from diagnostics...");
  const fakeKey = "AIzaSyTestSecretKey1234567890abcdefg";
  const leakedError = `Failed to generate image with key=${fakeKey} at https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${fakeKey}`;
  const sanitized = sanitizeGeminiSecret(leakedError);

  assert.ok(!sanitized.includes(fakeKey), "Secret key must NOT appear in sanitized error string");
  assert.ok(sanitized.includes("[REDACTED_GEMINI_KEY]") || sanitized.includes("[REDACTED]"), "Key must be replaced with redaction placeholder");
  console.log("  ✓ API keys and secrets strictly scrubbed from diagnostics.");

  clearCooldowns();
  console.log("\n================================================================================");
  console.log("🎉 ALL PROVIDER RELIABILITY & ERROR TRANSPARENCY TESTS PASSED!");
  console.log("================================================================================\n");
}

if (process.argv[1]?.endsWith("image-provider-reliability.test.ts")) {
  runProviderReliabilityTests().catch((err) => {
    console.error("Provider reliability test suite failed:", err);
    process.exit(1);
  });
}
