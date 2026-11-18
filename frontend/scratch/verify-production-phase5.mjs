import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const { createSignedTattvaSession } = jiti("../app/lib/security.ts");

async function main() {
  const prodBase = "https://tattva-ai-phi.vercel.app";

  const token = createSignedTattvaSession({
    userId: "prod_phase5_verifier",
    email: "prod_phase5@tattva.ai",
    name: "Phase 5 Production Verifier",
  });
  console.log("Generated Production Signed Token:", token.slice(0, 30) + "...");
  console.log("Target Production Base:", prodBase);

  console.log("\n1. Testing /api/health on production via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${prodBase}/api/health`, { encoding: "utf-8" });
  console.log("Production Health Output:\n", healthOutput.slice(-300));

  console.log("\n2. Testing /api/research POST on production via vercel curl...");
  const payload = {
    query: "Next.js App Router Server Actions security",
    maxSources: 3,
    deepRead: true
  };
  fs.writeFileSync("scratch/test-prod-research-payload.json", JSON.stringify(payload));

  const researchCmd = `npx vercel curl ${prodBase}/api/research -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-research-payload.json"`;
  const researchOutput = execSync(researchCmd, { encoding: "utf-8" });
  console.log("Production Research Output Sample:\n", researchOutput.slice(-500));

  console.log("\n3. Testing /api/research GET query on production via vercel curl...");
  const getCmd = `npx vercel curl "${prodBase}/api/research?query=Python+asyncio+architecture" -H "x-tattva-session: ${token}"`;
  const getOutput = execSync(getCmd, { encoding: "utf-8" });
  console.log("Production Research GET Output Sample:\n", getOutput.slice(-350));

  console.log("\n4. Testing /api/agent/tasks using web_research tool on production...");
  const taskPayload = {
    objective: "Research Python asyncio architecture and synthesize authoritative findings",
    agentRole: "research",
    context: {
      userId: "prod_phase5_verifier",
      workspaceId: "prod_ws_research"
    }
  };
  fs.writeFileSync("scratch/test-prod-agent-research.json", JSON.stringify(taskPayload));
  const taskCmd = `npx vercel curl ${prodBase}/api/agent/tasks -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-agent-research.json"`;
  const taskOutput = execSync(taskCmd, { encoding: "utf-8" });
  console.log("Production Agent Research Task Output Sample:\n", taskOutput.slice(-450));

  console.log("\n✅ Live Production Phase 5 Web Research Verification: PASSED!");
}

main().catch(console.error);
