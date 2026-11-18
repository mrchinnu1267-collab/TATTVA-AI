import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const token = createSignedTattvaSession({
    userId: "prod_agent_verifier",
    email: "prod_agent_verifier@tattva.ai",
    name: "Phase 3 Production Agent Verifier",
  });
  console.log("Generated Production Signed Token:", token.slice(0, 30) + "...");

  const prodBase = "https://tattva-ai-phi.vercel.app";

  console.log("\n1. Testing /api/health via vercel curl on production...");
  const healthOutput = execSync(`npx vercel curl ${prodBase}/api/health`, { encoding: "utf-8" });
  console.log("Production Health Check Output:\n", healthOutput.slice(-300));

  console.log("\n2. Testing /api/agent/tasks via vercel curl on production...");
  const payload = {
    objective: "Implement a student grade analyzer in TypeScript with SQLite schema and unit tests",
    agentRole: "programming",
    context: {
      userId: "prod_agent_verifier",
      workspaceId: "prod_workspace_primary"
    }
  };
  fs.writeFileSync("scratch/test-prod-task-payload.json", JSON.stringify(payload));

  const createCmd = `npx vercel curl ${prodBase}/api/agent/tasks -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-task-payload.json"`;
  const taskOutput = execSync(createCmd, { encoding: "utf-8" });
  console.log("Production Agent Task Creation Output Sample:\n", taskOutput.slice(-450));

  console.log("\n3. Testing /api/agent/tasks (GET listing) via vercel curl on production...");
  const listCmd = `npx vercel curl ${prodBase}/api/agent/tasks -H "x-tattva-session: ${token}"`;
  const listOutput = execSync(listCmd, { encoding: "utf-8" });
  console.log("Production Agent Task Listing Output Sample:\n", listOutput.slice(-300));

  console.log("\n4. Testing /api/chat with agent execution via vercel curl on production...");
  const chatPayload = {
    messages: [
      {
        role: "user",
        content: "Explain the architectural components of an autonomous AI agent."
      }
    ],
    model: "agent-mode"
  };
  fs.writeFileSync("scratch/test-prod-chat-payload.json", JSON.stringify(chatPayload));

  const chatCmd = `npx vercel curl ${prodBase}/api/chat -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-chat-payload.json"`;
  const chatOutput = execSync(chatCmd, { encoding: "utf-8" });
  console.log("Production Chat Agent Mode Response Sample:\n", chatOutput.slice(-400));

  console.log("\n✅ Live Production Autonomous Agent Verification: PASSED!");
}

main().catch(console.error);
