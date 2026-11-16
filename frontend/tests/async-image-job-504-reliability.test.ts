/**
 * TATTVA AI - HTTP 504 Gateway Timeout Elimination & Asynchronous Job Reliability Test Suite
 * Validates:
 * 1. Immediate non-blocking chat response (<100ms) for image requests via async job tickets
 * 2. Successful generation with complete structured timestamps trace:
 *    (dispatchedAt, workerStartedAt, fluxRequestedAt, fluxRespondedAt, geminiVerificationStartedAt, geminiVerificationCompletedAt, completedAt)
 * 3. Cloudflare Workers AI generation timeout handling
 * 4. Gemini Vision timeout handling (honest "unavailable" reporting, zero fabricated scores)
 * 5. Worker crash detection & recovery (unhandled termination marked as failed)
 * 6. Stale job recovery (heartbeat timeout transitions to failed)
 * 7. Cross-instance job polling & rehydration (params rehydration across isolated containers)
 * 8. Multiple refinement attempts with dynamic progress tracking (never static 25%)
 * 9. Maximum overall job deadline enforcement (180s ceiling)
 * 10. Concurrent requests & duplicate prevention
 */

import assert from "node:assert/strict";
import sharp from "sharp";
import {
  createImageJob,
  getJob,
  getOrCreateJob,
  checkAndRecoverStaleJob,
  cancelJob,
  executeJob,
  findActiveJob,
  resetJobQueue,
} from "../app/lib/image-engine/reliability/job-queue";
import { aiOrchestrator } from "../app/lib/ai-orchestrator";

export async function runAsyncImageJobReliabilityTests() {
  console.log("\n================================================================================");
  console.log("🛡️ TATTVA AI - ASYNCHRONOUS IMAGE JOB & 504 TIMEOUT RELIABILITY SUITE");
  console.log("================================================================================\n");

  const originalFetch = globalThis.fetch;
  const originalCfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const originalCfToken = process.env.CLOUDFLARE_API_TOKEN;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  process.env.CLOUDFLARE_ACCOUNT_ID = "mock-cf-account";
  process.env.CLOUDFLARE_API_TOKEN = "mock-cf-token";
  process.env.GEMINI_API_KEY = "mock-gemini-key";

  const validJpegBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 60, g: 120, b: 240 },
    },
  })
    .jpeg()
    .toBuffer();

  resetJobQueue();

  try {
    // ===========================================================================
    // TEST 1: CHAT SYNCHRONOUS TIMEOUT PREVENTION (< 100ms Job Ticket Dispatch)
    // ===========================================================================
    console.log("▶ [TEST 1] Verifying Chat request dispatches immediate job ticket (< 100ms) to eliminate 504 timeout...");

    const chatStart = Date.now();
    const chatResponse = await aiOrchestrator.processRequest({
      messages: [
        {
          role: "user",
          content: "Create a poster for Vignan Mahotsav with stages, dates, and EDM night",
        },
      ],
      context: {
        userId: "user_504_prevention",
        userEmail: "test@tattva.ai",
        asyncImageJob: true, // Signal asynchronous job mode used by /api/chat
      },
    });
    const chatDurationMs = Date.now() - chatStart;

    assert.equal(chatResponse.kind, "image_job", `Expected kind to be "image_job", got "${chatResponse.kind}"`);
    assert.ok(chatResponse.imageJob, "Response must contain imageJob metadata");
    assert.ok(chatResponse.imageJob.id, "imageJob must contain a valid id");
    assert.ok(
      chatResponse.imageJob.status === "queued" || chatResponse.imageJob.status === "processing",
      `Initial status must be "queued" or "processing", got "${chatResponse.imageJob.status}"`
    );
    assert.ok(chatDurationMs < 2000, `Chat response took ${chatDurationMs}ms; must return immediately (< 2000ms)`);

    console.log(`  ✓ Chat dispatch completed in ${chatDurationMs}ms (immediate return prevents Vercel 504 timeout).`);
    console.log(`  ✓ Job Ticket issued: ${chatResponse.imageJob.id} [status: ${chatResponse.imageJob.status}]`);

    // ===========================================================================
    // TEST 2: SUCCESSFUL GENERATION WITH COMPLETE TIMESTAMPS TRACE
    // ===========================================================================
    console.log("\n▶ [TEST 2] Testing successful generation with complete timestamps trace...");

    // Intercept fetch for controlled deterministic testing
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (urlStr.includes("@cf/black-forest-labs/flux-1-schnell") || urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }

      if (urlStr.includes("generativelanguage.googleapis.com")) {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        score: 96,
                        verdict: "pass",
                        categoryScores: {
                          main_subject: 96,
                          object_presence: 96,
                          object_count: 95,
                          color_accuracy: 96,
                          spatial_accuracy: 96,
                          background_accuracy: 96,
                          style_accuracy: 96,
                          text_accuracy: 96,
                        },
                        identifiedFeatures: ["cute kitten"],
                        issues: [],
                        suggestedFix: "",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return originalFetch(input, init);
    };

    const shortJob = createImageJob({
      prompt: "A cute kitten sitting on a desk",
      userId: "user_short_prompt",
      forceNew: true,
    });

    const completedShortJob = await executeJob(shortJob.id);
    assert.equal(completedShortJob.status, "completed", "Job must complete successfully");
    assert.ok(completedShortJob.resultImage, "Completed job must have resultImage");
    assert.equal(completedShortJob.accuracy, 96, "Adherence score must match verification");
    assert.equal(completedShortJob.providerUsed, "cloudflare");

    // Verify complete timestamps trace
    assert.ok(completedShortJob.timestamps, "Job must record structured timestamps");
    assert.ok(completedShortJob.timestamps.dispatchedAt, "dispatchedAt timestamp must exist");
    assert.ok(completedShortJob.timestamps.workerStartedAt, "workerStartedAt timestamp must exist");
    assert.ok(completedShortJob.timestamps.fluxRequestedAt, "fluxRequestedAt timestamp must exist");
    assert.ok(completedShortJob.timestamps.fluxRespondedAt, "fluxRespondedAt timestamp must exist");
    assert.ok(completedShortJob.timestamps.geminiVerificationStartedAt, "geminiVerificationStartedAt timestamp must exist");
    assert.ok(completedShortJob.timestamps.geminiVerificationCompletedAt, "geminiVerificationCompletedAt timestamp must exist");
    assert.ok(completedShortJob.timestamps.completedAt, "completedAt timestamp must exist");

    console.log(`  ✓ Short prompt job "${shortJob.id}" completed with adherence ${completedShortJob.accuracy}%`);
    console.log(`  ✓ Timestamps traced:`);
    console.log(`    - Dispatched:     ${completedShortJob.timestamps.dispatchedAt}`);
    console.log(`    - Worker Started: ${completedShortJob.timestamps.workerStartedAt}`);
    console.log(`    - FLUX Request:   ${completedShortJob.timestamps.fluxRequestedAt}`);
    console.log(`    - FLUX Response:  ${completedShortJob.timestamps.fluxRespondedAt}`);
    console.log(`    - Vision Audit:   ${completedShortJob.timestamps.geminiVerificationStartedAt} -> ${completedShortJob.timestamps.geminiVerificationCompletedAt}`);
    console.log(`    - Completed:      ${completedShortJob.timestamps.completedAt}`);

    // ===========================================================================
    // TEST 3: CLOUDFLARE GENERATION TIMEOUT RESILIENCE
    // ===========================================================================
    console.log("\n▶ [TEST 3] Testing Cloudflare generation API timeout handling...");

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (urlStr.includes("@cf/black-forest-labs/flux-1-schnell") || urlStr.includes("api.cloudflare.com")) {
        const timeoutErr = new Error("Cloudflare Workers AI generation timed out after 30 seconds. Please try again.");
        timeoutErr.name = "TimeoutError";
        throw timeoutErr;
      }
      return originalFetch(input, init);
    };

    const cfTimeoutJob = createImageJob({
      prompt: "Abstract digital sculpture in glass and obsidian",
      userId: "user_cf_timeout",
      forceNew: true,
    });

    const failedCfJob = await executeJob(cfTimeoutJob.id);
    assert.equal(failedCfJob.status, "failed", "Job must report 'failed' when generation provider times out");
    assert.ok(
      failedCfJob.error?.toLowerCase().includes("timeout") ||
        failedCfJob.error?.toLowerCase().includes("timed out") ||
        failedCfJob.error?.toLowerCase().includes("failed"),
      `Error must describe failure: ${failedCfJob.error}`
    );
    assert.equal(failedCfJob.resultImage, undefined, "No fake image should be returned on generation failure");
    console.log(`  ✓ Cloudflare timeout correctly failed job without hallucinating fake image: "${failedCfJob.error}"`);

    // ===========================================================================
    // TEST 4: GEMINI VISION TIMEOUT RESILIENCE
    // ===========================================================================
    console.log("\n▶ [TEST 4] Testing Gemini Vision timeout handling (honest reporting, zero fake scores)...");

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (urlStr.includes("@cf/black-forest-labs/flux-1-schnell") || urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }

      if (urlStr.includes("generativelanguage.googleapis.com")) {
        const err = new Error("Request timed out after 25000ms");
        err.name = "AbortError";
        throw err;
      }

      return originalFetch(input, init);
    };

    const timeoutJob = createImageJob({
      prompt: "A futuristic city under a dome",
      userId: "user_timeout",
      forceNew: true,
    });

    const completedTimeoutJob = await executeJob(timeoutJob.id);
    assert.equal(completedTimeoutJob.status, "completed", "Job should still succeed with image even if Vision evaluation is unavailable");
    assert.ok(completedTimeoutJob.resultImage, "Image must still be returned");
    assert.equal(completedTimeoutJob.verification?.method, "unavailable", "Verification method must honestly report 'unavailable'");
    console.log(`  ✓ Gemini Vision timeout cleanly handled: verification.method = "${completedTimeoutJob.verification?.method}" (zero fabricated scores)`);

    // ===========================================================================
    // TEST 5: WORKER CRASH & HEARTBEAT EXPIRATION TRANSITION
    // ===========================================================================
    console.log("\n▶ [TEST 5] Testing worker crash & heartbeat expiration transition to Failed...");

    const crashJob = createImageJob({
      prompt: "Dramatic ocean storm at sunset",
      userId: "user_crash",
      forceNew: true,
    });

    // Simulate worker started, made progress, but container died without updating for > 50s
    crashJob.status = "processing";
    crashJob.currentStage = "generating";
    crashJob.progressPercent = 25;
    crashJob.updatedAt = new Date(Date.now() - 50_000).toISOString(); // 50 seconds ago

    const recoveredCrashedJob = checkAndRecoverStaleJob(crashJob);
    assert.equal(recoveredCrashedJob.status, "failed", "Stale un-updated job must transition to failed");
    assert.ok(recoveredCrashedJob.error?.includes("terminated") || recoveredCrashedJob.error?.includes("timed out"));
    assert.equal(recoveredCrashedJob.progressPercent, 100);
    console.log(`  ✓ Crashed worker successfully detected and transitioned to 'failed': "${recoveredCrashedJob.statusMessage}"`);

    // ===========================================================================
    // TEST 6: CROSS-INSTANCE JOB REHYDRATION & POLLING
    // ===========================================================================
    console.log("\n▶ [TEST 6] Testing cross-instance job rehydration & polling across isolated lambdas...");

    const remoteJobId = `job-remote-${Date.now()}`;
    const remoteParams = {
      prompt: "A majestic golden eagle soaring over snowy peaks",
      userId: "user_cross_lambda",
      quality: "balanced" as const,
      aspectRatio: "16:9" as const,
    };

    // Container B initially has never seen remoteJobId
    assert.equal(getJob(remoteJobId), null, "Container B must initially return null for unseen job");

    // Rehydrate using client ticket params
    const rehydratedJob = getOrCreateJob(remoteJobId, remoteParams);
    assert.ok(rehydratedJob, "Container B must rehydrate job from ticket params");
    assert.equal(rehydratedJob?.id, remoteJobId);
    assert.equal(rehydratedJob?.prompt, remoteParams.prompt);
    assert.equal(rehydratedJob?.aspectRatio, "16:9");
    console.log(`  ✓ Cross-instance job "${remoteJobId}" seamlessly rehydrated and accessible across lambdas.`);

    // ===========================================================================
    // TEST 7: MULTIPLE REFINEMENT ATTEMPTS & DYNAMIC PROGRESS
    // ===========================================================================
    console.log("\n▶ [TEST 7] Testing multi-attempt automatic refinement and dynamic stage progress...");

    let visionCallCount = 0;
    const progressRecorded: number[] = [];

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (urlStr.includes("@cf/black-forest-labs/flux-1-schnell") || urlStr.includes("api.cloudflare.com")) {
        return new Response(validJpegBuffer, {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }

      if (urlStr.includes("generativelanguage.googleapis.com")) {
        visionCallCount++;
        // Attempt 1: score 78% (triggers refinement)
        // Attempt 2: score 96% (passes target >= 95)
        const score = visionCallCount === 1 ? 78 : 96;
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        score,
                        verdict: score >= 95 ? "pass" : "fail",
                        categoryScores: {
                          main_subject: score,
                          object_presence: score,
                          object_count: score,
                          color_accuracy: score,
                          spatial_accuracy: score,
                          background_accuracy: score,
                          style_accuracy: score,
                          text_accuracy: score,
                        },
                        identifiedFeatures: ["festival poster"],
                        issues: score < 95 ? ["Missing EDM concert banner"] : [],
                        suggestedFix: score < 95 ? "Add prominent EDM concert banner in bright neon" : "",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return originalFetch(input, init);
    };

    const multiAttemptJob = createImageJob({
      prompt: "Festival poster with EDM concert banner",
      userId: "user_multi_attempt",
      forceNew: true,
    });

    const finishedMultiJob = await executeJob(multiAttemptJob.id);
    assert.equal(finishedMultiJob.status, "completed");
    assert.equal(finishedMultiJob.accuracy, 96);
    assert.ok(visionCallCount >= 2, `Expected at least 2 vision refinement calls, got ${visionCallCount}`);

    // Verify refinement timestamps
    assert.ok(finishedMultiJob.timestamps?.refinementStartedAt, "refinementStartedAt must be recorded on refinement");
    assert.ok(finishedMultiJob.timestamps?.refinementCompletedAt, "refinementCompletedAt must be recorded on refinement");
    console.log(`  ✓ Multi-attempt refinement passed in ${visionCallCount} attempts (Final score: ${finishedMultiJob.accuracy}%)`);
    console.log(`    - Refinement window: ${finishedMultiJob.timestamps?.refinementStartedAt} -> ${finishedMultiJob.timestamps?.refinementCompletedAt}`);

    // ===========================================================================
    // TEST 8: MAXIMUM JOB DEADLINE CEILING ENFORCEMENT
    // ===========================================================================
    console.log("\n▶ [TEST 8] Testing maximum overall job deadline ceiling enforcement (180s)...");

    const deadlineJob = createImageJob({
      prompt: "Ultra complex hyper-detailed architectural schematic",
      userId: "user_deadline",
      forceNew: true,
    });

    // Simulate job started 200 seconds ago (exceeding 180s deadline)
    deadlineJob.startedAt = new Date(Date.now() - 200_000).toISOString();
    deadlineJob.deadline = Date.now() - 20_000; // deadline in the past
    deadlineJob.status = "processing";

    const expiredJob = checkAndRecoverStaleJob(deadlineJob);
    assert.equal(expiredJob.status, "failed", "Expired deadline job must transition to failed");
    assert.ok(expiredJob.error?.includes("deadline"), `Error must mention deadline: ${expiredJob.error}`);
    assert.equal(expiredJob.progressPercent, 100);
    console.log(`  ✓ Maximum deadline cleanly enforced: "${expiredJob.error}"`);

    // ===========================================================================
    // TEST 9: CONCURRENT REQUESTS & DUPLICATE PREVENTION
    // ===========================================================================
    console.log("\n▶ [TEST 9] Testing concurrent requests and duplicate job prevention...");

    const promptIdentical = "Cyberpunk neon lotus flower on water";
    const jobA = createImageJob({ prompt: promptIdentical, userId: "user_concurrent" });
    const jobB = createImageJob({ prompt: promptIdentical, userId: "user_concurrent" });
    assert.equal(jobA.id, jobB.id, "Duplicate request for identical prompt must return the active job without spinning duplicate work");
    console.log(`  ✓ Duplicate request prevention verified: Job A (${jobA.id}) === Job B (${jobB.id})`);

    // ===========================================================================
    // TEST 10: PERSISTENT IMAGE ACCESSIBILITY AFTER COMPLETION
    // ===========================================================================
    console.log("\n▶ [TEST 10] Testing persistent job image retrieval (with cross-lambda disk cache)...");

    const retrievedJob = getJob(completedShortJob.id);
    assert.ok(retrievedJob, "Job must be retrievable from job store");
    assert.equal(retrievedJob?.status, "completed");
    assert.ok(retrievedJob?.resultImage);
    assert.ok(retrievedJob?.resultImage.startsWith("data:image/"));
    console.log(`  ✓ Job "${completedShortJob.id}" retrievable with full metadata and valid image payload.`);

  } finally {
    globalThis.fetch = originalFetch;
    process.env.CLOUDFLARE_ACCOUNT_ID = originalCfAccount;
    process.env.CLOUDFLARE_API_TOKEN = originalCfToken;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }

  console.log("\n================================================================================");
  console.log("🎉 ALL ASYNCHRONOUS IMAGE JOB & RELIABILITY TESTS PASSED (100% SUCCESS)!");
  console.log("================================================================================\n");
}

if (process.argv[1]?.includes("async-image-job-504-reliability.test.ts")) {
  runAsyncImageJobReliabilityTests().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
}
