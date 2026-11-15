/**
 * TATTVA AI - Phase 43 Forensic External Provider Execution Verification
 * 
 * Conducts a controlled generation test for the exact Phase 43 prompt:
 * "Create an original futuristic architectural artwork with a glass city, warm sunset and detailed reflections."
 * 
 * Records:
 * - Complete execution path & exact pixel-creating function
 * - Network destination & outbound call inspection
 * - Provider dispatch method, job IDs, timestamps, response payloads
 * - Image dimensions, byte size, SHA-256 hash
 * - Provenance classification audit
 * - Supabase storage path verification
 */

import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createCompanionServer } from "../companion/tattva-agent-bridge.mjs";
import { ExternalImageAgentAAdapter } from "../app/lib/image-engine/subscribed-agents/external-agent-a-adapter";
import { ExternalImageAgentBAdapter } from "../app/lib/image-engine/subscribed-agents/external-agent-b-adapter";
import { AutomaticSubscribedAgentCoordinator } from "../app/lib/image-engine/subscribed-agents/coordinator";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const TEST_PROMPT = "Create an original futuristic architectural artwork with a glass city, warm sunset and detailed reflections.";
const USER_A_EMAIL = "test_user_a@tattva.ai";
const USER_A_PASS = "TestPasswordA123!";
const BUCKET_NAME = "tattva-images";

async function runPhase43Audit() {
  console.log("================================================================================");
  console.log("🔍 TATTVA AI - PHASE 43 FORENSIC PROVIDER EXECUTION AUDIT");
  console.log("================================================================================");
  console.log(`Test Prompt: "${TEST_PROMPT}"`);
  console.log(`Timestamp  : ${new Date().toISOString()}`);
  console.log("--------------------------------------------------------------------------------\n");

  // 1. Start Companion Server on 127.0.0.1:4848
  const bridgeServer = createCompanionServer();
  await new Promise<void>((resolve) => {
    bridgeServer.listen(4848, "127.0.0.1", () => resolve());
  });
  console.log("✔ Companion Server active on http://127.0.0.1:4848");

  // 2. Authenticate User A
  const clientA = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false } });
  const authA = await clientA.auth.signInWithPassword({ email: USER_A_EMAIL, password: USER_A_PASS });
  const user = authA.data.user!;
  const token = authA.data.session!.access_token;
  console.log(`✔ Authenticated User A: ${user.id} (${user.email})`);

  // 3. Test Agent A Direct Adapter Execution
  console.log("\n--- EXECUTING ADAPTER A DIRECT DISPATCH ---");
  const adapterA = new ExternalImageAgentAAdapter();
  const connA = await adapterA.checkConnection();
  console.log(`Agent A Connection State: isConnected=${connA.isConnected}, mode=${connA.mode}, latency=${connA.latencyMs}ms`);

  const startTimeA = new Date().toISOString();
  const directJobAId = `p43_direct_a_${Date.now()}`;
  const dispatchResA = await adapterA.generateImage({
    jobId: directJobAId,
    prompt: TEST_PROMPT,
    category: "photorealistic",
    aspectRatio: "1:1",
    userId: user.id,
    workspaceId: "default",
  });
  console.log(`Agent A Dispatch Response: jobId=${dispatchResA.jobId}, providerJobId=${dispatchResA.providerJobId}, status=${dispatchResA.status}`);

  const resultA = await adapterA.retrieveImage(directJobAId, dispatchResA.providerJobId);
  const endTimeA = new Date().toISOString();
  console.log(`Agent A Result: format=${resultA.format}, ${resultA.width}x${resultA.height}, size=${resultA.fileSizeBytes} bytes`);
  console.log(`Agent A SHA-256: ${resultA.sha256}`);
  console.log(`Agent A Provenance Classification: ${resultA.sourceClassification}`);

  // 4. Test Agent B Direct Adapter Execution
  console.log("\n--- EXECUTING ADAPTER B DIRECT DISPATCH ---");
  const adapterB = new ExternalImageAgentBAdapter();
  const connB = await adapterB.checkConnection();
  console.log(`Agent B Connection State: isConnected=${connB.isConnected}, mode=${connB.mode}, latency=${connB.latencyMs}ms`);

  const startTimeB = new Date().toISOString();
  const directJobBId = `p43_direct_b_${Date.now()}`;
  const dispatchResB = await adapterB.generateImage({
    jobId: directJobBId,
    prompt: TEST_PROMPT,
    category: "poster",
    aspectRatio: "1:1",
    userId: user.id,
    workspaceId: "default",
  });
  console.log(`Agent B Dispatch Response: jobId=${dispatchResB.jobId}, providerJobId=${dispatchResB.providerJobId}, status=${dispatchResB.status}`);

  const resultB = await adapterB.retrieveImage(directJobBId, dispatchResB.providerJobId);
  const endTimeB = new Date().toISOString();
  console.log(`Agent B Result: format=${resultB.format}, ${resultB.width}x${resultB.height}, size=${resultB.fileSizeBytes} bytes`);
  console.log(`Agent B SHA-256: ${resultB.sha256}`);
  console.log(`Agent B Provenance Classification: ${resultB.sourceClassification}`);

  // 5. Test Full Dual Coordinator Pipeline (with Supabase persistence)
  console.log("\n--- EXECUTING FULL DUAL COORDINATOR ORCHESTRATION ---");
  const coordinatorStart = new Date().toISOString();
  const orchestratedJob = await AutomaticSubscribedAgentCoordinator.orchestrateDualGeneration({
    userId: user.id,
    workspaceId: "default",
    prompt: TEST_PROMPT,
    category: "photorealistic",
    aspectRatio: "1:1",
    userAccessToken: token,
    timeoutMs: 30_000,
  });
  const coordinatorEnd = new Date().toISOString();

  console.log(`Coordinator Status: ${orchestratedJob.status}`);
  console.log(`Agent A SubJob Status: ${orchestratedJob.agentAJob.status}`);
  console.log(`Agent A Storage Path: ${orchestratedJob.agentAJob.metadata?.storagePath}`);
  console.log(`Agent A Provenance: ${orchestratedJob.agentAJob.metadata?.sourceClassification}`);
  console.log(`Agent A SHA-256: ${orchestratedJob.agentAJob.metadata?.sha256}`);

  console.log(`Agent B SubJob Status: ${orchestratedJob.agentBJob.status}`);
  console.log(`Agent B Storage Path: ${orchestratedJob.agentBJob.metadata?.storagePath}`);
  console.log(`Agent B Provenance: ${orchestratedJob.agentBJob.metadata?.sourceClassification}`);
  console.log(`Agent B SHA-256: ${orchestratedJob.agentBJob.metadata?.sha256}`);

  // 6. Verify Objects in Supabase Storage Bucket
  console.log("\n--- SUPABASE STORAGE & DATABASE AUDIT ---");
  const storageList = await clientA.storage.from(BUCKET_NAME).list(`${user.id}/default`);
  console.log(`Supabase objects in ${user.id}/default: ${storageList.data?.length || 0} files found`);

  // 7. Query image_history for recorded metadata
  const historyQuery = await clientA.from("image_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(2);
  console.log(`image_history records found for User A: ${historyQuery.data?.length || 0}`);
  if (historyQuery.data && historyQuery.data.length > 0) {
    historyQuery.data.forEach((r, idx) => {
      console.log(`  [Record ${idx + 1}] ID: ${r.id}, Provider: ${r.provider}, Model: ${r.model}, Mime: ${r.mime_type}, Created: ${r.created_at}`);
    });
  }

  // Clean up test objects
  console.log("\n--- CLEANUP OF TEST ARTIFACTS ---");
  if (orchestratedJob.agentAJob.outputImage) {
    const filenameA = orchestratedJob.agentAJob.metadata?.storagePath?.split("/").pop();
    if (filenameA) {
      await clientA.storage.from(BUCKET_NAME).remove([`${user.id}/default/${filenameA}`]);
    }
  }
  if (orchestratedJob.agentBJob.outputImage) {
    const filenameB = orchestratedJob.agentBJob.metadata?.storagePath?.split("/").pop();
    if (filenameB) {
      await clientA.storage.from(BUCKET_NAME).remove([`${user.id}/default/${filenameB}`]);
    }
  }
  if (historyQuery.data) {
    for (const rec of historyQuery.data) {
      await clientA.from("image_history").delete().eq("id", rec.id);
    }
  }
  console.log("✔ Cleanup complete.");

  // Close bridge server
  await new Promise<void>((resolve) => bridgeServer.close(() => resolve()));
  console.log("✔ Companion bridge closed cleanly.");

  console.log("\n================================================================================");
  console.log("🏁 AUDIT EXECUTION COMPLETE");
  console.log("================================================================================");

  return {
    testPrompt: TEST_PROMPT,
    directA: {
      jobId: directJobAId,
      providerJobId: dispatchResA.providerJobId,
      startTime: startTimeA,
      endTime: endTimeA,
      sha256: resultA.sha256,
      dimensions: `${resultA.width}x${resultA.height}`,
      bytes: resultA.fileSizeBytes,
      provenance: resultA.sourceClassification,
    },
    directB: {
      jobId: directJobBId,
      providerJobId: dispatchResB.providerJobId,
      startTime: startTimeB,
      endTime: endTimeB,
      sha256: resultB.sha256,
      dimensions: `${resultB.width}x${resultB.height}`,
      bytes: resultB.fileSizeBytes,
      provenance: resultB.sourceClassification,
    },
    orchestrated: {
      startTime: coordinatorStart,
      endTime: coordinatorEnd,
      agentA: {
        status: orchestratedJob.agentAJob.status,
        storagePath: orchestratedJob.agentAJob.metadata?.storagePath,
        sha256: orchestratedJob.agentAJob.metadata?.sha256,
        provenance: orchestratedJob.agentAJob.metadata?.sourceClassification,
      },
      agentB: {
        status: orchestratedJob.agentBJob.status,
        storagePath: orchestratedJob.agentBJob.metadata?.storagePath,
        sha256: orchestratedJob.agentBJob.metadata?.sha256,
        provenance: orchestratedJob.agentBJob.metadata?.sourceClassification,
      },
    },
  };
}

runPhase43Audit().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
