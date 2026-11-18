import { verifyUserSession } from "../app/lib/security.js";
import { createImageJob, getJob, cancelJob, listRecentJobs } from "../app/lib/image-engine/reliability/job-queue.js";

console.log("=== TATTVA AI - STRICT SERVICE-ROLE & AUTHORIZATION AUDIT ===");

// 1. Audit unsigned tattva_session cookie spoofability
console.log("\n--- AUDIT 1: Custom Session Cookie Signature Verification ---");
const attackerCraftedEmail = "ceo@enterprise-customer.com";
const forgedPayload = Buffer.from(JSON.stringify({
  email: attackerCraftedEmail,
  name: "Impersonated Executive",
  timestamp: Date.now()
})).toString("base64");

const mockRequest = new Request("http://localhost:3000/api/workspace", {
  headers: {
    cookie: `tattva_session=${forgedPayload}`,
  },
});

const session = await verifyUserSession(mockRequest);
console.log("Crafted Cookie Email:", attackerCraftedEmail);
console.log("verifyUserSession result:");
console.log("  authenticated:", session.authenticated);
console.log("  userId:", session.userId);
console.log("  email:", session.email);
const isVulnerableCookie = session.authenticated === true && session.userId === attackerCraftedEmail;
console.log("Vulnerability Assessment:", isVulnerableCookie ? "CRITICAL: Cookie is unsigned base64 - enables arbitrary user impersonation" : "SECURE");

// 2. Audit Image Job IDOR (Insecure Direct Object Reference)
console.log("\n--- AUDIT 2: Image Job Ownership & Cross-Tenant Access ---");
const userA_Id = "user_A_uuid_1111";
const userB_Id = "user_B_uuid_2222";

// User A creates a job containing confidential prompt
const jobUserA = createImageJob({
  prompt: "Confidential patent diagram for quantum microchip 2026",
  userId: userA_Id,
  workspaceId: "workspace_A",
});

console.log(`User A created Job ID: ${jobUserA.id} (Owner: ${jobUserA.userId})`);

// User B attempts to fetch User A's job using only the jobId
const retrievedJobByB = getJob(jobUserA.id);
console.log("User B retrieved job without providing credentials:");
console.log("  Found:", Boolean(retrievedJobByB));
console.log("  Prompt exposed to User B:", retrievedJobByB?.prompt);
const isIdorVulnerable = retrievedJobByB !== null;
console.log("Vulnerability Assessment:", isIdorVulnerable ? "CRITICAL: Job status polling relies solely on unguessable ID with NO ownership check" : "SECURE");

// 3. User B cancels User A's job
console.log("\n--- AUDIT 3: Cross-User Job Cancellation ---");
const cancelResult = cancelJob(jobUserA.id);
console.log("User B cancelled User A's job:", cancelResult);
const postCancelJob = getJob(jobUserA.id);
console.log("Job status after User B cancellation:", postCancelJob?.status);
const isCancelVulnerable = postCancelJob?.status === "cancelled";
console.log("Vulnerability Assessment:", isCancelVulnerable ? "CRITICAL: Cross-user cancellation permitted without authorization" : "SECURE");

// 4. Listing recent jobs across tenants
console.log("\n--- AUDIT 4: Multi-Tenant Job Listing Leakage ---");
const recentJobs = listRecentJobs(10);
const crossTenantJobs = recentJobs.filter(j => j.id === jobUserA.id);
console.log(`listRecentJobs() returned ${recentJobs.length} total jobs`);
console.log("Contains User A's job in shared list:", crossTenantJobs.length > 0);
console.log("Vulnerability Assessment:", crossTenantJobs.length > 0 ? "HIGH: listRecentJobs() exposes all users' recent jobs in memory" : "SECURE");

console.log("\n=== AUDIT COMPLETE ===");
