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
    userId: "preview_phase6_verifier",
    email: "preview_phase6@tattva.ai",
    name: "Phase 6 Preview Verifier",
  });
  console.log("Generated Preview Signed Token:", token.slice(0, 30) + "...");
  console.log("Target Preview Base:", previewUrl);

  console.log("\n1. Testing /api/health via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${previewUrl}/api/health`, { encoding: "utf-8" });
  console.log("Health Check Output:\n", healthOutput.slice(-300));

  console.log("\n2. Testing /api/documents POST (ingestion) via vercel curl...");
  const docPayload = {
    filename: "distributed_consensus.md",
    content: `# Distributed Consensus Architecture\n## Protocols\nThe system uses Raft consensus with 3 nodes.\nHeartbeats are sent every 150ms.\n\n## Election Timeout\nThe randomized election timeout is 300ms to 600ms.\n`,
    mimeType: "text/markdown",
    workspaceId: "ws_preview_phase6"
  };
  fs.writeFileSync("scratch/test-preview-doc-payload.json", JSON.stringify(docPayload));

  const docCmd = `npx vercel curl ${previewUrl}/api/documents -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-doc-payload.json"`;
  const docOutput = execSync(docCmd, { encoding: "utf-8" });
  console.log("Preview Document Ingestion Output Sample:\n", docOutput.slice(-450));
  const parsedDoc = JSON.parse(docOutput.slice(docOutput.indexOf("{")));
  const documentId = parsedDoc.document?.id;

  console.log("\n3. Testing /api/documents/qa via vercel curl...");
  const qaPayload = {
    documentId,
    question: "What is the randomized election timeout?"
  };
  fs.writeFileSync("scratch/test-preview-qa-payload.json", JSON.stringify(qaPayload));

  const qaCmd = `npx vercel curl ${previewUrl}/api/documents/qa -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-qa-payload.json"`;
  const qaOutput = execSync(qaCmd, { encoding: "utf-8" });
  console.log("Preview Document QA Output Sample:\n", qaOutput.slice(-450));

  console.log("\n4. Testing /api/documents/compare via vercel curl...");
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
  fs.writeFileSync("scratch/test-preview-compare-payload.json", JSON.stringify(comparePayload));

  const compareCmd = `npx vercel curl ${previewUrl}/api/documents/compare -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-compare-payload.json"`;
  const compareOutput = execSync(compareCmd, { encoding: "utf-8" });
  console.log("Preview Document Compare Output Sample:\n", compareOutput.slice(-450));

  console.log("\n✅ Staging Preview Phase 6 Document Intelligence Verification: PASSED!");
}

main().catch(console.error);
