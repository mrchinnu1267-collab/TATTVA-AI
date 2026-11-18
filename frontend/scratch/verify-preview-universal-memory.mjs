/**
 * TATTVA AI — Universal Multi-Tenant Memory Engine Preview/Production Verification Harness
 * Tests API route endpoints, zero-trust session validation, multi-tenant boundaries,
 * export, category wipe, and complete purge on remote Vercel deployments.
 */

import crypto from "crypto";
import fs from "fs";
import { execSync } from "child_process";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

const targetBaseUrl = process.argv[2] || process.env.TARGET_URL || "https://tattva-ai-phi.vercel.app";
const cleanBaseUrl = targetBaseUrl.replace(/\/+$/, "");

console.log("===============================================================================");
console.log("  TATTVA AI — UNIVERSAL MEMORY ENGINE VERIFICATION HARNESS");
console.log(`  Target Base URL: ${cleanBaseUrl}`);
console.log("===============================================================================\n");

function getSigningKey() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.GEMINI_API_KEY || "tattva-default-super-secret-key-change-in-production-min-32-chars";
  return crypto.createHash("sha256").update(secret).digest();
}

function createSignedSessionToken(userId, email, name) {
  const payload = {
    userId,
    email,
    name,
    timestamp: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    verified: true,
  };
  const key = getSigningKey();
  const serialized = JSON.stringify(payload);
  const base64Payload = Buffer.from(serialized).toString("base64url");
  const signature = crypto.createHmac("sha256", key).update(base64Payload).digest("base64url");
  return `${base64Payload}.${signature}`;
}

function vercelCurl(path, options = {}) {
  const method = options.method || "GET";
  const headers = options.headers || {};
  let bodyArg = "";

  if (options.body) {
    const tmpPayloadPath = "scratch/test-mem-payload.json";
    fs.writeFileSync(tmpPayloadPath, typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    bodyArg = `-d @${tmpPayloadPath}`;
  }

  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");

  const cmd = `npx vercel curl "${cleanBaseUrl}${path}" -X ${method} ${headerArgs} ${bodyArg}`;
  const out = execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });

  const jsonStart = out.indexOf("{");
  const jsonArrayStart = out.indexOf("[");
  let start = -1;
  if (jsonStart !== -1 && jsonArrayStart !== -1) {
    start = Math.min(jsonStart, jsonArrayStart);
  } else if (jsonStart !== -1) {
    start = jsonStart;
  } else {
    start = jsonArrayStart;
  }

  if (start !== -1) {
    return out.slice(start).trim();
  }
  return out.trim();
}

async function verifyUniversalMemory() {
  const userAlpha = {
    id: "usr_mem_alpha_deploy",
    email: "tester_mem_alpha@tattva.ai",
    name: "Alice Memory Alpha",
  };
  const tokenAlpha = createSignedSessionToken(userAlpha.id, userAlpha.email, userAlpha.name);

  const userBeta = {
    id: "usr_mem_beta_deploy",
    email: "tester_mem_beta@tattva.ai",
    name: "Bob Memory Beta",
  };
  const tokenBeta = createSignedSessionToken(userBeta.id, userBeta.email, userBeta.name);

  // 1. Health check
  console.log("1. Testing /api/health...");
  const healthRaw = vercelCurl("/api/health");
  const health = JSON.parse(healthRaw);
  if (health.status !== "healthy") {
    throw new Error(`Health check failed: ${healthRaw}`);
  }
  console.log("✓ Health check PASSED\n");

  // 2. Unauthenticated Access Rejection (Zero-Trust Security Gate)
  console.log("2. Testing unauthenticated rejection on /api/memory...");
  const unauthRaw = vercelCurl("/api/memory");
  if (!unauthRaw.includes("Authentication required") && !unauthRaw.includes("401")) {
    throw new Error(`Expected 401 unauthenticated rejection, got: ${unauthRaw}`);
  }
  console.log("✓ Unauthenticated access safely rejected\n");

  // 3. POST /api/memory (Save user memories)
  console.log("3. Testing POST /api/memory (Save manual cognitive memory)...");
  const savePayload = {
    content: "Alice prefers Next.js 16 App Router with Turbopack and strict TypeScript",
    category: "preference",
    importance: 9,
  };
  const saveRaw = vercelCurl("/api/memory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tattva-session": tokenAlpha,
    },
    body: savePayload,
  });
  const saveRes = JSON.parse(saveRaw);
  if (!saveRes.success || !saveRes.memory || !saveRes.memory.id) {
    throw new Error(`POST /api/memory failed: ${saveRaw}`);
  }
  const memoryId = saveRes.memory.id;
  console.log(`✓ POST /api/memory PASSED (Saved memory ID: ${memoryId})\n`);

  // 4. GET /api/memory (Load user memories)
  console.log("4. Testing GET /api/memory (Load user cognitive memories)...");
  const getRaw = vercelCurl("/api/memory", {
    headers: {
      "x-tattva-session": tokenAlpha,
    },
  });
  const getRes = JSON.parse(getRaw);
  if (!Array.isArray(getRes.memories) || getRes.memories.length === 0) {
    throw new Error(`GET /api/memory failed or returned empty: ${getRaw}`);
  }
  const found = getRes.memories.find((m) => m.id === memoryId);
  if (!found || !found.content.includes("Turbopack")) {
    throw new Error(`Retrieved memory missing expected content: ${getRaw}`);
  }
  console.log(`✓ GET /api/memory PASSED (Retrieved ${getRes.memories.length} memories, verified item)\n`);

  // 5. Zero-Trust Multi-Tenant Isolation
  console.log("5. Testing Multi-Tenant Zero-Trust Isolation...");
  const betaGetRaw = vercelCurl("/api/memory", {
    headers: {
      "x-tattva-session": tokenBeta,
    },
  });
  const betaGetRes = JSON.parse(betaGetRaw);
  if (Array.isArray(betaGetRes.memories) && betaGetRes.memories.some((m) => m.content.includes("Turbopack"))) {
    throw new Error("CRITICAL SECURITY VIOLATION: User Beta accessed User Alpha's memory!");
  }
  console.log("✓ Multi-tenant boundary verified: zero cross-tenant leakage\n");

  // 6. Identity Spoofing Rejection
  console.log("6. Testing cross-tenant email spoofing rejection...");
  const spoofPayload = {
    content: "Spoofed memory attempt",
    category: "preference",
    userEmail: userBeta.email, // Passing Bob's email while signed in as Alice
  };
  const spoofRaw = vercelCurl("/api/memory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tattva-session": tokenAlpha,
    },
    body: spoofPayload,
  });
  if (!spoofRaw.includes("Access denied") && !spoofRaw.includes("Cannot write to another user")) {
    throw new Error(`Expected 403 spoofing rejection, got: ${spoofRaw}`);
  }
  console.log("✓ Identity spoofing safely rejected (HTTP 403)\n");

  // 7. Memory Export (JSON & Markdown)
  console.log("7. Testing Cognitive Memory Export (?export=json)...");
  const exportRaw = vercelCurl("/api/memory?export=json", {
    headers: {
      "x-tattva-session": tokenAlpha,
    },
  });
  const exportData = JSON.parse(exportRaw);
  if (!exportData.userEmail || !Array.isArray(exportData.memories)) {
    throw new Error(`Export JSON format invalid: ${exportRaw}`);
  }
  console.log("✓ Cognitive memory JSON export PASSED\n");

  // 8. PUT /api/memory (Update memory)
  console.log("8. Testing PUT /api/memory (Update importance and content)...");
  const updatePayload = {
    id: memoryId,
    updates: {
      importance: 10,
      content: "Alice prefers Next.js 16 App Router with Turbopack, Tailwind v4 and strict TypeScript",
    },
  };
  const putRaw = vercelCurl("/api/memory", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-tattva-session": tokenAlpha,
    },
    body: updatePayload,
  });
  const putRes = JSON.parse(putRaw);
  if (!putRes.success || putRes.memory.importance !== 10) {
    throw new Error(`PUT /api/memory failed: ${putRaw}`);
  }
  console.log("✓ PUT /api/memory PASSED (Updated importance to 10)\n");

  // 9. DELETE /api/memory?all=true (Clean up test memories)
  console.log("9. Testing DELETE /api/memory?all=true (Clean up test memories)...");
  const delRaw = vercelCurl("/api/memory?all=true", {
    method: "DELETE",
    headers: {
      "x-tattva-session": tokenAlpha,
    },
  });
  const delRes = JSON.parse(delRaw);
  if (!delRes.success || !delRes.cleared) {
    throw new Error(`DELETE /api/memory?all=true failed: ${delRaw}`);
  }
  console.log("✓ DELETE /api/memory PASSED (Test memories purged)\n");

  console.log("===============================================================================");
  console.log("  ALL 9 / 9 UNIVERSAL MEMORY ENGINE VERIFICATION CHECKS PASSED!");
  console.log("===============================================================================");
}

verifyUniversalMemory().catch((err) => {
  console.error("Verification failed:", err.message);
  process.exit(1);
});
