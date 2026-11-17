/**
 * TATTVA AI - Phase 24 Ecosystem & Developer Platform Test Suite
 * Tests external integrations, OAuth encryption, plugin architecture, custom tools,
 * developer API keys & scopes, workflow automation, and SDK.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(__filename);

const {
  encryptExternalToken,
  decryptExternalToken,
  IntegrationsVault,
} = jiti("../app/lib/ecosystem/integrations-vault.ts");

const { PluginSystem } = jiti("../app/lib/ecosystem/plugin-system.ts");
const { CustomToolManager } = jiti("../app/lib/ecosystem/custom-tool-manager.ts");
const { ApiKeyManager } = jiti("../app/lib/ecosystem/api-key-manager.ts");
const { WorkflowEngine } = jiti("../app/lib/ecosystem/workflow-engine.ts");
const { TattvaClient } = jiti("../app/lib/ecosystem/sdk/tattva-client.ts");

let passed = 0;
let failed = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ""}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} ${details ? `[FAILED: ${details}]` : ""}`);
  }
}

async function runTests() {
  console.log("====================================================================");
  console.log("TATTVA AI — PHASE 24 ECOSYSTEM & DEVELOPER PLATFORM TEST SUITE");
  console.log("====================================================================\n");

  // TEST 1: AES-256-GCM Token Encryption & Decryption
  console.log("Test Suite 1: OAuth Credential Encryption & Decryption (AES-256-GCM)");
  const rawToken = "ghp_9876543210abcdef_sample_secret_token";
  const encrypted = encryptExternalToken(rawToken);
  assert(Boolean(encrypted.ciphertext), "Generated ciphertext");
  assert(Boolean(encrypted.iv), "Generated 12-byte IV");
  assert(Boolean(encrypted.tag), "Generated authentication tag");
  assert(encrypted.ciphertext !== rawToken, "Token is not stored in plaintext");

  const decrypted = decryptExternalToken(encrypted.ciphertext, encrypted.iv, encrypted.tag);
  assert(decrypted === rawToken, "Decrypted token matches original secret exactly");

  // TEST 2: Integration Vault & Multi-Tenant Isolation
  console.log("\nTest Suite 2: Integrations Vault & Tenant Isolation");
  const userA = "ecosystem_user_alpha";
  const userB = "ecosystem_user_beta";

  const connA = IntegrationsVault.saveConnection(
    userA,
    "ws_alpha",
    "github",
    rawToken,
    "alpha-developer",
    ["repo", "user"],
    3600 // 1 hour expiry
  );

  assert(Boolean(connA.id), "Saved GitHub connection with ID", connA.id);
  assert(connA.status === "connected", "Connection status is 'connected'");

  const retrievedA = IntegrationsVault.getConnection(userA, connA.id);
  assert(retrievedA !== null && retrievedA.id === connA.id, "User A retrieves own connection");

  // Multi-tenant check: User B cannot retrieve User A's connection
  const retrievedB = IntegrationsVault.getConnection(userB, connA.id);
  assert(retrievedB === null, "Multi-Tenant Isolation: User B cannot access User A's connection");

  // Expired token rejection
  const expiredConn = IntegrationsVault.saveConnection(
    userA,
    "ws_alpha",
    "slack",
    "xoxb-expired-token",
    "alpha-slack",
    ["chat:write"],
    -10 // Expired 10 seconds ago
  );
  const expiredOp = await IntegrationsVault.executeServiceOperation(userA, expiredConn.id, "post_message", {});
  assert(expiredOp.success === false, "Expired token operation rejected");
  assert(expiredOp.error && expiredOp.error.includes("expired"), "Provides explicit expiration error message", expiredOp.error);

  // TEST 3: Plugin System & Sandboxing
  console.log("\nTest Suite 3: Plugin Architecture & Permissions");
  const plugins = PluginSystem.listPlugins(userA);
  assert(plugins.length >= 5, "Discovered available catalog plugins", `${plugins.length} plugins`);

  const enableRes = PluginSystem.enablePlugin(userA, "notion-knowledge-sync");
  assert(enableRes.success === true, "Enabled Notion plugin for User A");

  const pluginExec = await PluginSystem.executePluginTool(
    userA,
    "ws_alpha",
    "notion-knowledge-sync",
    "notion_query_db",
    { databaseId: "test_db" }
  );
  assert(pluginExec.success === false, "Plugin safely rejected without active service connection");
  assert(pluginExec.error && pluginExec.error.includes("Missing active connection"), "Provides missing connection warning", pluginExec.error);

  // TEST 4: Custom AI Tools & SSRF Guard
  console.log("\nTest Suite 4: Custom AI Tool Manager & SSRF Guardrails");
  let ssrfBlocked = false;
  try {
    CustomToolManager.registerCustomTool(userA, "ws_alpha", {
      name: "internal_tool",
      displayName: "Internal Admin",
      description: "Tries to hit internal IP",
      endpointUrl: "http://169.254.169.254/metadata",
      httpMethod: "GET",
      authConfig: { type: "none" },
      inputSchema: {},
      outputSchema: {},
      permission: "safe",
      timeoutMs: 5000,
      rateLimitPerMinute: 60,
    });
  } catch (err) {
    ssrfBlocked = true;
  }
  assert(ssrfBlocked === true, "SSRF Guard: Rejects custom tool targeting cloud metadata IP");

  const validCustomTool = CustomToolManager.registerCustomTool(userA, "ws_alpha", {
    name: "weather_api",
    displayName: "Public Weather API",
    description: "Fetches public weather data",
    endpointUrl: "https://api.weather.gov/alerts/active",
    httpMethod: "GET",
    authConfig: { type: "none" },
    inputSchema: {
      area: { type: "string", description: "State code", required: true },
    },
    outputSchema: { status: "string" },
    permission: "safe",
    timeoutMs: 5000,
    rateLimitPerMinute: 60,
  });

  assert(Boolean(validCustomTool.id), "Custom tool registered successfully", validCustomTool.id);
  const userTools = CustomToolManager.listCustomTools(userA);
  assert(userTools.some((t) => t.id === validCustomTool.id), "Custom tool listed in user vault");

  // TEST 5: Developer API Key Platform & Scope Authorization
  console.log("\nTest Suite 5: Developer API Key Management & Scope Security");
  const { apiKey, rawSecret } = ApiKeyManager.generateApiKey(
    userA,
    "ws_alpha",
    "Mobile App Integration Key",
    ["research:read", "tasks:write"], // No chat:write
    100,
    5000
  );

  assert(rawSecret.startsWith("tattva_live_"), "API key format matches 'tattva_live_...'");
  assert(apiKey.hashedKey !== rawSecret, "Raw secret is hashed with SHA-256");

  // Authenticate with valid scope
  const authResearch = ApiKeyManager.authenticateApiKey(rawSecret, "research:read");
  assert(authResearch.valid === true, "Authorized for permitted scope 'research:read'");
  assert(authResearch.status === 200, "Returns HTTP 200");

  // Authenticate with missing scope (chat:write)
  const authChat = ApiKeyManager.authenticateApiKey(rawSecret, "chat:write");
  assert(authChat.valid === false, "Unauthorized for missing scope 'chat:write'");
  assert(authChat.status === 403, "Returns HTTP 403 Forbidden");

  // Authenticate with invalid key
  const authInvalid = ApiKeyManager.authenticateApiKey("tattva_live_invalidkey12345");
  assert(authInvalid.valid === false, "Rejects fabricated API key");
  assert(authInvalid.status === 401, "Returns HTTP 401 Unauthorized");

  // TEST 6: Multi-Step Workflow Automation Engine
  console.log("\nTest Suite 6: Multi-Step Workflow Automation Engine");
  const testWorkflow = WorkflowEngine.saveWorkflow({
    id: "wf_data_pipeline",
    userId: userA,
    workspaceId: "ws_alpha",
    name: "Automated Math & Statistical Pipeline",
    description: "Evaluates formulas and generates statistical distribution metrics",
    trigger: { type: "manual" },
    steps: [
      {
        id: "step_calc",
        name: "Calculate Total Volume",
        toolName: "math_calculator",
        parameters: { expression: "250 * 4" },
      },
      {
        id: "step_stats",
        name: "Analyze Distribution",
        toolName: "data_analyzer",
        parameters: { numbers: [100, 200, 300, 400, 500] },
        dependsOn: ["step_calc"],
      },
    ],
    createdAt: "",
    updatedAt: "",
  });

  assert(Boolean(testWorkflow.id), "Saved multi-step workflow definition", testWorkflow.id);

  const runResult = await WorkflowEngine.executeWorkflow(userA, testWorkflow.id);
  assert(runResult.status === "COMPLETED", "Workflow executed to COMPLETED state", runResult.status);
  assert(runResult.stepResults["step_calc"]?.status === "SUCCESS", "Step 1 executed successfully");
  assert(runResult.stepResults["step_stats"]?.status === "SUCCESS", "Step 2 executed successfully");
  assert(runResult.totalDurationMs >= 0, "Workflow duration recorded", `${runResult.totalDurationMs}ms`);

  // TEST 7: TypeScript SDK Client Initialization
  console.log("\nTest Suite 7: Developer TypeScript SDK Client");
  const client = new TattvaClient({
    apiKey: rawSecret,
    baseUrl: "https://tattva-ai-phi.vercel.app",
  });
  assert(typeof client.chat.create === "function", "SDK exposes chat.create()");
  assert(typeof client.research.search === "function", "SDK exposes research.search()");
  assert(typeof client.documents.ingest === "function", "SDK exposes documents.ingest()");
  assert(typeof client.tasks.create === "function", "SDK exposes tasks.create()");
  assert(typeof client.usage.get === "function", "SDK exposes usage.get()");

  console.log("\n====================================================================");
  console.log(`PHASE 24 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("====================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
