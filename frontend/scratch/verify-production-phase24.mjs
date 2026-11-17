import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const prodUrl = process.argv[2] || "https://tattva-ai-phi.vercel.app";
  console.log("Target Production Base:", prodUrl);

  const token = createSignedTattvaSession({
    userId: "prod_phase24_verifier",
    email: "prod_phase24@tattva.ai",
    name: "Phase 24 Production Verifier",
  });
  console.log("Generated Production Signed Token:", token.slice(0, 30) + "...");

  console.log("\n1. Testing /api/health via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${prodUrl}/api/health`, { encoding: "utf-8" });
  console.log("Health Check Output:\n", healthOutput.slice(-300));
  if (!healthOutput.includes('"status":"healthy"') && !healthOutput.includes("healthy")) {
    throw new Error("Production health check failed!");
  }

  console.log("\n2. Testing /api/developer/keys POST (generate API key)...");
  const keyPayload = {
    name: "Production Verification Key",
    scopes: ["chat:write", "research:read", "documents:write", "tasks:write"],
    rateLimitPerMinute: 60,
    monthlyQuota: 10000,
    workspaceId: "ws_prod_p24"
  };
  fs.writeFileSync("scratch/test-prod-key-payload.json", JSON.stringify(keyPayload));

  const keyCmd = `npx vercel curl ${prodUrl}/api/developer/keys -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-key-payload.json"`;
  const keyOutput = execSync(keyCmd, { encoding: "utf-8" });
  console.log("Developer API Key Generation Output Sample:\n", keyOutput.slice(-450));
  const parsedKey = JSON.parse(keyOutput.slice(keyOutput.indexOf("{")));
  const rawSecret = parsedKey.secret;
  if (!rawSecret || !rawSecret.startsWith("tattva_live_")) {
    throw new Error("Failed to generate raw secret key: " + keyOutput);
  }
  console.log("Generated Production Live Secret Key:", rawSecret.slice(0, 20) + "...");

  console.log("\n3. Testing /api/v1/usage with generated API key...");
  const usageCmd = `npx vercel curl ${prodUrl}/api/v1/usage -H "Authorization: Bearer ${rawSecret}"`;
  const usageOutput = execSync(usageCmd, { encoding: "utf-8" });
  console.log("Developer API Usage Output Sample:\n", usageOutput.slice(-400));
  if (!usageOutput.includes('"success":true') || !usageOutput.includes('"remainingRequests":')) {
    throw new Error("Developer API usage inspection failed: " + usageOutput);
  }

  console.log("\n4. Testing /api/plugins GET (catalog)...");
  const pluginsCmd = `npx vercel curl ${prodUrl}/api/plugins -H "x-tattva-session: ${token}"`;
  const pluginsOutput = execSync(pluginsCmd, { encoding: "utf-8" });
  console.log("Plugin Catalog Output Sample:\n", pluginsOutput.slice(-300));
  if (!pluginsOutput.includes('"plugins":') || !pluginsOutput.includes("github-code-bridge")) {
    throw new Error("Plugin catalog retrieval failed: " + pluginsOutput);
  }

  console.log("\n5. Testing /api/workflows POST (automation pipeline)...");
  const wfPayload = {
    name: "Production Math & Data Pipeline",
    trigger: { type: "manual" },
    steps: [
      { id: "step_calc", name: "Calculate Total Volume", toolName: "math_calculator", parameters: { expression: "250 * 4" } }
    ]
  };
  fs.writeFileSync("scratch/test-prod-wf-payload.json", JSON.stringify(wfPayload));

  const wfCmd = `npx vercel curl ${prodUrl}/api/workflows -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-wf-payload.json"`;
  const wfOutput = execSync(wfCmd, { encoding: "utf-8" });
  console.log("Workflow Creation Output Sample:\n", wfOutput.slice(-350));
  if (!wfOutput.includes('"success":true') || !wfOutput.includes("Production Math & Data Pipeline")) {
    throw new Error("Workflow pipeline creation failed: " + wfOutput);
  }

  console.log("\n6. Testing /api/v1/chat with Developer API Key...");
  const chatPayload = {
    messages: [
      { role: "user", content: "State 'Phase 24 Ecosystem Live Verification' in 6 words or less." }
    ],
    temperature: 0.1
  };
  fs.writeFileSync("scratch/test-prod-chat-v1-payload.json", JSON.stringify(chatPayload));

  const chatCmd = `npx vercel curl ${prodUrl}/api/v1/chat -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${rawSecret}" --data-binary "@scratch/test-prod-chat-v1-payload.json"`;
  const chatOutput = execSync(chatCmd, { encoding: "utf-8" });
  console.log("Developer Chat API Output Sample:\n", chatOutput.slice(-350));
  if (!chatOutput.includes('"success":true') || !chatOutput.includes("reply")) {
    throw new Error("Developer chat API failed: " + chatOutput);
  }

  console.log("\n==========================================================");
  console.log("✅ ALL LIVE PRODUCTION VERIFICATIONS FOR PHASE 24 PASSED! ✅");
  console.log("==========================================================");
}

main().catch(err => {
  console.error("\n❌ Production Verification Error:", err.message);
  process.exit(1);
});
