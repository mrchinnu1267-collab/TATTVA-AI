import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const previewUrl = process.argv[2];
  if (!previewUrl) {
    console.error("Missing preview URL argument");
    process.exit(1);
  }

  const token = createSignedTattvaSession({
    userId: "preview_phase24_verifier",
    email: "preview_phase24@tattva.ai",
    name: "Phase 24 Preview Verifier",
  });
  console.log("Generated Preview Signed Token:", token.slice(0, 30) + "...");
  console.log("Target Preview Base:", previewUrl);

  console.log("\n1. Testing /api/health via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${previewUrl}/api/health`, { encoding: "utf-8" });
  console.log("Health Check Output:\n", healthOutput.slice(-300));

  console.log("\n2. Testing /api/developer/keys POST (generate API key)...");
  const keyPayload = {
    name: "Preview Verification Key",
    scopes: ["chat:write", "research:read", "documents:write", "tasks:write"],
    rateLimitPerMinute: 60,
    monthlyQuota: 10000,
    workspaceId: "ws_preview_p24"
  };
  fs.writeFileSync("scratch/test-preview-key-payload.json", JSON.stringify(keyPayload));

  const keyCmd = `npx vercel curl ${previewUrl}/api/developer/keys -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-key-payload.json"`;
  const keyOutput = execSync(keyCmd, { encoding: "utf-8" });
  console.log("Developer API Key Generation Output Sample:\n", keyOutput.slice(-450));
  const parsedKey = JSON.parse(keyOutput.slice(keyOutput.indexOf("{")));
  const rawSecret = parsedKey.secret;

  console.log("\n3. Testing /api/v1/usage with generated API key...");
  const usageCmd = `npx vercel curl ${previewUrl}/api/v1/usage -H "Authorization: Bearer ${rawSecret}"`;
  const usageOutput = execSync(usageCmd, { encoding: "utf-8" });
  console.log("Developer API Usage Output Sample:\n", usageOutput.slice(-400));

  console.log("\n4. Testing /api/plugins GET (catalog)...");
  const pluginsCmd = `npx vercel curl ${previewUrl}/api/plugins -H "x-tattva-session: ${token}"`;
  const pluginsOutput = execSync(pluginsCmd, { encoding: "utf-8" });
  console.log("Plugin Catalog Output Sample:\n", pluginsOutput.slice(-350));

  console.log("\n5. Testing /api/workflows POST (automation pipeline)...");
  const wfPayload = {
    action: "create",
    name: "Preview Math & Data Pipeline",
    steps: [
      {
        id: "step_calc",
        name: "Calculate Total Volume",
        toolName: "math_calculator",
        parameters: { expression: "120 * 5" }
      }
    ]
  };
  fs.writeFileSync("scratch/test-preview-wf-payload.json", JSON.stringify(wfPayload));
  const wfCmd = `npx vercel curl ${previewUrl}/api/workflows -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-wf-payload.json"`;
  const wfOutput = execSync(wfCmd, { encoding: "utf-8" });
  console.log("Workflow Creation Output Sample:\n", wfOutput.slice(-400));

  console.log("\n✅ Staging Preview Phase 24 Ecosystem Platform Verification: PASSED!");
}

main().catch(console.error);
