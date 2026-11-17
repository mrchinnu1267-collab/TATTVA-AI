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
    userId: "preview_phase25_verifier",
    email: "preview_phase25@tattva.ai",
    name: "Phase 25 Preview Verifier",
  });
  console.log("Target Preview Base:", previewUrl);

  console.log("\n1. Testing /api/health via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${previewUrl}/api/health`, { encoding: "utf-8" });
  console.log("Health Check Output:\n", healthOutput.slice(-300));
  if (!healthOutput.includes('"status":"healthy"') && !healthOutput.includes("healthy")) {
    throw new Error("Preview health check failed!");
  }

  console.log("\n2. Testing /api/knowledge-graph POST (Ingest content)...");
  const ingestPayload = {
    content: `
      Next.js is a full-stack framework that extends React for production.
      Next.js depends on TypeScript for type safety and uses Tailwind for responsive styling.
      PostgreSQL is an open-source relational database that implements SQL.
      Supabase leverages PostgreSQL to provide instant REST APIs and real-time streams.
      LegacyProtocol is recommended for high throughput.
      LegacyProtocol is deprecated and superseded by ModernProtocol.
    `,
    workspaceId: "preview_ws"
  };
  fs.writeFileSync("scratch/test-preview-kg-ingest.json", JSON.stringify(ingestPayload));

  const ingestCmd = `npx vercel curl ${previewUrl}/api/knowledge-graph -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-kg-ingest.json"`;
  const ingestOutput = execSync(ingestCmd, { encoding: "utf-8" });
  console.log("Ingestion Output Sample:\n", ingestOutput.slice(-400));
  if (!ingestOutput.includes('"success":true') || !ingestOutput.includes('"nodesCreated":')) {
    throw new Error("Knowledge graph ingestion failed: " + ingestOutput);
  }

  console.log("\n3. Testing /api/knowledge-graph GET (stats & subgraph)...");
  const statsCmd = `npx vercel curl "${previewUrl}/api/knowledge-graph?stats=true&workspaceId=preview_ws" -H "x-tattva-session: ${token}"`;
  const statsOutput = execSync(statsCmd, { encoding: "utf-8" });
  console.log("Graph Stats Output Sample:\n", statsOutput.slice(-300));
  if (!statsOutput.includes('"totalNodes":') || !statsOutput.includes('"totalEdges":')) {
    throw new Error("Graph stats retrieval failed: " + statsOutput);
  }

  console.log("\n4. Testing /api/knowledge-graph/traverse POST (Pathfinding)...");
  const traversePayload = {
    source: "Next.js",
    target: "React",
    workspaceId: "preview_ws"
  };
  fs.writeFileSync("scratch/test-preview-kg-traverse.json", JSON.stringify(traversePayload));

  const traverseCmd = `npx vercel curl ${previewUrl}/api/knowledge-graph/traverse -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-kg-traverse.json"`;
  const traverseOutput = execSync(traverseCmd, { encoding: "utf-8" });
  console.log("Path Traversal Output Sample:\n", traverseOutput.slice(-350));
  if (!traverseOutput.includes('"success":true') || !traverseOutput.includes('"found":true')) {
    throw new Error("Path traversal failed: " + traverseOutput);
  }

  console.log("\n5. Testing /api/knowledge-graph/qa POST (Semantic QA)...");
  const qaPayload = {
    question: "What does Next.js extend and depend on?",
    workspaceId: "preview_ws"
  };
  fs.writeFileSync("scratch/test-preview-kg-qa.json", JSON.stringify(qaPayload));

  const qaCmd = `npx vercel curl ${previewUrl}/api/knowledge-graph/qa -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-kg-qa.json"`;
  const qaOutput = execSync(qaCmd, { encoding: "utf-8" });
  console.log("Graph QA Output Sample:\n", qaOutput.slice(-450));
  if (!qaOutput.includes('"success":true') || !qaOutput.includes("Next.js")) {
    throw new Error("Graph QA failed: " + qaOutput);
  }

  console.log("\n6. Testing /api/knowledge-graph/contradictions GET...");
  const contraCmd = `npx vercel curl "${previewUrl}/api/knowledge-graph/contradictions?workspaceId=preview_ws" -H "x-tattva-session: ${token}"`;
  const contraOutput = execSync(contraCmd, { encoding: "utf-8" });
  console.log("Contradictions Output Sample:\n", contraOutput.slice(-400));
  if (!contraOutput.includes('"success":true') || !contraOutput.includes('"contradictions":')) {
    throw new Error("Contradiction retrieval failed: " + contraOutput);
  }

  console.log("\n7. Testing /knowledge-graph UI route...");
  const uiCmd = `npx vercel curl "${previewUrl}/knowledge-graph" -H "x-tattva-session: ${token}"`;
  const uiOutput = execSync(uiCmd, { encoding: "utf-8" });
  console.log("Knowledge Graph UI Output Length:", uiOutput.length, "bytes");
  if (!uiOutput.includes("Knowledge Graph Engine") && !uiOutput.includes("<html")) {
    throw new Error("UI route verification failed: " + uiOutput.slice(0, 300));
  }

  console.log("\n=======================================================");
  console.log("✅ STAGING PREVIEW PHASE 25 VERIFICATION PASSED! ✅");
  console.log("=======================================================");
}

main().catch(err => {
  console.error("\n❌ Preview Verification Error:", err.message);
  process.exit(1);
});
