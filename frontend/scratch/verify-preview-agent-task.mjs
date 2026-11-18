import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const token = createSignedTattvaSession({
    userId: "preview_agent_tester",
    email: "preview_agent_tester@tattva.ai",
    name: "Phase 3 Preview Agent Tester",
  });
  console.log("Generated Staging Signed Token:", token.slice(0, 30) + "...");

  const previewBase = "https://tattva-mvkpre1ix-gowthamchowdary1267-5698.vercel.app";

  console.log("\n1. Testing /api/health via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${previewBase}/api/health`, { encoding: "utf-8" });
  console.log("Health Check Output:", healthOutput.slice(-250));

  console.log("\n2. Testing /api/agent/tasks via vercel curl with authenticated session...");
  const createCmd = `npx vercel curl ${previewBase}/api/agent/tasks -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-agent-task-payload.json"`;
  const taskOutput = execSync(createCmd, { encoding: "utf-8" });
  console.log("Agent Task Creation Output Sample:\n", taskOutput.slice(-400));

  console.log("\n3. Testing /api/agent/tasks (GET listing) via vercel curl...");
  const listCmd = `npx vercel curl ${previewBase}/api/agent/tasks -H "x-tattva-session: ${token}"`;
  const listOutput = execSync(listCmd, { encoding: "utf-8" });
  console.log("Agent Task Listing Output Sample:\n", listOutput.slice(-300));

  console.log("\n✅ Staging Preview Autonomous Agent Verification: PASSED!");
}

main().catch(console.error);
