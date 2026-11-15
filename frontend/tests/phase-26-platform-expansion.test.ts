/**
 * TATTVA AI - Phase 26 Platform Expansion Automated Test Suite
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 *
 * Verifies:
 * 1. Webhook Dispatcher (Slack, Discord, MS Teams schema formatting, URL protocol/host validation, mock dispatch)
 * 2. Cloud Storage Signed URLs (Supabase Storage, S3, GCS, path traversal sanitization, expiration timestamps)
 * 3. Expanded AI Providers (Anthropic Claude, Azure OpenAI, Indic Local SLM, ChatML to Anthropic translation)
 */

import { webhookIntegration } from "../app/lib/integrations/webhook-integration";
import { cloudStorageIntegration } from "../app/lib/integrations/cloud-storage-integration";
import { providerExpansionManager } from "../app/lib/integrations/provider-expansion";
import { WebhookAlertPayload } from "../app/lib/integrations/types";

async function runPhase26Tests() {
  console.log("====================================================================");
  console.log("   TATTVA AI - PHASE 26: PLATFORM EXPANSION & INTEGRATIONS VERIFICATION");
  console.log("====================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  // ==========================================
  // SECTION 1: Webhook Integration & Formatting
  // ==========================================
  console.log("--- 1. Webhook URL Validation & Security ---");
  const validSlack = "https://hooks.slack.com/services/T00/B00/XXXX";
  const validDiscord = "https://discord.com/api/webhooks/123/abc";
  const validTeams = "https://webhook.office.com/webhookb2/123";
  const invalidInsecure = "http://hooks.slack.com/services/T00/B00/XXXX";
  const invalidHost = "https://evil-phishing.com/slack";

  assert(webhookIntegration.validateWebhookUrl(validSlack, "slack"), "Accepts valid HTTPS Slack webhook");
  assert(webhookIntegration.validateWebhookUrl(validDiscord, "discord"), "Accepts valid HTTPS Discord webhook");
  assert(webhookIntegration.validateWebhookUrl(validTeams, "teams"), "Accepts valid HTTPS MS Teams webhook");
  assert(!webhookIntegration.validateWebhookUrl(invalidInsecure, "slack"), "Rejects insecure HTTP Slack webhook");
  assert(!webhookIntegration.validateWebhookUrl(invalidHost, "slack"), "Rejects unauthorized spoofed host for Slack");

  console.log("\n--- 2. Webhook Schema Adapters (Slack, Discord, Teams) ---");
  const sampleAlert: WebhookAlertPayload = {
    channel: "slack",
    title: "Autonomous Agent Outlier Detected",
    message: "Evaluation metric degraded beyond 5% tolerance",
    severity: "critical",
    metadata: {
      model: "gemini-2.5-flash",
      latencyMs: 4200,
      runId: "run_98234",
    },
  };

  const slackPayload = webhookIntegration.formatPayload(sampleAlert);
  assert(slackPayload.attachments && slackPayload.attachments[0].color === "#EF4444", "Slack format includes critical red color");
  assert(slackPayload.attachments[0].fields.length === 3, "Slack format maps metadata to short fields");

  sampleAlert.channel = "discord";
  const discordPayload = webhookIntegration.formatPayload(sampleAlert);
  assert(discordPayload.embeds && discordPayload.embeds[0].title === "Autonomous Agent Outlier Detected", "Discord format includes embed title");
  assert(discordPayload.embeds[0].color === 0xEF4444, "Discord format converts hex color to decimal integer");

  sampleAlert.channel = "teams";
  const teamsPayload = webhookIntegration.formatPayload(sampleAlert);
  assert(teamsPayload["@type"] === "MessageCard", "Teams format outputs standard O365 MessageCard");
  assert(teamsPayload.sections[0].facts.length === 3, "Teams format maps metadata to card facts");

  console.log("\n--- 3. Webhook Dispatch Execution & Mock Bounds ---");
  const dispatchRes = await webhookIntegration.dispatchWebhook(
    validSlack,
    { ...sampleAlert, channel: "slack" },
    async (formatted) => {
      // Mock HTTP 200 response
      return { status: 200 };
    }
  );
  assert(dispatchRes.success && dispatchRes.statusCode === 200, "Webhook dispatch completes successfully via mock transport");

  const invalidDispatch = await webhookIntegration.dispatchWebhook(
    "http://insecure-endpoint.com",
    { ...sampleAlert, channel: "slack" }
  );
  assert(!invalidDispatch.success && invalidDispatch.statusCode === 400, "Webhook dispatch rejects insecure endpoint before network call");

  // ==========================================
  // SECTION 2: Cloud Storage Signed URLs
  // ==========================================
  console.log("\n--- 4. Cloud Storage Path Sanitization ---");
  const dangerousPath = "../../etc/passwd/documents/../../sensitive.pdf";
  const sanitized = cloudStorageIntegration.sanitizePath(dangerousPath);
  assert(!sanitized.includes(".."), "Path sanitization strips directory traversal sequences");
  assert(!sanitized.startsWith("/"), "Path sanitization strips leading slashes");

  console.log("\n--- 5. Signed URL Generation Across Providers ---");
  const supabaseUrl = cloudStorageIntegration.generateSignedUrl({
    provider: "supabase_storage",
    bucket: "tattva_evals",
    filePath: "user_123/reports/eval_may.pdf",
    action: "read",
    expiresInSeconds: 1800,
    userId: "usr_gowtham_99",
  });
  assert(supabaseUrl.signedUrl.includes("tattva.storage.supabase.co"), "Generates Supabase Storage endpoint URL");
  assert(supabaseUrl.expiresInSeconds === 1800, "Honors configured 1800s TTL");
  assert(supabaseUrl.signedUrl.includes("uid=usr_gowtham_99"), "Binds caller UID to signed token request");

  const s3Url = cloudStorageIntegration.generateSignedUrl({
    provider: "aws_s3",
    bucket: "tattva-production-blobs",
    filePath: "datasets/mmlu_sample.csv",
    action: "read",
    userId: "usr_gowtham_99",
  });
  assert(s3Url.signedUrl.includes("tattva-production-blobs.s3.amazonaws.com"), "Generates AWS S3 bucket endpoint URL");

  const gcsUrl = cloudStorageIntegration.generateSignedUrl({
    provider: "gcs",
    bucket: "tattva-gcp-artifacts",
    filePath: "checkpoints/weights.bin",
    action: "write",
    userId: "usr_gowtham_99",
  });
  assert(gcsUrl.signedUrl.includes("storage.googleapis.com/tattva-gcp-artifacts"), "Generates Google Cloud Storage endpoint URL");
  assert(gcsUrl.action === "write", "Sets write intent in Cloud Storage signed URL");

  // ==========================================
  // SECTION 3: Expanded AI Provider Connectors
  // ==========================================
  console.log("\n--- 6. Expanded AI Providers Registry ---");
  const providers = providerExpansionManager.listExpandedProviders();
  assert(providers.length === 3, "Registers 3 expanded providers (Anthropic, Azure OpenAI, Indic SLM)");

  const anthropic = providerExpansionManager.getProvider("anthropic");
  assert(!!anthropic && anthropic.supportedModels.includes("claude-3-5-sonnet-20241022"), "Anthropic provider includes Claude 3.5 Sonnet");

  const indicSlm = providerExpansionManager.getProvider("indic_local_slm");
  assert(!!indicSlm && indicSlm.isReady === true && !indicSlm.requiresAuth, "Indic Local SLM is ready without external cloud API keys");

  console.log("\n--- 7. ChatML to Anthropic Format Translation ---");
  const chatml = [
    { role: "system", content: "You are an expert Indic linguist." },
    { role: "user", content: "Translate 'Namaste' into context." },
    { role: "assistant", content: "Namaste represents respect..." },
    { role: "user", content: "Provide Sanskrit etymology." },
  ];

  const anthropicPayload = providerExpansionManager.formatToAnthropicPayload(chatml);
  assert(anthropicPayload.systemPrompt === "You are an expert Indic linguist.", "Extracts top-level system prompt for Anthropic API");
  assert(anthropicPayload.messages.length === 3, "Converts remaining turns into user/assistant alternation");
  assert(anthropicPayload.messages[0].role === "user" && anthropicPayload.messages[1].role === "assistant", "Preserves exact conversation sequence");

  console.log("\n====================================================================");
  console.log(`   PHASE 26 VERIFICATION COMPLETE: ${passed} Passed, ${failed} Failed`);
  console.log("====================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase26Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
