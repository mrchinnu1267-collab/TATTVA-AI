/**
 * TATTVA AI - Production Recovery Security & Privacy Test Suite (Phase 6)
 * Validates cross-tenant isolation, cryptographically signed sessions,
 * and zero-trust boundary verification across chats, memory, and experience engine.
 */

import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createSignedTattvaSession, verifySignedTattvaSession, verifyUserSession } from "../app/lib/security.ts";
import { experienceEngine } from "../app/lib/ai-orchestrator/experience-engine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${testName} - ${details}`);
  }
}

async function runSecurityTests() {
  console.log("\n========================================================");
  console.log("🔒 TATTVA AI - PRODUCTION RECOVERY SECURITY AUDIT SUITE");
  console.log("========================================================\n");

  // -------------------------------------------------------------------------
  // 1. Cryptographic HMAC-SHA256 Session Signing & Tamper Verification
  // -------------------------------------------------------------------------
  console.log("Section 1: HMAC Session Security & Tamper Rejection");
  const userAEmail = "alice.engineer@tattva-test.ai";
  const userBEmail = "bob.attacker@tattva-test.ai";

  const validTokenA = createSignedTattvaSession({ email: userAEmail });
  assert(typeof validTokenA === "string" && validTokenA.includes("."), "Session token generated with data.signature format");

  const verifiedA = verifySignedTattvaSession(validTokenA);
  assert(verifiedA && verifiedA.email === userAEmail, "Valid session token verifies correctly");

  // Tamper tests
  const tamperedSig = validTokenA.slice(0, -4) + "XXXX";
  assert(verifySignedTattvaSession(tamperedSig) === null, "Tampered signature is strictly rejected");

  const [dataPart, sigPart] = validTokenA.split(".");
  const decodedData = JSON.parse(Buffer.from(dataPart, "base64url").toString("utf8"));
  decodedData.email = userBEmail; // Attacker impersonating Alice
  const forgedDataPart = Buffer.from(JSON.stringify(decodedData)).toString("base64url");
  const forgedToken = `${forgedDataPart}.${sigPart}`;
  assert(verifySignedTattvaSession(forgedToken) === null, "Tampered payload with old signature is rejected (HMAC integrity)");

  // Expired token test
  const expiredToken = createSignedTattvaSession({ email: userAEmail, timestamp: Date.now() - 35 * 24 * 60 * 60 * 1000 });
  assert(verifySignedTattvaSession(expiredToken) === null, "Expired token (> 30 days) is rejected");

  // -------------------------------------------------------------------------
  // 2. /api/chats Route Privacy & Tenant Isolation
  // -------------------------------------------------------------------------
  console.log("\nSection 2: /api/chats Authorization & Isolation");
  const { GET: chatsGET, POST: chatsPOST, DELETE: chatsDELETE } = await import("../app/api/chats/route.ts");

  // A. Unauthenticated requests must be rejected (HTTP 401)
  const unauthGetReq = new Request("http://localhost:3000/api/chats", { method: "GET" });
  const unauthGetRes = await chatsGET(unauthGetReq);
  assert(unauthGetRes.status === 401, "Unauthenticated GET /api/chats returns 401");

  const unauthPostReq = new Request("http://localhost:3000/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessions: [{ id: "s1", title: "Test" }] }),
  });
  const unauthPostRes = await chatsPOST(unauthPostReq);
  assert(unauthPostRes.status === 401, "Unauthenticated POST /api/chats returns 401");

  const unauthDelReq = new Request("http://localhost:3000/api/chats", { method: "DELETE" });
  const unauthDelRes = await chatsDELETE(unauthDelReq);
  assert(unauthDelRes.status === 401, "Unauthenticated DELETE /api/chats returns 401");

  // B. Authenticated User A stores chats
  const cookieA = `tattva_session=${encodeURIComponent(validTokenA)}`;
  const postReqA = new Request("http://localhost:3000/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({
      sessions: [
        { id: "session_alice_1", title: "Confidential Project Alpha Architecture", messages: [] },
      ],
    }),
  });
  const postResA = await chatsPOST(postReqA);
  assert(postResA.status === 200, "Authenticated User A successfully syncs chat sessions (200)");

  // C. Authenticated User A reads their chats
  const getReqA = new Request("http://localhost:3000/api/chats", {
    method: "GET",
    headers: { Cookie: cookieA },
  });
  const getResA = await chatsGET(getReqA);
  const dataA = await getResA.json();
  assert(
    getResA.status === 200 && dataA.sessions?.some((s) => s.id === "session_alice_1"),
    "Authenticated User A reads their private chat sessions"
  );

  // D. Attacker User B queries with ?email=alice.engineer@tattva-test.ai -> Must return 403 Forbidden!
  const validTokenB = createSignedTattvaSession({ email: userBEmail });
  const cookieB = `tattva_session=${encodeURIComponent(validTokenB)}`;

  const spoofedGetReq = new Request(`http://localhost:3000/api/chats?email=${encodeURIComponent(userAEmail)}`, {
    method: "GET",
    headers: { Cookie: cookieB },
  });
  const spoofedGetRes = await chatsGET(spoofedGetReq);
  assert(spoofedGetRes.status === 403, "User B attempting to query User A's chats with ?email= receives 403 Forbidden");

  // E. Attacker User B attempts to overwrite User A's chats -> Must return 403 Forbidden!
  const spoofedPostReq = new Request("http://localhost:3000/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieB },
    body: JSON.stringify({
      email: userAEmail,
      sessions: [{ id: "session_malicious", title: "Overwritten by Attacker" }],
    }),
  });
  const spoofedPostRes = await chatsPOST(spoofedPostReq);
  assert(spoofedPostRes.status === 403, "User B attempting to overwrite User A's chats receives 403 Forbidden");

  // F. User B queries their own chats -> Gets empty array, zero leakage of User A's data
  const getReqB = new Request("http://localhost:3000/api/chats", {
    method: "GET",
    headers: { Cookie: cookieB },
  });
  const getResB = await chatsGET(getReqB);
  const dataB = await getResB.json();
  assert(
    getResB.status === 200 && Array.isArray(dataB.sessions) && !dataB.sessions.some((s) => s.id === "session_alice_1"),
    "User B's chats return empty/isolated list without cross-tenant leakage of User A"
  );

  // -------------------------------------------------------------------------
  // 3. /api/memory Zero-Trust Authorization & Tenant Isolation
  // -------------------------------------------------------------------------
  console.log("\nSection 3: /api/memory Authorization & Tenant Isolation");
  const { GET: memoryGET, POST: memoryPOST } = await import("../app/api/memory/route.ts");

  const unauthMemReq = new Request("http://localhost:3000/api/memory", { method: "GET" });
  const unauthMemRes = await memoryGET(unauthMemReq);
  assert(unauthMemRes.status === 401, "Unauthenticated GET /api/memory returns 401");

  const authMemPostReq = new Request("http://localhost:3000/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({
      content: "Alice prefers Rust and Next.js 15 for distributed cloud engines",
      category: "preference",
      importance: 9,
    }),
  });
  const authMemPostRes = await memoryPOST(authMemPostReq);
  assert(authMemPostRes.status === 200, "Authenticated User A saves memory (200)");

  // User B queries memories -> cannot see User A's memories
  const authMemGetReqB = new Request("http://localhost:3000/api/memory", {
    method: "GET",
    headers: { Cookie: cookieB },
  });
  const authMemGetResB = await memoryGET(authMemGetReqB);
  const memDataB = await authMemGetResB.json();
  const hasAliceMemory = memDataB.memories?.some((m) => m.content.includes("Alice prefers Rust"));
  assert(!hasAliceMemory, "User B cannot see or query User A's private memories");

  // -------------------------------------------------------------------------
  // 4. ExperienceEngine Multi-Tenant Cross-Contamination Prevention
  // -------------------------------------------------------------------------
  console.log("\nSection 4: ExperienceEngine Multi-Tenant Isolation");
  // User A records proprietary verified solution
  await experienceEngine.recordExperience({
    userId: userAEmail,
    workspaceId: "workspace_alice",
    taskType: "coding",
    problemStatement: "Proprietary Trade Secret Financial Optimization Algorithm",
    attemptedSolution: "def optimize_portfolio_secret(): return 0.999",
    passedVerification: true,
  });

  // User B queries similar experiences
  const retrievedForB = await experienceEngine.retrieveRelevantExperiences(
    "Proprietary Trade Secret Financial Optimization Algorithm",
    "coding",
    5,
    { userId: userBEmail, workspaceId: "workspace_bob" }
  );
  assert(
    !retrievedForB.some((r) => r.attemptedSolution.includes("optimize_portfolio_secret")),
    "User B's experience retrieval strictly excludes User A's private verified experiences"
  );

  // User A queries similar experiences -> gets their verified experience
  const retrievedForA = await experienceEngine.retrieveRelevantExperiences(
    "Proprietary Trade Secret Financial Optimization Algorithm",
    "coding",
    5,
    { userId: userAEmail, workspaceId: "workspace_alice" }
  );
  assert(
    retrievedForA.some((r) => r.attemptedSolution.includes("optimize_portfolio_secret")),
    "User A successfully retrieves their own verified experience"
  );

  // -------------------------------------------------------------------------
  // 5. Cleanup Test Artifacts
  // -------------------------------------------------------------------------
  const cleanDelReq = new Request("http://localhost:3000/api/chats", {
    method: "DELETE",
    headers: { Cookie: cookieA },
  });
  await chatsDELETE(cleanDelReq);

  console.log("\n========================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
