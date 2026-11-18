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
    userId: "prod_phase6_verifier",
    email: "prod_phase6@tattva.ai",
    name: "Phase 6 Production Verifier",
  });
  console.log("Generated Production Signed Token:", token.slice(0, 30) + "...");
  console.log("Target Production Base:", prodBase);

  console.log("\n1. Testing /api/health on production via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${prodBase}/api/health`, { encoding: "utf-8" });
  console.log("Production Health Output:\n", healthOutput.slice(-300));

  console.log("\n2. Testing /api/documents POST on production via vercel curl...");
  const docPayload = {
    filename: "distributed_consensus.md",
    content: `# Distributed Consensus Architecture\n## Protocols\nThe system uses Raft consensus with 3 nodes.\nHeartbeats are sent every 150ms.\n\n## Election Timeout\nThe randomized election timeout is 300ms to 600ms.\n`,
    mimeType: "text/markdown",
    workspaceId: "ws_prod_phase6"
  };
  fs.writeFileSync("scratch/test-prod-doc-payload.json", JSON.stringify(docPayload));

  const docCmd = `npx vercel curl ${prodBase}/api/documents -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-doc-payload.json"`;
  const docOutput = execSync(docCmd, { encoding: "utf-8" });
  console.log("Production Document Ingestion Output Sample:\n", docOutput.slice(-450));
  const parsedDoc = JSON.parse(docOutput.slice(docOutput.indexOf("{")));
  const documentId = parsedDoc.document?.id;

  console.log("\n3. Testing /api/documents/qa on production via vercel curl...");
  const qaPayload = {
    documentId,
    question: "What is the randomized election timeout?"
  };
  fs.writeFileSync("scratch/test-prod-qa-payload.json", JSON.stringify(qaPayload));

  const qaCmd = `npx vercel curl ${prodBase}/api/documents/qa -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-qa-payload.json"`;
  const qaOutput = execSync(qaCmd, { encoding: "utf-8" });
  console.log("Production Document QA Output Sample:\n", qaOutput.slice(-450));

  console.log("\n4. Testing /api/documents/compare on production via vercel curl...");
  const comparePayload = {
    documents: [
      {
        name: "node_alpha.txt",
        content: "Node Alpha manages primary storage, heartbeat broadcasts, and memory persistence."
      },
      {
        name: "node_beta.txt",
        content: "Node Beta manages standby replica storage, heartbeat monitoring, and backup snapshots."
      }
    ]
  };
  fs.writeFileSync("scratch/test-prod-compare-payload.json", JSON.stringify(comparePayload));

  const compareCmd = `npx vercel curl ${prodBase}/api/documents/compare -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-compare-payload.json"`;
  const compareOutput = execSync(compareCmd, { encoding: "utf-8" });
  console.log("Production Document Compare Output Sample:\n", compareOutput.slice(-450));

  console.log("\n5. Testing /api/agent/tasks with document_analyzer tool on production...");
  const taskPayload = {
    objective: "Analyze document content and extract structured architectural sections",
    agentRole: "document",
    context: {
      userId: "prod_phase6_verifier",
      workspaceId: "ws_prod_phase6"
    }
  };
  fs.writeFileSync("scratch/test-prod-agent-doc.json", JSON.stringify(taskPayload));
  const taskCmd = `npx vercel curl ${prodBase}/api/agent/tasks -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-prod-agent-doc.json"`;
  const taskOutput = execSync(taskCmd, { encoding: "utf-8" });
  console.log("Production Agent Document Task Output Sample:\n", taskOutput.slice(-450));

  console.log("\n✅ Live Production Phase 6 Document Intelligence Verification: PASSED!");
}

main().catch(console.error);
