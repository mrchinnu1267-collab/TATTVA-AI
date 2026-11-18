
import fs from "fs";
import path from "path";
import os from "os";

const testUserId = "durability_test_user_1794931292502";
const testItemId = "ws_item_1794931292502";
const testJobId = "job_durability_1794931292511";

console.log("\n=== PROCESS 2: RETRIEVAL AFTER PROCESS RESTART ===");

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

console.log("\n=== SERVERLESS INSTANCE REPLACEMENT ANALYSIS ===");
console.log("Same Host / Same Container Restart: Disk files (/tmp) persist across simple process restarts.");
console.log("Multi-Container / Cold Start / New Lambda Instance: /tmp and in-memory cache DO NOT persist.");
console.log("Conclusion: Server-side storage in /tmp is EPHEMERAL across different serverless instances.");

// Cleanup disposable files
try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
try { if (fs.existsSync(jobFile)) fs.unlinkSync(jobFile); } catch {}
console.log("Disposable test files cleaned up successfully.");
