/**
 * TASK 2 — VERIFY CHAT PRIVACY
 * Strict multi-tenant isolation testing between User A (Alice) and User B (Bob)
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { GET, POST, DELETE } = jiti("../app/api/chats/route.ts");
const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${testName} ${details ? `(${details})` : ""}`);
  } else {
    failed++;
    console.error(`  \x1b[31m✖ FAIL\x1b[0m ${testName} - ${details}`);
  }
}

async function runChatPrivacyTests() {
  console.log("\n================================================================================");
  console.log("🔒 TASK 2 — MULTI-TENANT CHAT PRIVACY & OWNERSHIP VERIFICATION");
  console.log("================================================================================\n");

  const userA = { email: "alice@tattva.ai", name: "Alice Security" };
  const userB = { email: "bob@tattva.ai", name: "Bob Attacker" };

  const tokenA = createSignedTattvaSession(userA);
  const tokenB = createSignedTattvaSession(userB);

  const cookieHeaderA = `tattva_session=${encodeURIComponent(tokenA)}`;
  const cookieHeaderB = `tattva_session=${encodeURIComponent(tokenB)}`;

  const aliceSessionId = `session_alice_${Date.now()}`;
  const aliceConversation = [
    {
      id: aliceSessionId,
      title: "Alice Confidential Strategy",
      messages: [
        { role: "user", content: "What is our secret project launch budget?" },
        { role: "assistant", content: "The confidential budget is $500,000 for Q1." },
      ],
      updatedAt: new Date().toISOString(),
    },
  ];

  // 1. User A creates a conversation
  console.log("[1] User A creates conversation...");
  const createReqA = new Request("http://localhost:3000/api/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeaderA,
    },
    body: JSON.stringify({ sessions: aliceConversation }),
  });
  const createResA = await POST(createReqA);
  const createDataA = await createResA.json();
  assert(createResA.status === 200 && createDataA.success === true, "User A creates conversation", `HTTP ${createResA.status}`);

  // 2. User A reads back her conversation
  console.log("[2] User A reads own conversation...");
  const readReqA = new Request("http://localhost:3000/api/chats", {
    method: "GET",
    headers: { cookie: cookieHeaderA },
  });
  const readResA = await GET(readReqA);
  const readDataA = await readResA.json();
  const aliceHasRecord = readDataA.sessions?.some((s) => s.id === aliceSessionId);
  assert(readResA.status === 200 && aliceHasRecord, "User A accesses her own conversation", `Sessions count: ${readDataA.sessions?.length}`);

  // 3. User B attempts to read User A's conversation via spoofed query parameter
  console.log("[3] User B attempts to read User A's conversation (GET ?email=alice@tattva.ai)...");
  const readReqB = new Request("http://localhost:3000/api/chats?email=alice@tattva.ai", {
    method: "GET",
    headers: { cookie: cookieHeaderB },
  });
  const readResB = await GET(readReqB);
  const readDataB = await readResB.json();
  assert(readResB.status === 403, "User B blocked from reading User A's conversation (HTTP 403)", readDataB.error);

  // 4. User B attempts to read standard chats (should return empty or only Bob's chats)
  console.log("[4] User B reads own chats...");
  const readOwnReqB = new Request("http://localhost:3000/api/chats", {
    method: "GET",
    headers: { cookie: cookieHeaderB },
  });
  const readOwnResB = await GET(readOwnReqB);
  const readOwnDataB = await readOwnResB.json();
  const leakedToBob = readOwnDataDataHasAlice(readOwnDataB.sessions, aliceSessionId);
  assert(readOwnResB.status === 200 && !leakedToBob, "User B cannot see User A's conversations in own listing", `Bob sees ${readOwnDataB.sessions?.length} sessions`);

  // 5. User B attempts to modify / overwrite User A's conversation
  console.log("[5] User B attempts to overwrite User A's conversation (POST with body.email=alice@tattva.ai)...");
  const overwriteReqB = new Request("http://localhost:3000/api/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeaderB,
    },
    body: JSON.stringify({
      email: "alice@tattva.ai",
      sessions: [
        {
          id: aliceSessionId,
          title: "HACKED BY BOB",
          messages: [{ role: "user", content: "You have been compromised" }],
        },
      ],
    }),
  });
  const overwriteResB = await POST(overwriteReqB);
  const overwriteDataB = await overwriteResB.json();
  assert(overwriteResB.status === 403, "User B blocked from overwriting User A's conversation (HTTP 403)", overwriteDataB.error);

  // 6. User B attempts to delete User A's conversation
  console.log("[6] User B attempts to delete User A's conversation...");
  const deleteReqB = new Request(`http://localhost:3000/api/chats?sessionId=${aliceSessionId}`, {
    method: "DELETE",
    headers: { cookie: cookieHeaderB },
  });
  const deleteResB = await DELETE(deleteReqB);
  assert(deleteResB.status === 200, "User B delete handler completes for own store only");

  // Verify Alice's conversation is still intact
  const verifyAliceReq = new Request("http://localhost:3000/api/chats", {
    method: "GET",
    headers: { cookie: cookieHeaderA },
  });
  const verifyAliceRes = await GET(verifyAliceReq);
  const verifyAliceData = await verifyAliceRes.json();
  const aliceStillIntact = verifyAliceData.sessions?.some((s) => s.id === aliceSessionId && s.title === "Alice Confidential Strategy");
  assert(aliceStillIntact, "User A's conversation remains completely intact and uncorrupted after User B attacks");

  // 7. Unauthenticated user attempts
  console.log("[7] Unauthenticated attacker tests...");
  const unauthGet = await GET(new Request("http://localhost:3000/api/chats?email=alice@tattva.ai"));
  assert(unauthGet.status === 401, "Unauthenticated GET rejected with HTTP 401");

  const unauthPost = await POST(new Request("http://localhost:3000/api/chats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessions: [] }),
  }));
  assert(unauthPost.status === 401, "Unauthenticated POST rejected with HTTP 401");

  const unauthDel = await DELETE(new Request("http://localhost:3000/api/chats"));
  assert(unauthDel.status === 401, "Unauthenticated DELETE rejected with HTTP 401");

  // Clean up Alice's test session
  const cleanReqA = new Request(`http://localhost:3000/api/chats?sessionId=${aliceSessionId}`, {
    method: "DELETE",
    headers: { cookie: cookieHeaderA },
  });
  await DELETE(cleanReqA);

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`TASK 2 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("--------------------------------------------------------------------------------\n");

  if (failed > 0) process.exit(1);
}

function readOwnDataDataHasAlice(sessions, aliceSessionId) {
  if (!Array.isArray(sessions)) return false;
  return sessions.some((s) => s.id === aliceSessionId);
}

runChatPrivacyTests().catch((err) => {
  console.error("FATAL ERROR IN PRIVACY TEST:", err);
  process.exit(1);
});
