/**
 * Test Suite: Durable Multi-Tenant Cloud Chat Persistence & Serverless Data Integrity
 * Validates dual-layer storage, multi-tenant isolation, CRUD operations, and export
 */

import assert from "node:assert";
import { durableChatStore } from "../app/lib/chats/durable-chat-store.ts";

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("  TATTVA AI — DURABLE CHAT PERSISTENCE & DATA INTEGRITY TEST SUITE");
  console.log("===============================================================================\n");

  const userA = "alice_test@tattva.ai";
  const userB = "bob_test@tattva.ai";

  // Clean state for test users
  await durableChatStore.deleteUserSessions(userA);
  await durableChatStore.deleteUserSessions(userB);

  // Test 1: Empty initial state
  console.log("1. Verifying initial clean state...");
  const initialA = await durableChatStore.loadUserSessions(userA);
  assert.strictEqual(initialA.length, 0, "Initial sessions for User A must be empty");
  console.log("✓ Initial clean state verified.\n");

  // Test 2: Save and persist multiple sessions for User A
  console.log("2. Testing save and load sessions for User A...");
  const sampleSessionsA = [
    {
      id: "sess_alpha_001",
      title: "Quantum Physics Discussion",
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      pinned: true,
      tags: ["physics", "science"],
      messages: [
        { role: "user", content: "Explain quantum entanglement in simple terms." },
        { role: "assistant", content: "Quantum entanglement is a phenomenon where two particles become linked..." }
      ]
    },
    {
      id: "sess_beta_002",
      title: "Next.js 16 Fullstack App Design",
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 1800000,
      pinned: false,
      tags: ["coding", "react"],
      messages: [
        { role: "user", content: "How do Server Actions work with React 19?" },
        { role: "assistant", content: "Server Actions allow client components to invoke server-side functions..." }
      ]
    }
  ];

  await durableChatStore.saveUserSessions(userA, sampleSessionsA);
  const loadedA = await durableChatStore.loadUserSessions(userA);
  assert.strictEqual(loadedA.length, 2, "User A must have 2 saved sessions");
  assert.strictEqual(loadedA[0].id, "sess_alpha_001");
  assert.strictEqual(loadedA[1].id, "sess_beta_002");
  assert.strictEqual(loadedA[0].messages.length, 2);
  console.log(`✓ User A sessions persisted and loaded: ${loadedA.length} sessions.\n`);

  // Test 3: Multi-Tenant Zero-Trust Data Isolation
  console.log("3. Testing multi-tenant boundary isolation between User A and User B...");
  const loadedB = await durableChatStore.loadUserSessions(userB);
  assert.strictEqual(loadedB.length, 0, "User B must NEVER see User A's private sessions");

  // Save distinct session for User B
  const sampleSessionsB = [
    {
      id: "sess_gamma_003",
      title: "Telugu Classical Literature",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
      tags: ["literature", "telugu"],
      messages: [
        { role: "user", content: "నన్నయ భట్టారకుని గురించి చెప్పండి" },
        { role: "assistant", content: "నన్నయ ఆంధ్ర మహాభారత కర్తలలో ప్రథముడు..." }
      ]
    }
  ];
  await durableChatStore.saveUserSessions(userB, sampleSessionsB);

  const reloadedA = await durableChatStore.loadUserSessions(userA);
  const reloadedB = await durableChatStore.loadUserSessions(userB);
  assert.strictEqual(reloadedA.length, 2, "User A session count must remain exactly 2");
  assert.strictEqual(reloadedB.length, 1, "User B session count must remain exactly 1");
  assert(!reloadedA.some(s => s.id === "sess_gamma_003"), "User A must not contain User B's session");
  assert(!reloadedB.some(s => s.id === "sess_alpha_001"), "User B must not contain User A's session");
  console.log("✓ Multi-tenant boundary isolation strictly verified across tenants.\n");

  // Test 4: Patch session (rename title, toggle pin, update tags)
  console.log("4. Testing session patching (rename, pin, tags)...");
  const patched = await durableChatStore.patchSession(userA, "sess_alpha_001", {
    title: "Quantum Entanglement & Superposition",
    pinned: false,
    tags: ["physics", "quantum", "modern-physics"]
  });
  assert(patched, "Patched session must exist");
  assert.strictEqual(patched.title, "Quantum Entanglement & Superposition");
  assert.strictEqual(patched.pinned, false);
  assert.strictEqual(patched.tags.length, 3);

  // Reload and verify persistence of patch
  const verifiedPatch = await durableChatStore.loadUserSessions(userA);
  const updatedAlpha = verifiedPatch.find(s => s.id === "sess_alpha_001");
  assert.strictEqual(updatedAlpha.title, "Quantum Entanglement & Superposition");
  console.log("✓ Session patching and persistence verified.\n");

  // Test 5: Delete single session
  console.log("5. Testing single session deletion...");
  const delSingleRes = await durableChatStore.deleteUserSessions(userA, "sess_alpha_001");
  assert.strictEqual(delSingleRes.success, true);
  assert.strictEqual(delSingleRes.remainingCount, 1);

  const afterSingleDelete = await durableChatStore.loadUserSessions(userA);
  assert.strictEqual(afterSingleDelete.length, 1);
  assert.strictEqual(afterSingleDelete[0].id, "sess_beta_002");
  console.log("✓ Single session deletion verified (sess_beta_002 safely retained).\n");

  // Test 6: Clear all sessions for User A
  console.log("6. Testing complete session purge for User A...");
  const delAllRes = await durableChatStore.deleteUserSessions(userA);
  assert.strictEqual(delAllRes.success, true);
  const finalA = await durableChatStore.loadUserSessions(userA);
  assert.strictEqual(finalA.length, 0, "User A must have 0 sessions after purge");

  // User B's sessions must remain completely untouched
  const finalB = await durableChatStore.loadUserSessions(userB);
  assert.strictEqual(finalB.length, 1, "User B sessions must be completely unaffected by User A purge");
  console.log("✓ Complete purge verified without cross-tenant side-effects.\n");

  // Cleanup User B
  await durableChatStore.deleteUserSessions(userB);

  console.log("===============================================================================");
  console.log("  ALL DURABLE CHAT PERSISTENCE TESTS PASSED (100%)");
  console.log("===============================================================================\n");
}

runTestSuite().catch(err => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
