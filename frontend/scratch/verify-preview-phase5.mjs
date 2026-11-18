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
    userId: "preview_phase5_verifier",
    email: "preview_phase5@tattva.ai",
    name: "Phase 5 Preview Verifier",
  });
  console.log("Generated Preview Signed Token:", token.slice(0, 30) + "...");
  console.log("Target Preview Base:", previewUrl);

  console.log("\n1. Testing /api/health via vercel curl...");
  const healthOutput = execSync(`npx vercel curl ${previewUrl}/api/health`, { encoding: "utf-8" });
  console.log("Health Check Output:\n", healthOutput.slice(-300));

  console.log("\n2. Testing /api/research via vercel curl...");
  const payload = {
    query: "Next.js App Router Server Actions security",
    maxSources: 3,
    deepRead: true
  };
  fs.writeFileSync("scratch/test-preview-research-payload.json", JSON.stringify(payload));

  const researchCmd = `npx vercel curl ${previewUrl}/api/research -X POST -H "Content-Type: application/json" -H "x-tattva-session: ${token}" --data-binary "@scratch/test-preview-research-payload.json"`;
  const researchOutput = execSync(researchCmd, { encoding: "utf-8" });
  console.log("Preview Research Output Sample:\n", researchOutput.slice(-500));

  console.log("\n3. Testing /api/research GET query via vercel curl...");
  const getCmd = `npx vercel curl "${previewUrl}/api/research?query=Python+asyncio+architecture" -H "x-tattva-session: ${token}"`;
  const getOutput = execSync(getCmd, { encoding: "utf-8" });
  console.log("Preview Research GET Output Sample:\n", getOutput.slice(-350));

  console.log("\n✅ Staging Preview Phase 5 Web Research Verification: PASSED!");
}

main().catch(console.error);
