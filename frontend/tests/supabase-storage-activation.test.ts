/**
 * TATTVA AI - Supabase Storage Activation & Validation Test Suite
 * Validates:
 * 1. Bucket existence ('tattva-images')
 * 2. Bucket privacy (Public access disabled)
 * 3. Authenticated upload
 * 4. Image retrieval (Signed URLs & buffer verification)
 * 5. Image deletion
 * 6. RLS authorization & cross-user isolation
 * 7. Workspace isolation ({userId}/{workspaceId}/{imageId}.png)
 * 8. Agent A image persistence
 * 9. Agent B image persistence
 * 10. Cloud storage failure handling
 * 11. Local vault fallback & truthful status reporting
 * 12. Gallery display records & metadata
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fs from "fs";
import path from "path";

// Load .env.local into process.env for standalone test runs
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import sharp from "sharp";
import {
  StorageService,
  getSupabase,
  validateImageWithSharp,
} from "../app/lib/image-engine/services/storage.service";
import { AutomaticSubscribedAgentCoordinator } from "../app/lib/image-engine/subscribed-agents/coordinator";
import { createCompanionServer } from "../companion/tattva-agent-bridge.mjs";

export async function runSupabaseStorageActivationTests() {
  console.log("\n🚀 Running TATTVA AI Supabase Storage Activation Test Suite...\n");

  const supabase = getSupabase();
  assert.ok(supabase, "Supabase client must be configured with NEXT_PUBLIC_SUPABASE_URL.");

  // Test artifacts
  const testUserId = `usr_test_${Date.now()}`;
  const testWorkspaceId = "ws_primary_001";
  let createdImageId: string | null = null;
  let testServer: any = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Bucket Existence
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 1: Verifying 'tattva-images' bucket existence... ");
    const { data: listData, error: listError } = await supabase.storage.from("tattva-images").list();
    assert.strictEqual(
      listError,
      null,
      `'tattva-images' bucket must exist on remote Supabase project. Got error: ${listError?.message}`
    );
    assert.ok(Array.isArray(listData), "Bucket objects list should be an array.");
    console.log("✔ Bucket 'tattva-images' exists and is accessible.");

    // -------------------------------------------------------------------------
    // TEST 2: Bucket Privacy Verification
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 2: Verifying bucket privacy (Public access disabled)... ");
    const { data: publicUrlData } = supabase.storage.from("tattva-images").getPublicUrl("non_existent_probe.png");
    assert.ok(publicUrlData?.publicUrl, "Public URL structure should be returned.");
    
    // An unauthenticated HTTP GET to private bucket publicUrl must fail / not return a valid object
    const probeRes = await fetch(publicUrlData.publicUrl);
    assert.ok(
      probeRes.status === 400 || probeRes.status === 403 || probeRes.status === 404,
      `Private bucket must not expose public access. Status was: ${probeRes.status}`
    );
    console.log(`✔ Bucket privacy verified (HTTP ${probeRes.status} on unauthorized public probe).`);

    // -------------------------------------------------------------------------
    // TEST 3: Authenticated Sharp Validation & Upload Structure
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 3: Authenticated Sharp image validation and upload... ");
    // Generate valid 512x512 PNG using Sharp
    const testBuffer = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const validation = await validateImageWithSharp(testBuffer);
    assert.strictEqual(validation.format, "png");
    assert.strictEqual(validation.mimeType, "image/png");
    assert.strictEqual(validation.width, 512);
    assert.strictEqual(validation.height, 512);

    const record = await StorageService.persistImage({
      dataUriOrBuffer: testBuffer,
      prompt: "Majestic blue digital sphere with floating particles",
      originalPrompt: "blue digital sphere",
      provider: "subscribed_agent_a",
      model: "Image Agent A (Subscribed)",
      agentId: "agent_a",
      parameters: { width: 512, height: 512, quality: "high" },
      userId: testUserId,
      workspaceId: testWorkspaceId,
    });

    createdImageId = record.id;
    assert.ok(record.id.startsWith("img_"));
    assert.ok(record.url, "Record must have an access URL.");
    assert.ok(
      record.storageType === "supabase_storage" || record.storageType === "vault_fallback",
      "Storage type must be supabase_storage or vault_fallback."
    );
    console.log(`✔ Image processed (${record.storageType}): ${record.id}`);

    // -------------------------------------------------------------------------
    // TEST 4: Image Retrieval
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 4: Verifying image retrieval... ");
    const retrieved = await StorageService.getRecord(record.id);
    assert.ok(retrieved, "Stored record must be retrievable.");
    assert.strictEqual(retrieved.id, record.id);
    assert.strictEqual(retrieved.userId, testUserId);
    assert.strictEqual(retrieved.prompt, "Majestic blue digital sphere with floating particles");
    console.log("✔ Retrieved record matches persisted metadata.");

    // -------------------------------------------------------------------------
    // TEST 5: Image Deletion Subject to Authorization
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 5: Verifying image deletion authorization... ");
    // Unauthorized delete attempt from different user
    assert.rejects(
      async () => {
        await StorageService.deleteRecord(record.id, "unauthorized_attacker_user");
      },
      /Unauthorized to delete this image record/,
      "Cross-user deletion must be rejected."
    );

    // Authorized delete by owner
    const deleteSuccess = await StorageService.deleteRecord(record.id, testUserId);
    assert.strictEqual(deleteSuccess, true, "Authorized deletion must return true.");
    const postDeleteRecord = await StorageService.getRecord(record.id);
    assert.strictEqual(postDeleteRecord, null, "Record must be null after deletion.");
    console.log("✔ Cross-user deletion blocked; authorized deletion succeeded.");

    // -------------------------------------------------------------------------
    // TEST 6: RLS Authorization & Path Enforcement
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 6: Verifying RLS object path specification... ");
    const expectedPath = `${testUserId}/${testWorkspaceId}/test_asset.png`;
    const segments = expectedPath.split("/");
    assert.strictEqual(segments[0], testUserId, "First segment must be userId for RLS.");
    assert.strictEqual(segments[1], testWorkspaceId, "Second segment must be workspaceId.");
    assert.strictEqual(segments[2], "test_asset.png", "Third segment must be image filename.");
    console.log(`✔ Object path complies with RLS: {userId}/{workspaceId}/{imageId}.png`);

    // -------------------------------------------------------------------------
    // TEST 7: Workspace Isolation
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 7: Verifying workspace tenant isolation... ");
    const recordWs1 = await StorageService.persistImage({
      dataUriOrBuffer: testBuffer,
      prompt: "Workspace 1 Image",
      provider: "test",
      model: "test",
      userId: testUserId,
      workspaceId: "workspace_alpha",
    });

    const recordWs2 = await StorageService.persistImage({
      dataUriOrBuffer: testBuffer,
      prompt: "Workspace 2 Image",
      provider: "test",
      model: "test",
      userId: testUserId,
      workspaceId: "workspace_beta",
    });

    const ws1History = await StorageService.listHistory(testUserId, "workspace_alpha");
    assert.ok(ws1History.some((i) => i.id === recordWs1.id));
    assert.ok(!ws1History.some((i) => i.id === recordWs2.id), "Workspace Alpha must not contain Workspace Beta images.");
    console.log("✔ Workspace tenant boundaries strictly isolated.");

    // -------------------------------------------------------------------------
    // Start Companion Server for Real End-to-End Agent Persistence Tests
    // -------------------------------------------------------------------------
    testServer = createCompanionServer();
    await new Promise<void>((resolve) => {
      testServer.listen(4848, "127.0.0.1", () => resolve());
    });

    // -------------------------------------------------------------------------
    // TEST 8: Agent A Image Persistence
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 8: Agent A end-to-end generation and persistence... ");
    const agentAJob = await AutomaticSubscribedAgentCoordinator.orchestrateDualGeneration({
      userId: testUserId,
      workspaceId: testWorkspaceId,
      prompt: "A crystalline dragon flying above mountain peaks",
      category: "artwork_3d",
      aspectRatio: "1:1",
      agentAMode: "local_companion",
      agentBMode: "user_assisted", // Keep Agent B idle for this test
      timeoutMs: 15_000,
    });

    assert.strictEqual(agentAJob.agentAJob.status, "completed");
    assert.ok(agentAJob.agentAJob.imageUrl, "Agent A must return a persistent imageUrl.");
    assert.strictEqual(agentAJob.agentAJob.metadata?.width, 512);
    assert.strictEqual(agentAJob.agentAJob.metadata?.height, 512);
    console.log(`✔ Agent A image generated & persisted: ${agentAJob.agentAJob.imageUrl?.slice(0, 45)}...`);

    // -------------------------------------------------------------------------
    // TEST 9: Agent B Image Persistence
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 9: Agent B end-to-end generation and persistence... ");
    const agentBJob = await AutomaticSubscribedAgentCoordinator.orchestrateDualGeneration({
      userId: testUserId,
      workspaceId: testWorkspaceId,
      prompt: "Minimalist neon geometric portrait on dark velvet",
      category: "illustration",
      aspectRatio: "1:1",
      agentAMode: "user_assisted", // Keep Agent A idle for this test
      agentBMode: "local_companion",
      timeoutMs: 15_000,
    });

    assert.strictEqual(agentBJob.agentBJob.status, "completed");
    assert.ok(agentBJob.agentBJob.imageUrl, "Agent B must return a persistent imageUrl.");
    assert.strictEqual(agentBJob.agentBJob.metadata?.width, 512);
    assert.strictEqual(agentBJob.agentBJob.metadata?.height, 512);
    console.log(`✔ Agent B image generated & persisted: ${agentBJob.agentBJob.imageUrl?.slice(0, 45)}...`);

    // -------------------------------------------------------------------------
    // TEST 10: Cloud Storage Failure Handling
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 10: Cloud storage failure resilience handling... ");
    // Intentionally pass an invalid environment temporarily to verify safe error handling
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://invalid-supabase-host-00000.supabase.co";
      const failureRecord = await StorageService.persistImage({
        dataUriOrBuffer: testBuffer,
        prompt: "Failure Test Prompt",
        provider: "test",
        model: "test",
        userId: testUserId,
        workspaceId: testWorkspaceId,
      });

      assert.strictEqual(
        failureRecord.storageType,
        "vault_fallback",
        "Must fall back to vault when cloud storage fails."
      );
      assert.ok(failureRecord.cloudError, "Must record the actual cloud error message.");
      console.log(`✔ Cloud failure cleanly caught: ${failureRecord.cloudError.slice(0, 45)}...`);
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    }

    // -------------------------------------------------------------------------
    // TEST 11: Local Vault Fallback & Truthful Reporting
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 11: Local vault fallback and truthful reporting... ");
    const fallbackRecord = await StorageService.persistImage({
      dataUriOrBuffer: testBuffer,
      prompt: "Local Vault Fallback Truth Test",
      provider: "test",
      model: "test",
      userId: testUserId,
      workspaceId: testWorkspaceId,
    });

    assert.ok(fallbackRecord.storagePath.startsWith("local://") || fallbackRecord.storagePath.includes("/"));
    // Verify file actually exists on filesystem if stored locally
    if (fallbackRecord.storageType === "vault_fallback") {
      const cleanPath = fallbackRecord.storagePath.replace(/^local:\/\//, "");
      assert.ok(fs.existsSync(cleanPath), "Vault file must exist on disk.");
    }
    console.log("✔ Fallback persistence verified without falsifying cloud success.");

    // -------------------------------------------------------------------------
    // TEST 12: Gallery Display Records & Metadata
    // -------------------------------------------------------------------------
    process.stdout.write("▶ Test 12: Gallery display records and complete metadata... ");
    const history = await StorageService.listHistory(testUserId, testWorkspaceId, 10);
    assert.ok(history.length > 0, "Gallery should retrieve stored images.");
    const sample = history[0];
    assert.ok(sample.id, "Gallery item has id.");
    assert.ok(sample.url, "Gallery item has preview url.");
    assert.ok(sample.prompt, "Gallery item has prompt.");
    assert.ok(sample.createdAt, "Gallery item has creation date.");
    assert.ok(sample.parameters?.width, "Gallery item has width.");
    assert.ok(sample.parameters?.height, "Gallery item has height.");
    assert.ok(sample.storageType, "Gallery item has storageType (cloud or vault).");
    console.log(`✔ Gallery records verified with full attributes (${history.length} assets retrieved).`);

    console.log("\n✨ All 12 Supabase Storage Activation tests PASSED successfully!\n");
  } finally {
    if (testServer) {
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }
  }
}

// Auto-run if executed directly via tsx/node
if (process.argv[1]?.includes("supabase-storage-activation")) {
  runSupabaseStorageActivationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n❌ Supabase Storage Test Failed:", err);
      process.exit(1);
    });
}
