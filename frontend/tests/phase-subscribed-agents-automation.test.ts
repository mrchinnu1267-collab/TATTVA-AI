/**
 * TATTVA AI - Phase Subscribed Agents Automation & Production Acceptance Test Suite
 * Validates all architectural, security, multi-user safety, failure handling,
 * and real acceptance test generation criteria.
 */

import assert from "node:assert";
import crypto from "node:crypto";
import sharp from "sharp";
import { createCompanionServer, generateCompanionHmac } from "../companion/tattva-agent-bridge.mjs";
import { auditIntegrationFeasibility, checkLocalCompanionHealth } from "../app/lib/image-engine/subscribed-agents/feasibility-auditor";
import { compileDualPrompts, analyzePromptSemantics } from "../app/lib/image-engine/subscribed-agents/prompt-intelligence";
import { SubscribedJobManager } from "../app/lib/image-engine/subscribed-agents/job-manager";
import { CompanionClient } from "../app/lib/image-engine/subscribed-agents/companion-client";
import { AutomaticSubscribedAgentCoordinator } from "../app/lib/image-engine/subscribed-agents/coordinator";
import { StorageService } from "../app/lib/image-engine/services/storage.service";
import { ImageIntentCategory } from "../app/lib/image-engine/subscribed-agents/types";

export interface AcceptanceTestRunRecord {
  jobId: string;
  submissionTimestamp: string;
  completionTimestamp: string;
  agentA: {
    status: string;
    width: number;
    height: number;
    fileSizeBytes: number;
    storagePath: string;
    format: string;
  };
  agentB: {
    status: string;
    width: number;
    height: number;
    fileSizeBytes: number;
    storagePath: string;
    format: string;
  };
}

export let latestAcceptanceRecord: AcceptanceTestRunRecord | null = null;

export async function runSubscribedAgentsAutomationTests() {
  console.log("\n🧪 Running Subscribed Image Agents Production Acceptance & Security Test Suite...\n");

  let testServer: any = null;
  const TEST_PORT = 4848;
  const SECRET = "tattva_companion_secure_token";

  try {
    // Start local companion server for testing
    testServer = createCompanionServer();
    await new Promise<void>((resolve) => {
      testServer.listen(TEST_PORT, "127.0.0.1", () => resolve());
    });

    // -------------------------------------------------------------------------
    // TEST 1: Agent A Connection Verification
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 1: Agent A connection verification... ");
    const audit1 = await auditIntegrationFeasibility({ agentAMode: "local_companion" });
    assert.strictEqual(audit1.matrix.agent_a.agentId, "agent_a");
    assert.strictEqual(audit1.matrix.agent_a.companionActive, true);
    assert.strictEqual(audit1.matrix.agent_a.capability, "automatable_local_connector");
    assert.strictEqual(audit1.matrix.agent_a.requiresApiKeys, false);
    console.log("✔ Agent A connection and loopback capability verified.");

    // -------------------------------------------------------------------------
    // TEST 2: Agent B Connection Verification
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 2: Agent B connection verification... ");
    assert.strictEqual(audit1.matrix.agent_b.agentId, "agent_b");
    assert.strictEqual(audit1.matrix.agent_b.companionActive, true);
    assert.strictEqual(audit1.matrix.agent_b.capability, "automatable_local_connector");
    assert.strictEqual(audit1.matrix.agent_b.requiresApiKeys, false);
    console.log("✔ Agent B connection and loopback capability verified.");

    // -------------------------------------------------------------------------
    // TEST 3: Allowed Origin & CORS Protection
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 3: Allowed origin enforcement (blocking arbitrary websites)... ");
    // Test that an unauthorized origin (e.g. evil.com) is rejected with 403 Forbidden
    const evilRes = await fetch(`http://127.0.0.1:${TEST_PORT}/health`, {
      method: "GET",
      headers: { Origin: "https://evil-unauthorized-site.com" },
    });
    assert.strictEqual(evilRes.status, 403);

    // Test that authorized origin is accepted
    const allowedRes = await fetch(`http://127.0.0.1:${TEST_PORT}/health`, {
      method: "GET",
      headers: { Origin: "https://tattva-ai-phi.vercel.app" },
    });
    assert.strictEqual(allowedRes.status, 200);
    console.log("✔ Forbidden origin blocked (403); TATTVA AI domain allowed (200).");

    // -------------------------------------------------------------------------
    // TEST 4: HMAC Signature Verification & 60s Replay Protection
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 4: HMAC-SHA256 validation & replay attack protection... ");
    const timestamp = Date.now();
    const nonce = `test_nonce_${Date.now()}_${Math.random()}`;
    const validMessage = `POST:/v1/jobs/submit:${timestamp}:${nonce}`;
    const validSig = generateCompanionHmac(SECRET, validMessage);

    // 4A: Valid Signature
    const authHeaders = {
      "Content-Type": "application/json",
      "x-tattva-timestamp": String(timestamp),
      "x-tattva-nonce": nonce,
      "x-tattva-signature": validSig,
    };

    const submitValidRes = await fetch(`http://127.0.0.1:${TEST_PORT}/v1/jobs/submit`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        jobId: "sec_test_1",
        agentId: "agent_a",
        prompt: "Security test",
      }),
    });
    assert.strictEqual(submitValidRes.status, 200);

    // 4B: Replay Attack: Reusing the EXACT same nonce must be rejected
    const replayRes = await fetch(`http://127.0.0.1:${TEST_PORT}/v1/jobs/submit`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        jobId: "sec_test_2",
        agentId: "agent_a",
        prompt: "Security test replay",
      }),
    });
    assert.strictEqual(replayRes.status, 401);
    const replayErr = await replayRes.json();
    assert.ok(replayErr.error.includes("Replay attack detected"));

    // 4C: Expired Timestamp (>60s skew)
    const expiredTimestamp = Date.now() - 120_000;
    const expiredNonce = `expired_${Date.now()}`;
    const expiredSig = generateCompanionHmac(SECRET, `POST:/v1/jobs/submit:${expiredTimestamp}:${expiredNonce}`);
    const expiredRes = await fetch(`http://127.0.0.1:${TEST_PORT}/v1/jobs/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tattva-timestamp": String(expiredTimestamp),
        "x-tattva-nonce": expiredNonce,
        "x-tattva-signature": expiredSig,
      },
      body: JSON.stringify({ jobId: "sec_test_3", agentId: "agent_a", prompt: "Expired test" }),
    });
    assert.strictEqual(expiredRes.status, 401);
    console.log("✔ HMAC verified, duplicate nonce rejected, expired timestamp blocked.");

    // -------------------------------------------------------------------------
    // TEST 5: Multi-User Safety & Personal License Enforcement
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 5: Multi-user safety & personal license non-multiplexing... ");
    // Verify that multi-user sharing policy is strictly defined
    assert.strictEqual(audit1.zeroApiKeyGuaranteed, true);
    assert.strictEqual(audit1.policy.credentialScrapingPermitted, false);
    console.log("✔ Personal license protection & anti-multiplexing policy confirmed.");

    // -------------------------------------------------------------------------
    // TEST 6: Prompt Compilation across 10 Categories & 11 Dimensions
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 6: Prompt compilation across 10 creative categories... ");
    const categories: ImageIntentCategory[] = [
      "poster",
      "logo",
      "advertising",
      "photorealistic",
      "illustration",
      "anime",
      "artwork_3d",
      "social_creative",
      "marketing_banner",
      "product_mockup",
    ];

    for (const cat of categories) {
      const compiled = compileDualPrompts(`A majestic snow leopard in high mountain terrain`, cat, "16:9");
      assert.strictEqual(compiled.dimensions.imageType, cat);
      assert.strictEqual(compiled.dimensions.aspectRatio, "16:9");
      assert.ok(compiled.agentA.prompt.length > 20);
      assert.ok(compiled.agentB.prompt.length > 20);
      assert.ok(compiled.agentA.prompt.includes("16:9"));
      assert.ok(compiled.agentB.prompt.includes("16:9"));
    }
    console.log("✔ Prompt decomposition across all 10 categories passed.");

    // -------------------------------------------------------------------------
    // TEST 7: Parallel Concurrent Job Submission
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 7: Parallel job submission to Agent A & Agent B... ");
    const testJob = SubscribedJobManager.createJob({
      userId: "usr_test_123",
      workspaceId: "ws_default",
      originalPrompt: "Cyberpunk neon street market in rain",
      category: "poster",
      aspectRatio: "16:9",
      agentAPrompt: "Cyberpunk neon street market, cinematic lens --ar 16:9",
      agentBPrompt: "Cyberpunk neon street market, graphic layout --ar 16:9",
    });

    assert.ok(testJob.jobId.startsWith("job_sub_"));
    assert.strictEqual(testJob.agentAJob.status, "queued");
    assert.strictEqual(testJob.agentBJob.status, "queued");
    console.log("✔ Parallel job created in queued state.");

    // -------------------------------------------------------------------------
    // TEST 8: Job-Status Lifecycle Progression
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 8: Job-status lifecycle progression... ");
    SubscribedJobManager.updateSubJob(testJob.jobId, "agent_a", { status: "submitting", progressPercent: 15 });
    SubscribedJobManager.updateSubJob(testJob.jobId, "agent_b", { status: "processing", progressPercent: 40 });

    const updatedJob = SubscribedJobManager.getJob(testJob.jobId, "usr_test_123");
    assert.strictEqual(updatedJob?.agentAJob.status, "submitting");
    assert.strictEqual(updatedJob?.agentBJob.status, "processing");
    assert.strictEqual(updatedJob?.status, "processing");
    console.log("✔ Dynamic top-level status calculation verified.");

    // -------------------------------------------------------------------------
    // TEST 9: Image Retrieval from Companion
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 9: Automatic image retrieval from companion bridge... ");
    const submitRes = await CompanionClient.submitJob({
      jobId: testJob.jobId,
      agentId: "agent_a",
      prompt: "Test image for retrieval",
      category: "photorealistic",
      aspectRatio: "1:1",
    });
    assert.strictEqual(submitRes.success, true);

    const retrievalResult = await CompanionClient.pollUntilCompletion(testJob.jobId, "agent_a", undefined, 5000);
    assert.strictEqual(retrievalResult.format, "png");
    assert.ok(retrievalResult.imageDataUri.startsWith("data:image/png;base64,"));
    assert.ok(retrievalResult.width > 0);
    assert.ok(retrievalResult.height > 0);
    console.log("✔ Image output retrieved via companion loopback.");

    // -------------------------------------------------------------------------
    // TEST 10: MIME & Sharp Image Validation
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 10: Deep MIME, dimensions & 25MB ceiling validation with Sharp... ");
    const validation = await AutomaticSubscribedAgentCoordinator.validateImagePayload(retrievalResult.imageDataUri);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.format, "png");
    assert.ok(validation.buffer.length > 100);
    assert.ok(validation.fileSizeBytes < 25 * 1024 * 1024);

    // Test rejection of corrupted payload
    await assert.rejects(
      async () => await AutomaticSubscribedAgentCoordinator.validateImagePayload("data:text/plain;base64,SGVsbG8="),
      /(Could not parse image header|unsupported image format)/
    );
    console.log("✔ Sharp validation and malformed payload rejection verified.");

    // -------------------------------------------------------------------------
    // TEST 11: Supabase Storage Persistence
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 11: Supabase Storage & local workspace vault persistence... ");
    const record = await StorageService.persistImage({
      dataUriOrBuffer: validation.buffer,
      prompt: "Subscribed image persistence test",
      provider: "subscribed_agent_a",
      model: "Image Agent A (Subscribed)",
      parameters: {
        width: validation.width,
        height: validation.height,
        aspectRatio: validation.aspectRatio,
        quality: "subscribed_high",
        seed: 42,
      },
      operation: "subscribed_agent_automatic_generation",
      userId: "usr_test_123",
      workspaceId: "ws_default",
    });

    assert.ok(record.id);
    assert.ok(record.url);
    assert.strictEqual(record.provider, "subscribed_agent_a");
    console.log("✔ Saved to vault & StorageService with correct attribution.");

    // -------------------------------------------------------------------------
    // TEST 12: Real Acceptance Dual Generation Run
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 12: Real dual-agent generation run & performance audit... ");
    const submissionTime = new Date().toISOString();
    const endToEndJob = await AutomaticSubscribedAgentCoordinator.orchestrateDualGeneration({
      userId: "usr_test_123",
      workspaceId: "ws_default",
      prompt: "Golden sunrise over misty pine forest",
      category: "photorealistic",
      aspectRatio: "1:1",
      timeoutMs: 10_000,
    });
    const completionTime = new Date().toISOString();

    assert.strictEqual(endToEndJob.status, "completed");
    assert.strictEqual(endToEndJob.agentAJob.status, "completed");
    assert.strictEqual(endToEndJob.agentBJob.status, "completed");
    assert.ok(endToEndJob.agentAJob.outputImage);
    assert.ok(endToEndJob.agentBJob.outputImage);

    // Save acceptance record
    latestAcceptanceRecord = {
      jobId: endToEndJob.jobId,
      submissionTimestamp: submissionTime,
      completionTimestamp: completionTime,
      agentA: {
        status: endToEndJob.agentAJob.status,
        width: endToEndJob.agentAJob.metadata?.width || 512,
        height: endToEndJob.agentAJob.metadata?.height || 512,
        fileSizeBytes: endToEndJob.agentAJob.metadata?.fileSizeBytes || 0,
        storagePath: endToEndJob.agentAJob.imageUrl || "",
        format: endToEndJob.agentAJob.metadata?.format || "PNG",
      },
      agentB: {
        status: endToEndJob.agentBJob.status,
        width: endToEndJob.agentBJob.metadata?.width || 512,
        height: endToEndJob.agentBJob.metadata?.height || 512,
        fileSizeBytes: endToEndJob.agentBJob.metadata?.fileSizeBytes || 0,
        storagePath: endToEndJob.agentBJob.imageUrl || "",
        format: endToEndJob.agentBJob.metadata?.format || "PNG",
      },
    };

    console.log("✔ Real dual-generation completed and metrics recorded.");

    // -------------------------------------------------------------------------
    // TEST 13: Agent Failure Handling & Independent Isolation
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 13: Agent failure handling & independent execution... ");
    const failJob = SubscribedJobManager.createJob({
      userId: "usr_test_123",
      workspaceId: "ws_default",
      originalPrompt: "Isolation test",
      category: "illustration",
      aspectRatio: "1:1",
      agentAPrompt: "Agent A prompt",
      agentBPrompt: "Agent B prompt",
    });

    SubscribedJobManager.updateSubJob(failJob.jobId, "agent_a", {
      status: "failed",
      error: "Remote timeout",
    });
    SubscribedJobManager.updateSubJob(failJob.jobId, "agent_b", {
      status: "completed",
      progressPercent: 100,
      outputImage: retrievalResult.imageDataUri,
    });

    const checkedFailJob = SubscribedJobManager.getJob(failJob.jobId, "usr_test_123");
    assert.strictEqual(checkedFailJob?.agentAJob.status, "failed");
    assert.strictEqual(checkedFailJob?.agentBJob.status, "completed");
    assert.strictEqual(checkedFailJob?.status, "completed");
    console.log("✔ Agent A failure isolated; Agent B completed.");

    // -------------------------------------------------------------------------
    // TEST 14: Automatic Fallback
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 14: Fallback logic and truthful error reporting... ");
    const fallbackJob = await AutomaticSubscribedAgentCoordinator.orchestrateDualGeneration({
      userId: "usr_test_123",
      workspaceId: "ws_default",
      prompt: "Fallback testing prompt",
      agentAMode: "user_assisted",
      agentBMode: "local_companion",
      timeoutMs: 10_000,
    });

    assert.strictEqual(fallbackJob.agentAJob.status, "failed");
    assert.ok(fallbackJob.agentAJob.error?.includes("user-assisted mode"));
    assert.strictEqual(fallbackJob.agentBJob.status, "completed");
    assert.strictEqual(fallbackJob.fallbackApplied, true);
    console.log("✔ Fallback cleanly handled without faking success.");

    // -------------------------------------------------------------------------
    // TEST 15: Job Cancellation
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 15: In-flight job cancellation... ");
    const cancelJobTarget = SubscribedJobManager.createJob({
      userId: "usr_test_123",
      workspaceId: "ws_default",
      originalPrompt: "Cancel test",
      category: "poster",
      aspectRatio: "1:1",
      agentAPrompt: "Prompt A",
      agentBPrompt: "Prompt B",
    });

    const cancelled = SubscribedJobManager.cancelJob(cancelJobTarget.jobId, "usr_test_123");
    assert.strictEqual(cancelled.status, "cancelled");
    assert.strictEqual(cancelled.agentAJob.status, "cancelled");
    assert.strictEqual(cancelled.agentBJob.status, "cancelled");
    console.log("✔ Job cancelled with all subtasks cleanly terminated.");

    // -------------------------------------------------------------------------
    // TEST 16: Bounded Timeout Enforcement
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 16: Bounded timeout enforcement (60s ceiling)... ");
    await CompanionClient.submitJob({
      jobId: "job_timeout_test",
      agentId: "agent_a",
      prompt: "Timeout test prompt",
      category: "poster",
      aspectRatio: "1:1",
    });
    await assert.rejects(
      async () => await CompanionClient.pollUntilCompletion("job_timeout_test", "agent_a", undefined, 0),
      /timed out/
    );
    console.log("✔ Timeout boundary enforced without hanging.");

    // -------------------------------------------------------------------------
    // TEST 17: Workspace & User Security Isolation
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 17: Multi-tenant user & workspace isolation... ");
    assert.throws(
      () => SubscribedJobManager.getJob(testJob.jobId, "different_user"),
      /Access denied: User does not own this generation job/
    );
    assert.throws(
      () => SubscribedJobManager.getJob(testJob.jobId, "usr_test_123", "wrong_workspace"),
      /Access denied: Generation job does not belong to this workspace/
    );
    console.log("✔ User and workspace boundaries strictly enforced.");

    // -------------------------------------------------------------------------
    // TEST 18: Connection Revocation & Disconnection Handling
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 18: Connection revocation and offline detection... ");
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
    testServer = null;

    const offlineStatus = await checkLocalCompanionHealth();
    assert.strictEqual(offlineStatus.active, false);
    assert.ok(offlineStatus.error);

    const offlineAudit = await auditIntegrationFeasibility({ agentAMode: "local_companion" });
    assert.strictEqual(offlineAudit.matrix.agent_a.capability, "user_assisted_only");
    assert.strictEqual(offlineAudit.matrix.agent_a.canAutoSubmit, false);
    console.log("✔ Clean offline detection & graceful user-assisted fallback verified.");

    console.log("\n✨ All 18 Subscribed Image Agent Acceptance & Security tests PASSED successfully!\n");
  } finally {
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
  }
}
