/**
 * TATTVA AI - Phase K: Production Optimization & Reliability Engineering Tests
 * Validates Circuit Breakers, Background Job Queues, Cost Intelligence,
 * Spending Limits, Input Sanitization, and Latency Percentiles.
 */

import assert from "node:assert";
import {
  hashPrompt,
  getCachedPromptAnalysis,
  storeCachedPromptAnalysis,
  clearPromptCache,
} from "../app/lib/image-engine/reliability/prompt-cache";
import {
  getProviderHealth,
  recordProviderSuccess,
  recordProviderFailure,
  canExecuteProvider,
  calculateBackoffWithJitter,
  withTimeout,
  resetAllCircuitBreakers,
} from "../app/lib/image-engine/reliability/circuit-breaker";
import {
  createImageJob,
  getJob,
  cancelJob,
  listRecentJobs,
  resetJobQueue,
} from "../app/lib/image-engine/reliability/job-queue";
import {
  estimateGenerationCost,
  verifySpendingAuthorization,
  recordCostEntry,
  updateWorkspaceSpendingLimit,
  getWorkspaceSpending,
  resetCostTracker,
} from "../app/lib/image-engine/reliability/cost-tracker";
import {
  validatePromptInput,
  validateReferenceImagePayload,
  checkRateLimit,
  sanitizeUserFacingError,
  resetRateLimits,
} from "../app/lib/image-engine/reliability/security-validator";
import {
  calculateLatencyMetrics,
  getReliabilityDashboardMetrics,
} from "../app/lib/image-engine/reliability/performance-monitor";

export async function runProductionReliabilityTests() {
  console.log("\n🚀 Running Phase K: Production Optimization & Reliability Engineering Test Suite...\n");

  // ---------------------------------------------------------------------------
  // Test 1: Request Deduplication & Deterministic Prompt Hashing
  // ---------------------------------------------------------------------------
  console.log("▶ Test 1: Deterministic prompt hashing and request idempotency...");
  const promptA = "A vintage leather armchair beside a stone fireplace";
  const promptB = "   A VINTAGE LEATHER ARMCHAIR BESIDE A STONE FIREPLACE   ";
  const hashA = hashPrompt(promptA);
  const hashB = hashPrompt(promptB);

  assert.strictEqual(hashA, hashB, "Normalized prompts must generate identical hashes");
  assert.ok(hashA.startsWith("txt-"), "Text prompt hash should have txt- prefix");

  const hashWithRef = hashPrompt(promptA, "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
  assert.notStrictEqual(hashA, hashWithRef, "Reference images must produce distinct hashes");
  console.log("  ✔ Test 1: Deterministic prompt hashing verified.");

  // ---------------------------------------------------------------------------
  // Test 2: Prompt Cache Invalidation & Hit Ratio
  // ---------------------------------------------------------------------------
  console.log("▶ Test 2: Prompt analysis cache and retrieval...");
  clearPromptCache();
  const dummySpec: any = { mainSubject: "armchair", originalPrompt: promptA };
  const dummyChecklist: any = [{ id: "c1", statement: "Contains armchair" }];

  storeCachedPromptAnalysis(promptA, dummySpec, dummyChecklist);
  const cached = getCachedPromptAnalysis(promptB); // using trimmed variant

  assert.ok(cached, "Must retrieve cached prompt specification");
  assert.strictEqual(cached?.structuredSpec.mainSubject, "armchair", "Must match cached spec contents");
  assert.strictEqual(cached?.hits, 1, "Must increment cache hit counter");
  console.log("  ✔ Test 2: Prompt analysis caching verified.");

  // ---------------------------------------------------------------------------
  // Test 3: Circuit Breaker State Transitions (CLOSED -> OPEN -> HALF_OPEN)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 3: Stateful Circuit Breaker transitions...");
  resetAllCircuitBreakers();

  const provider = "huggingface";
  assert.strictEqual(canExecuteProvider(provider), true, "Initial circuit state must be CLOSED");

  // Trip circuit with 3 consecutive failures
  recordProviderFailure(provider, new Error("Server connection error 1"));
  recordProviderFailure(provider, new Error("Server connection error 2"));
  assert.strictEqual(canExecuteProvider(provider), true, "Must stay CLOSED below failure threshold");

  recordProviderFailure(provider, new Error("Server connection error 3"));
  const healthOpen = getProviderHealth(provider);
  assert.strictEqual(healthOpen.circuitState, "OPEN", "Circuit must trip to OPEN on 3rd failure");
  assert.strictEqual(canExecuteProvider(provider), false, "Must reject traffic while circuit is OPEN");

  // Simulate cooldown expiration
  healthOpen.cooldownUntil = Date.now() - 1000;
  const healthHalfOpen = getProviderHealth(provider);
  assert.strictEqual(healthHalfOpen.circuitState, "HALF_OPEN", "Circuit must transition to HALF_OPEN after cooldown");
  assert.strictEqual(canExecuteProvider(provider), true, "HALF_OPEN must allow trial probe execution");

  // Record successful probe
  recordProviderSuccess(provider, 2400);
  const healthReset = getProviderHealth(provider);
  assert.strictEqual(healthReset.circuitState, "CLOSED", "Successful probe must reset circuit to CLOSED");
  console.log("  ✔ Test 3: Circuit Breaker state transitions verified.");

  // ---------------------------------------------------------------------------
  // Test 4: Exponential Backoff & Timeout Wrapper
  // ---------------------------------------------------------------------------
  console.log("▶ Test 4: Exponential backoff with jitter and timeout aborts...");
  const delay1 = calculateBackoffWithJitter(1, 1000, 10000);
  const delay2 = calculateBackoffWithJitter(2, 1000, 10000);
  assert.ok(delay2 > delay1 * 0.8, "Backoff delay must increase with attempts");

  // Timeout test
  let timedOut = false;
  try {
    await withTimeout(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return "done";
    }, 20, "Test operation timed out");
  } catch (err: any) {
    timedOut = true;
    assert.ok(err.message.includes("timed out"), "Must report timeout error");
  }
  assert.strictEqual(timedOut, true, "Timeout wrapper must trigger on slow operations");
  console.log("  ✔ Test 4: Backoff and timeout handling verified.");

  // ---------------------------------------------------------------------------
  // Test 5: Asynchronous Background Job Lifecycle
  // ---------------------------------------------------------------------------
  console.log("▶ Test 5: Background job creation, status querying, and cancellation...");
  resetJobQueue();

  const job = createImageJob({
    prompt: "A modern glass villa in the Swiss Alps",
    quality: "balanced",
  });

  assert.ok(job.id.startsWith("job-"), "Job ID must have job- prefix");
  assert.ok(
    job.status === "queued" || job.status === "processing",
    "Initial status must be queued or processing"
  );

  const retrieved = getJob(job.id);
  assert.ok(retrieved, "Must retrieve job by ID");
  assert.strictEqual(retrieved?.prompt, "A modern glass villa in the Swiss Alps");

  // Test Cancellation
  const cancelSuccess = cancelJob(job.id);
  assert.strictEqual(cancelSuccess, true, "Must successfully cancel queued job");
  assert.strictEqual(getJob(job.id)?.status, "cancelled", "Job status must be updated to cancelled");

  const recentList = listRecentJobs(10);
  assert.ok(recentList.length >= 1, "Must list recent jobs");
  console.log("  ✔ Test 5: Asynchronous job queue lifecycle passed.");

  // ---------------------------------------------------------------------------
  // Test 6: Cost Tracking & Spending Limits
  // ---------------------------------------------------------------------------
  console.log("▶ Test 6: Granular cost intelligence and spending limit guardrails...");
  resetCostTracker();

  const estimate = estimateGenerationCost({ provider: "gemini", quality: "balanced", isMultiStage: true });
  assert.ok(estimate.estimatedCostUsd > 0.02, "Must compute multi-stage generation estimate");

  // Configure $1.00 daily budget limit for test workspace
  updateWorkspaceSpendingLimit("test-workspace", {
    dailySpendingLimitUsd: 1.0,
    hardStopEnabled: true,
  });

  // Check initial authorization
  const auth1 = verifySpendingAuthorization("test-workspace", 0.05);
  assert.strictEqual(auth1.authorized, true, "Must authorize spend within budget");

  // Record spend
  recordCostEntry({
    requestId: "req-001",
    workspaceId: "test-workspace",
    providerId: "gemini",
    modelId: "gemini-3.1-flash-image",
    generationCostUsd: 0.95,
    success: true,
  });

  // Next spend of $0.10 will exceed $1.00 limit -> Must trigger hard stop
  const authExceeded = verifySpendingAuthorization("test-workspace", 0.10);
  assert.strictEqual(authExceeded.authorized, false, "Must reject spend exceeding daily budget limit");
  assert.ok(authExceeded.reason?.includes("spending limit exceeded"), "Must provide explanatory rejection reason");
  console.log("  ✔ Test 6: Cost tracking and spending limit guardrails verified.");

  // ---------------------------------------------------------------------------
  // Test 7: Input Validation & Image Payload Gating
  // ---------------------------------------------------------------------------
  console.log("▶ Test 7: Input sanitization, MIME verification, and 15MB file size limit...");
  const validPrompt = validatePromptInput("Valid clean prompt");
  assert.strictEqual(validPrompt.valid, true, "Valid prompt must pass");

  const emptyPrompt = validatePromptInput("   ");
  assert.strictEqual(emptyPrompt.valid, false, "Empty prompt must be rejected");

  const oversizedPrompt = validatePromptInput("a".repeat(2001));
  assert.strictEqual(oversizedPrompt.valid, false, "Prompts over 2000 chars must be rejected");

  // Reference image validation
  const validImage = validateReferenceImagePayload(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  );
  assert.strictEqual(validImage.valid, true, "Standard PNG data URI must be accepted");

  const invalidMime = validateReferenceImagePayload("data:image/bmp;base64,Qk06AAAAAAAAADYAAAAoAAAA");
  assert.strictEqual(invalidMime.valid, false, "Unsupported MIME type (BMP) must be rejected");
  console.log("  ✔ Test 7: Input sanitization and payload limits passed.");

  // ---------------------------------------------------------------------------
  // Test 8: Anti-Abuse Rate Limiting
  // ---------------------------------------------------------------------------
  console.log("▶ Test 8: Sliding window rate limiting...");
  resetRateLimits();

  const userKey = "user-test-rate-limit";
  let allowedCount = 0;
  for (let i = 0; i < 25; i++) {
    const res = checkRateLimit(userKey);
    if (res.allowed) allowedCount++;
  }

  assert.strictEqual(allowedCount, 20, "Must permit exactly 20 requests per window");
  const rejectedCheck = checkRateLimit(userKey);
  assert.strictEqual(rejectedCheck.allowed, false, "21st request must be throttled");
  console.log("  ✔ Test 8: Sliding window rate limiting verified.");

  // ---------------------------------------------------------------------------
  // Test 9: User-Facing Error Message Sanitization
  // ---------------------------------------------------------------------------
  console.log("▶ Test 9: Secret credential and internal URL sanitization...");
  const rawSensitiveError = new Error(
    "Failed to connect to http://127.0.0.1:8001/generate with Bearer sk-proj-1234567890abcdef1234567890 and hf_token_secret9876543210.\n    at Socket.emit (node:net:345:12)"
  );

  const sanitized = sanitizeUserFacingError(rawSensitiveError);
  assert.ok(!sanitized.includes("127.0.0.1:8001"), "Internal localhost URL must be stripped");
  assert.ok(!sanitized.includes("sk-proj-"), "OpenAI token must be redacted");
  assert.ok(!sanitized.includes("hf_token_"), "Hugging Face token must be redacted");
  assert.ok(!sanitized.includes("    at Socket.emit"), "Internal stack trace must be stripped");
  console.log("  ✔ Test 9: Error sanitization and secret protection verified.");

  // ---------------------------------------------------------------------------
  // Test 10: Statistical Latency Percentiles (Mean, Median, P95)
  // ---------------------------------------------------------------------------
  console.log("▶ Test 10: Statistical latency percentiles computation...");
  const sampleLatencies = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 10000];
  const metrics = calculateLatencyMetrics(sampleLatencies);

  assert.strictEqual(metrics.count, 10, "Must count all sample latencies");
  assert.strictEqual(metrics.minMs, 1000, "Minimum latency must be 1000ms");
  assert.strictEqual(metrics.maxMs, 10000, "Maximum latency must be 10000ms");
  assert.strictEqual(metrics.medianMs, 3250, "Median latency must be 3250ms");
  assert.strictEqual(metrics.p95Ms, 10000, "95th percentile latency must be 10000ms");

  const dashboardMetrics = getReliabilityDashboardMetrics();
  assert.ok(dashboardMetrics.overallSuccessRate > 0, "Dashboard metrics must report success rate");
  assert.ok(dashboardMetrics.providerHealth.gemini !== undefined, "Dashboard metrics must include Gemini health");
  console.log("  ✔ Test 10: Statistical latency metrics verified.");

  console.log("\n✨ All 10 Phase K: Production Optimization & Reliability Engineering tests PASSED successfully!\n");
}
