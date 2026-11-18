import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// 1. Create a workspace record in local vault / tmp
const testUserId = "durability_test_user_" + Date.now();
const testWorkspaceItem = {
  id: "ws_item_" + Date.now(),
  user_id: testUserId,
  app: "word",
  name: "DURABILITY_VERIFICATION_DOCUMENT",
  description: "Test document to verify survival across process restarts",
  format: "docx",
  sizeBytes: 2048,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Write to the workspace vault directory (same as route.ts)
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const vaultDir = isVercel ? path.join(os.tmpdir(), ".tattva-vault") : path.resolve(process.cwd(), ".tattva-vault");
const userDir = path.join(vaultDir, "workspace_data", testUserId);
fs.mkdirSync(userDir, { recursive: true });
fs.writeFileSync(path.join(userDir, "items.json"), JSON.stringify([testWorkspaceItem]), "utf-8");

// 2. Create an image job record in /tmp/.tattva_jobs
const testJobId = "job_durability_" + Date.now();
const testJob = {
  id: testJobId,
  userId: testUserId,
  workspaceId: "default",
  prompt: "A beautiful durably persisted sunset over digital horizons",
  promptHash: "hash_" + Date.now(),
  status: "completed",
  currentStage: "verified",
  progressPercent: 100,
  attempts: 1,
  maxAttempts: 4,
  resultImageUrl: "https://example.com/durability_test.png",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  dbPersisted: false,
  isDurable: false
};

const jobsDir = path.join("/tmp", ".tattva_jobs");
try { fs.mkdirSync(jobsDir, { recursive: true }); } catch {}
try { fs.writeFileSync(path.join(jobsDir, `${testJobId}.json`), JSON.stringify(testJob), "utf-8"); } catch {}

console.log("=== CREATED DISPOSABLE RECORDS IN PROCESS 1 ===");
console.log("Workspace Item ID:", testWorkspaceItem.id);
console.log("Image Job ID:     ", testJob.id);
console.log("User ID:          ", testUserId);

// 3. Now spawn a completely separate, new Node.js process to simulate process restart
const retrievalScript = `
import fs from "fs";
import path from "path";
import os from "os";

const testUserId = "${testUserId}";
const testItemId = "${testWorkspaceItem.id}";
const testJobId = "${testJobId}";

console.log("\\n=== PROCESS 2: RETRIEVAL AFTER PROCESS RESTART ===");

// Check workspace item
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const vaultDir = isVercel ? path.join(os.tmpdir(), ".tattva-vault") : path.resolve(process.cwd(), ".tattva-vault");
const userDir = path.join(vaultDir, "workspace_data", testUserId);
const itemsFile = path.join(userDir, "items.json");

let foundItem = null;
if (fs.existsSync(itemsFile)) {
  const items = JSON.parse(fs.readFileSync(itemsFile, "utf-8"));
  foundItem = items.find(i => i.id === testItemId);
}

if (foundItem) {
  console.log("✅ Workspace Item Retrieved on Same Machine/Host:", foundItem.id, "| Name:", foundItem.name);
} else {
  console.log("❌ Workspace Item NOT FOUND");
}

// Check image job
const jobsDir = path.join("/tmp", ".tattva_jobs");
const jobFile = path.join(jobsDir, testJobId + ".json");
let foundJob = null;
if (fs.existsSync(jobFile)) {
  foundJob = JSON.parse(fs.readFileSync(jobFile, "utf-8"));
}

if (foundJob) {
  console.log("✅ Image Job Retrieved on Same Machine/Host:", foundJob.id, "| Status:", foundJob.status, "| isDurable flag:", foundJob.isDurable);
} else {
  console.log("❌ Image Job NOT FOUND");
}

console.log("\\n=== SERVERLESS INSTANCE REPLACEMENT ANALYSIS ===");
console.log("Same Host / Same Container Restart: Disk files (/tmp) persist across simple process restarts.");
console.log("Multi-Container / Cold Start / New Lambda Instance: /tmp and in-memory cache DO NOT persist.");
console.log("Conclusion: Server-side storage in /tmp is EPHEMERAL across different serverless instances.");

// Cleanup disposable files
try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
try { if (fs.existsSync(jobFile)) fs.unlinkSync(jobFile); } catch {}
console.log("Disposable test files cleaned up successfully.");
`;

fs.writeFileSync("scratch/retrieval-test.mjs", retrievalScript, "utf-8");

const child = spawn("node", ["scratch/retrieval-test.mjs"], { stdio: "inherit" });
child.on("close", (code) => {
  process.exit(code || 0);
});
