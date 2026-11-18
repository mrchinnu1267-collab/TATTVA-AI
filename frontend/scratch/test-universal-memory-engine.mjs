/**
 * Automated Unit & Integration Test Suite for Universal Multi-Tenant Memory Engine
 * Tests tenant vault isolation, 5-category taxonomy, TTL expiration, export, and CRUD.
 */

import assert from "node:assert";
import {
  getUserMemories,
  saveMemory,
  updateMemory,
  correctMemory,
  deleteMemory,
  clearCategoryMemories,
  clearAllMemories,
  exportUserMemories,
  getUserPersonalizationSettings,
  updatePersonalizationSettings,
  retrieveRelevantMemories,
  buildPersonalizationSystemPrompt,
} from "../app/lib/memory-service.ts";

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("  TATTVA AI — UNIVERSAL MULTI-TENANT MEMORY ENGINE TEST SUITE");
  console.log("===============================================================================\n");

  const userA = "tenant_alice_memory_test@tattva.ai";
  const userB = "tenant_bob_memory_test@tattva.ai";

  // 1. Initial cleanup
  console.log("1. Initializing clean test state...");
  await clearAllMemories(userA);
  await clearAllMemories(userB);

  const initialA = await getUserMemories(userA);
  const initialB = await getUserMemories(userB);
  assert.strictEqual(initialA.length, 0, "User A initial memories must be empty");
  assert.strictEqual(initialB.length, 0, "User B initial memories must be empty");
  console.log("✓ Initial clean state verified.\n");

  // 2. Multi-Tenant Cryptographic Isolation
  console.log("2. Testing Multi-Tenant Cryptographic Isolation...");
  const memA1 = await saveMemory(
    userA,
    "Alice prefers Next.js 16 with TypeScript and Tailwind CSS v4",
    "preference",
    9
  );
  const memA2 = await saveMemory(
    userA,
    "Alice is building a medical telemetry real-time platform",
    "project",
    8
  );

  const memB1 = await saveMemory(
    userB,
    "Bob uses Rust and WebAssembly for high-throughput packet inspection",
    "technical_level",
    10
  );

  const listA = await getUserMemories(userA);
  const listB = await getUserMemories(userB);

  assert.strictEqual(listA.length, 2, "User A must have exactly 2 memories");
  assert.strictEqual(listB.length, 1, "User B must have exactly 1 memory");
  assert.ok(listA.every((m) => m.userEmail === userA), "All User A memories must belong to User A");
  assert.ok(listB.every((m) => m.userEmail === userB), "All User B memories must belong to User B");
  assert.ok(!listA.some((m) => m.content.includes("Rust")), "User A must never see User B's memories");
  assert.ok(!listB.some((m) => m.content.includes("Next.js")), "User B must never see User A's memories");
  console.log("✓ Multi-tenant boundary verified: zero cross-tenant leakage.\n");

  // 3. 5-Category Taxonomy & Ephemeral TTL Expiration
  console.log("3. Testing 5-Category Taxonomy and Automated TTL Expiration...");
  // Save an expired short-term memory (expired 1 hour ago)
  const pastEpoch = Date.now() - 3600 * 1000;
  await saveMemory(
    userA,
    "Short-term context: debugging memory leak in WebSocket connection",
    "short_term",
    6,
    "explicit",
    undefined,
    true,
    1.0,
    pastEpoch
  );

  // Save a valid long-term memory
  await saveMemory(
    userA,
    "Long-term fact: Alice holds a Master's degree in Computer Science",
    "long_term",
    10
  );

  // Retrieve memories — the expired memory must be pruned automatically
  const afterTTL = await getUserMemories(userA);
  assert.strictEqual(afterTTL.length, 3, "Expired short-term memory must be pruned, leaving 3 items");
  assert.ok(
    afterTTL.some((m) => m.category === "long_term"),
    "Long-term memory must be retained"
  );
  assert.ok(
    !afterTTL.some((m) => m.content.includes("debugging memory leak")),
    "Expired memory must be pruned"
  );
  console.log("✓ Automated TTL pruning verified.\n");

  // 4. Update and Correct Memory
  console.log("4. Testing Memory Correction and In-Place Updates...");
  const corrected = await correctMemory(
    userA,
    memA1.id,
    "Alice prefers Next.js 16 App Router with Turbopack and strict TypeScript"
  );
  assert.ok(corrected, "Corrected memory must return updated item");
  assert.strictEqual(corrected.isConfirmed, true, "Corrected memory must be confirmed");
  assert.ok(corrected.content.includes("Turbopack"), "Content must reflect correction");

  const updated = await updateMemory(userA, memA2.id, { importance: 10 });
  assert.ok(updated, "Updated memory must return item");
  assert.strictEqual(updated.importance, 10, "Importance must be updated to 10");
  console.log("✓ Memory correction & updates verified.\n");

  // 5. Semantic Relevance Retrieval
  console.log("5. Testing Semantic and Keyword Relevance Retrieval...");
  const relevantNext = await retrieveRelevantMemories(userA, "What framework and build tool does Alice like?", 3);
  assert.ok(relevantNext.length > 0, "Should retrieve relevant memories");
  console.log("Retrieved relevant memories:", relevantNext.map((m) => m.content));
  assert.ok(
    relevantNext.some((m) => m.content.includes("Next.js") || m.content.includes("Turbopack")),
    "Top results must contain relevant memory"
  );
  console.log(`✓ Relevant memory retrieved: "${relevantNext[0].content}" (relevance validated).\n`);

  // 6. Category-Specific Deletion
  console.log("6. Testing Category-Specific Deletion (?category=project)...");
  await clearCategoryMemories(userA, "project");
  const postCategoryDelete = await getUserMemories(userA);
  assert.ok(
    !postCategoryDelete.some((m) => m.category === "project"),
    "Project category memories must be deleted"
  );
  assert.ok(
    postCategoryDelete.some((m) => m.category === "preference"),
    "Preference memories must remain intact"
  );
  console.log("✓ Category-specific deletion verified without affecting other categories.\n");

  // 7. System Prompt Personalization Injection
  console.log("7. Testing Personalization System Prompt Generation...");
  const settings = await getUserPersonalizationSettings(userA);
  const promptInjection = buildPersonalizationSystemPrompt(settings, postCategoryDelete);
  assert.ok(promptInjection.includes("TATTVA AI PERSONALIZATION"), "Must include header");
  assert.ok(promptInjection.includes("Turbopack"), "Must inject confirmed user facts");
  console.log("✓ Personalization system prompt injection verified.\n");

  // 8. Memory Export (JSON & Markdown)
  console.log("8. Testing Cognitive Memory Export (JSON & Markdown)...");
  const jsonExport = await exportUserMemories(userA, "json");
  const parsedJson = JSON.parse(jsonExport);
  assert.strictEqual(parsedJson.userEmail, userA);
  assert.ok(Array.isArray(parsedJson.memories));

  const mdExport = await exportUserMemories(userA, "markdown");
  assert.ok(mdExport.includes("# TATTVA AI — Cognitive Memory Profile Export"));
  assert.ok(mdExport.includes(userA));
  console.log("✓ JSON and Markdown export formats verified.\n");

  // 9. Complete Purge
  console.log("9. Testing Complete Memory Purge...");
  await clearAllMemories(userA);
  const finalA = await getUserMemories(userA);
  const finalB = await getUserMemories(userB);
  assert.strictEqual(finalA.length, 0, "User A memories must be completely purged");
  assert.strictEqual(finalB.length, 1, "User B memories must remain untouched");

  // Clean up User B
  await clearAllMemories(userB);
  console.log("✓ Complete purge verified with zero cross-tenant side-effects.\n");

  console.log("===============================================================================");
  console.log("  ALL 9 / 9 UNIVERSAL MEMORY ENGINE TESTS PASSED (100%)");
  console.log("===============================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
