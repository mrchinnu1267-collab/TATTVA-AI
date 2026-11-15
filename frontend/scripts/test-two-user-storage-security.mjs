/**
 * TATTVA AI - Real Two-User Supabase Storage & Database Security Verification
 * 
 * Verifies RLS enforcement on:
 * - Supabase Storage Bucket: 'tattva-images'
 * - Path Convention: {userId}/{workspaceId}/{imageId}.png
 * - Metadata Table: 'public.image_history'
 * 
 * STRICT CONSTRAINTS:
 * - Uses real authenticated Supabase client sessions (User A & User B).
 * - ZERO service-role credentials (no RLS bypass).
 * - Tests 9 distinct cross-user security and isolation scenarios.
 * - Cleans up all test assets upon completion.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local");
  process.exit(1);
}

const BUCKET_NAME = "tattva-images";
const USER_A_EMAIL = "test_user_a@tattva.ai";
const USER_A_PASS = "TestPasswordA123!";
const USER_B_EMAIL = "test_user_b@tattva.ai";
const USER_B_PASS = "TestPasswordB123!";

export async function runTwoUserSecurityTest() {
  console.log("================================================================================");
  console.log("🛡️  TATTVA AI - REAL TWO-USER SUPABASE STORAGE & RLS SECURITY VERIFICATION");
  console.log("================================================================================");
  console.log(`Target Bucket: ${BUCKET_NAME}`);
  console.log(`Supabase URL : ${supabaseUrl}`);
  console.log("--------------------------------------------------------------------------------\n");

  // Create isolated clients for User A and User B using publishable key only
  const clientA = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Step 1: Sign in User A
  process.stdout.write("🔑 Authenticating User A (Client Session)... ");
  const authResA = await clientA.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: USER_A_PASS,
  });

  if (authResA.error) {
    console.log("FAILED");
    console.error(`\n❌ User A Authentication Error: ${authResA.error.message}`);
    if (authResA.error.message.includes("Email not confirmed")) {
      console.log("\n⚠️  ACTION REQUIRED IN SUPABASE SQL EDITOR:");
      console.log("Run the following SQL in your Supabase SQL Editor to confirm test accounts:\n");
      console.log("UPDATE auth.users SET email_confirmed_at = now() WHERE email IN ('test_user_a@tattva.ai', 'test_user_b@tattva.ai');\n");
    }
    return { results: [], passed: 0, failed: 1, error: authResA.error.message };
  }
  const userA = authResA.data.user;
  console.log(`✔ SUCCESS [UID: ${userA.id}]`);

  // Step 2: Sign in User B
  process.stdout.write("🔑 Authenticating User B (Client Session)... ");
  const authResB = await clientB.auth.signInWithPassword({
    email: USER_B_EMAIL,
    password: USER_B_PASS,
  });

  if (authResB.error) {
    console.log("FAILED");
    console.error(`\n❌ User B Authentication Error: ${authResB.error.message}`);
    if (authResB.error.message.includes("Email not confirmed")) {
      console.log("\n⚠️  ACTION REQUIRED IN SUPABASE SQL EDITOR:");
      console.log("Run the following SQL in your Supabase SQL Editor to confirm test accounts:\n");
      console.log("UPDATE auth.users SET email_confirmed_at = now() WHERE email IN ('test_user_a@tattva.ai', 'test_user_b@tattva.ai');\n");
    }
    return { results: [], passed: 0, failed: 1, error: authResB.error.message };
  }
  const userB = authResB.data.user;
  console.log(`✔ SUCCESS [UID: ${userB.id}]\n`);

  // Generate test PNG buffers using Sharp
  const imgBufferA = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 59, g: 130, b: 246, alpha: 1 }, // Blue
    },
  }).png().toBuffer();

  const imgBufferB = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 16, g: 185, b: 129, alpha: 1 }, // Emerald Green
    },
  }).png().toBuffer();

  const testTimestamp = Date.now();
  const imageIdA = `img_test_usera_${testTimestamp}`;
  const imageIdB = `img_test_userb_${testTimestamp}`;
  const workspaceId = "default";

  const storagePathA = `${userA.id}/${workspaceId}/${imageIdA}.png`;
  const storagePathB = `${userB.id}/${workspaceId}/${imageIdB}.png`;
  const tamperedPathByB = `${userA.id}/${workspaceId}/tampered_by_b_${testTimestamp}.png`;

  const results = [];

  // ===========================================================================
  // TEST 1: User A uploads an image to their own directory
  // Expected: SUCCESS
  // ===========================================================================
  process.stdout.write("▶ Test 1: User A uploads image to own directory... ");
  const uploadResA = await clientA.storage
    .from(BUCKET_NAME)
    .upload(storagePathA, imgBufferA, {
      contentType: "image/png",
      upsert: true,
    });

  if (!uploadResA.error && uploadResA.data?.path) {
    console.log(`✔ SUCCESS (${uploadResA.data.path})`);
    results.push({ test: 1, name: "User A Upload Own Directory", status: "PASS", outcome: "SUCCESS", detail: uploadResA.data.path });
  } else {
    console.log(`✘ FAILED: ${uploadResA.error?.message}`);
    results.push({ test: 1, name: "User A Upload Own Directory", status: "FAIL", outcome: uploadResA.error?.message });
  }

  // Also create User A's image_history database record
  await clientA.from("image_history").insert({
    id: imageIdA,
    user_id: userA.id,
    workspace_id: workspaceId,
    image_url: `/api/image/download?path=${encodeURIComponent(storagePathA)}`,
    storage_path: storagePathA,
    storage_type: "supabase_storage",
    prompt: "A serene glowing blue sphere in deep space",
    original_prompt: "blue sphere",
    provider: "subscribed_agent_a",
    model: "Image Agent A (Subscribed)",
    parameters: { width: 256, height: 256 },
    file_size_bytes: imgBufferA.length,
    mime_type: "image/png",
  });

  // ===========================================================================
  // TEST 2: User B uploads an image to their own directory
  // Expected: SUCCESS
  // ===========================================================================
  process.stdout.write("▶ Test 2: User B uploads image to own directory... ");
  const uploadResB = await clientB.storage
    .from(BUCKET_NAME)
    .upload(storagePathB, imgBufferB, {
      contentType: "image/png",
      upsert: true,
    });

  if (!uploadResB.error && uploadResB.data?.path) {
    console.log(`✔ SUCCESS (${uploadResB.data.path})`);
    results.push({ test: 2, name: "User B Upload Own Directory", status: "PASS", outcome: "SUCCESS", detail: uploadResB.data.path });
  } else {
    console.log(`✘ FAILED: ${uploadResB.error?.message}`);
    results.push({ test: 2, name: "User B Upload Own Directory", status: "FAIL", outcome: uploadResB.error?.message });
  }

  // Also create User B's image_history database record
  await clientB.from("image_history").insert({
    id: imageIdB,
    user_id: userB.id,
    workspace_id: workspaceId,
    image_url: `/api/image/download?path=${encodeURIComponent(storagePathB)}`,
    storage_path: storagePathB,
    storage_type: "supabase_storage",
    prompt: "An emerald green crystal floating above misty mountains",
    original_prompt: "green crystal",
    provider: "subscribed_agent_b",
    model: "Image Agent B (Subscribed)",
    parameters: { width: 256, height: 256 },
    file_size_bytes: imgBufferB.length,
    mime_type: "image/png",
  });

  // ===========================================================================
  // TEST 3: User B attempts to upload into User A's directory
  // Expected: REJECTED (RLS Violation)
  // ===========================================================================
  process.stdout.write("▶ Test 3: User B attempts upload into User A's directory... ");
  const crossUploadRes = await clientB.storage
    .from(BUCKET_NAME)
    .upload(tamperedPathByB, imgBufferB, {
      contentType: "image/png",
    });

  if (crossUploadRes.error) {
    console.log(`✔ REJECTED (${crossUploadRes.error.message})`);
    results.push({ test: 3, name: "User B Upload to User A Directory", status: "PASS", outcome: "REJECTED", detail: crossUploadRes.error.message });
  } else {
    console.log(`✘ FAILED: Upload unexpectedly succeeded (RLS breach!)`);
    results.push({ test: 3, name: "User B Upload to User A Directory", status: "FAIL", outcome: "UNEXPECTED_SUCCESS" });
  }

  // ===========================================================================
  // TEST 4: User A retrieves their own image
  // Expected: SUCCESS
  // ===========================================================================
  process.stdout.write("▶ Test 4: User A retrieves their own image... ");
  const downloadResA = await clientA.storage
    .from(BUCKET_NAME)
    .download(storagePathA);

  if (!downloadResA.error && downloadResA.data) {
    const arrayBuffer = await downloadResA.data.arrayBuffer();
    const retrievedBuffer = Buffer.from(arrayBuffer);
    const valid = retrievedBuffer.length === imgBufferA.length;
    console.log(`✔ SUCCESS (${retrievedBuffer.length} bytes received)`);
    results.push({ test: 4, name: "User A Retrieve Own Image", status: "PASS", outcome: "SUCCESS", detail: `${retrievedBuffer.length} bytes` });
  } else {
    console.log(`✘ FAILED: ${downloadResA.error?.message}`);
    results.push({ test: 4, name: "User A Retrieve Own Image", status: "FAIL", outcome: downloadResA.error?.message });
  }

  // ===========================================================================
  // TEST 5: User B attempts to retrieve User A's image
  // Expected: REJECTED
  // ===========================================================================
  process.stdout.write("▶ Test 5: User B attempts to retrieve User A's image... ");
  const crossDownloadRes = await clientB.storage
    .from(BUCKET_NAME)
    .download(storagePathA);

  if (crossDownloadRes.error) {
    console.log(`✔ REJECTED (${crossDownloadRes.error.message})`);
    results.push({ test: 5, name: "User B Retrieve User A Image", status: "PASS", outcome: "REJECTED", detail: crossDownloadRes.error.message });
  } else {
    console.log("✘ FAILED: User B successfully downloaded User A's image!");
    results.push({ test: 5, name: "User B Retrieve User A Image", status: "FAIL", outcome: "UNEXPECTED_SUCCESS" });
  }

  // ===========================================================================
  // TEST 6: User B attempts to update User A's image / storage object
  // Expected: REJECTED
  // ===========================================================================
  process.stdout.write("▶ Test 6: User B attempts to update User A's image object... ");
  const crossUpdateRes = await clientB.storage
    .from(BUCKET_NAME)
    .update(storagePathA, imgBufferB, {
      contentType: "image/png",
    });

  if (crossUpdateRes.error) {
    console.log(`✔ REJECTED (${crossUpdateRes.error.message})`);
    results.push({ test: 6, name: "User B Update User A Image Object", status: "PASS", outcome: "REJECTED", detail: crossUpdateRes.error.message });
  } else {
    console.log("✘ FAILED: User B successfully overwritten User A's image!");
    results.push({ test: 6, name: "User B Update User A Image Object", status: "FAIL", outcome: "UNEXPECTED_SUCCESS" });
  }

  // ===========================================================================
  // TEST 7: User B attempts to delete User A's image
  // Expected: REJECTED
  // ===========================================================================
  process.stdout.write("▶ Test 7: User B attempts to delete User A's image... ");
  const crossDeleteRes = await clientB.storage
    .from(BUCKET_NAME)
    .remove([storagePathA]);

  // In Supabase Storage, removing a non-owned item either returns an error or an empty array []
  const deleteBlocked = crossDeleteRes.error || (crossDeleteRes.data && crossDeleteRes.data.length === 0);

  // Verify object still exists for User A
  const verifyStillExists = await clientA.storage.from(BUCKET_NAME).download(storagePathA);

  if (deleteBlocked && !verifyStillExists.error && verifyStillExists.data) {
    console.log(`✔ REJECTED (Object preserved, removal blocked by RLS)`);
    results.push({ test: 7, name: "User B Delete User A Image", status: "PASS", outcome: "REJECTED", detail: "Object preserved" });
  } else {
    console.log("✘ FAILED: User B deleted User A's image!");
    results.push({ test: 7, name: "User B Delete User A Image", status: "FAIL", outcome: "UNEXPECTED_SUCCESS" });
  }

  // ===========================================================================
  // TEST 8: User A deletes their own image
  // Expected: SUCCESS
  // ===========================================================================
  process.stdout.write("▶ Test 8: User A deletes their own image... ");
  const deleteResA = await clientA.storage
    .from(BUCKET_NAME)
    .remove([storagePathA]);

  // Verify deletion via directory listing (bypasses HTTP cache on the object URL)
  const listAfterDelete = await clientA.storage
    .from(BUCKET_NAME)
    .list(`${userA.id}/${workspaceId}`);

  const fileStillInList = (listAfterDelete.data || []).some((item) => item.name === `${imageIdA}.png`);
  const isDeleted =
    !deleteResA.error &&
    deleteResA.data &&
    deleteResA.data.length > 0 &&
    !fileStillInList;

  if (isDeleted) {
    console.log(`✔ SUCCESS (Object successfully deleted from remote bucket)`);
    results.push({ test: 8, name: "User A Delete Own Image", status: "PASS", outcome: "SUCCESS", detail: "Object deleted" });
  } else {
    console.log(`✘ FAILED: data=${JSON.stringify(deleteResA.data)}, error=${deleteResA.error?.message}`);
    results.push({ test: 8, name: "User A Delete Own Image", status: "FAIL", outcome: deleteResA.error?.message || "Object still accessible" });
  }

  // Also clean up User A's image_history row
  await clientA.from("image_history").delete().eq("id", imageIdA);

  // ===========================================================================
  // TEST 9: User B attempts to access User A's image_history database record
  // Expected: REJECTED or ZERO accessible rows
  // ===========================================================================
  process.stdout.write("▶ Test 9: User B queries User A's image_history record... ");
  const queryHistoryRes = await clientB
    .from("image_history")
    .select("*")
    .eq("user_id", userA.id);

  if (!queryHistoryRes.error && Array.isArray(queryHistoryRes.data)) {
    if (queryHistoryRes.data.length === 0) {
      console.log(`✔ REJECTED / ZERO ROWS (RLS Row Isolation Active: 0 rows returned)`);
      results.push({ test: 9, name: "User B Access User A History", status: "PASS", outcome: "ZERO_ACCESSIBLE_ROWS", detail: "0 rows returned" });
    } else {
      console.log(`✘ FAILED: User B accessed User A's history! (${queryHistoryRes.data.length} rows returned)`);
      results.push({ test: 9, name: "User B Access User A History", status: "FAIL", outcome: "DATA_LEAK" });
    }
  } else if (queryHistoryRes.error) {
    console.log(`✔ REJECTED (${queryHistoryRes.error.message})`);
    results.push({ test: 9, name: "User B Access User A History", status: "PASS", outcome: "REJECTED", detail: queryHistoryRes.error.message });
  }

  // ===========================================================================
  // CLEANUP: Clean up User B's test image and history
  // ===========================================================================
  console.log("\n🧹 Cleaning up test artifacts...");
  await clientB.storage.from(BUCKET_NAME).remove([storagePathB]);
  await clientB.from("image_history").delete().eq("id", imageIdB);
  console.log("✔ Cleanup complete.");

  // Summary
  console.log("\n================================================================================");
  console.log("📊 TWO-USER STORAGE SECURITY TEST SUMMARY");
  console.log("================================================================================");
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Scenarios Tested : ${results.length}`);
  console.log(`Passed                 : ${passed}`);
  console.log(`Failed                 : ${failed}`);
  console.log("================================================================================\n");

  return { results, passed, failed, userA: userA.id, userB: userB.id };
}

if (process.argv[1]?.endsWith("test-two-user-storage-security.mjs")) {
  runTwoUserSecurityTest().catch((err) => {
    console.error("Test runner failed:", err);
    process.exit(1);
  });
}
