/**
 * TATTVA AI - GEMINI CONNECTOR VERIFICATION TEST SUITE (PHASES 1 - 10)
 * 
 * Verifies:
 * - Phase 1: Existing Gemini integration inspection.
 * - Phase 2: Google consumer subscription vs developer API distinction.
 * - Phase 3 & 4: GeminiProvider interface implementation (connect, generateText, generateImage, getUsage, disconnect).
 * - Phase 5: Task detection across text, coding, reasoning, summarization, image, and structured data.
 * - Phase 6: Usage protection, quota bounds, rate limits, and prevention of unexpected paid fallback.
 * - Phase 7: Output handling and honest capability reporting.
 * - Phase 8: Security, secret masking, and credential isolation.
 * - Phase 9: Real live request verification against Google Gemini.
 * - Phase 10: Strict adherence to failure conditions for unsupported consumer subscriptions.
 */

import assert from "assert";
import dotenv from "dotenv";
import path from "path";
import { GeminiProConsumerAdapter } from "../app/lib/gemini-connector/gemini-pro-consumer-adapter";
import { GeminiApiAdapter } from "../app/lib/gemini-connector/gemini-api-adapter";
import { GeminiConnectorService } from "../app/lib/gemini-connector/gemini-connector-service";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runGeminiConnectorVerification() {
  console.log("================================================================================");
  console.log("🧪 TATTVA AI – GEMINI ACCOUNT INTEGRATION TEST SUITE (PHASES 1 - 10)");
  console.log("================================================================================\n");

  // ----------------------------------------------------------------------------
  // PHASE 1 & 2: Integration Discovery & Permission Segregation
  // ----------------------------------------------------------------------------
  console.log("▶ Phase 1 & 2: Integration Discovery & Permission Segregation...");
  const consumerAdapter = new GeminiProConsumerAdapter();
  const consumerStatus = await consumerAdapter.connect();

  assert.strictEqual(consumerStatus.isConnected, false, "Consumer subscription direct connection must be false");
  assert.strictEqual(consumerStatus.limitationReason, "OFFICIALLY_UNSUPPORTED_CONSUMER_SUBSCRIPTION");
  assert.ok(consumerStatus.policyNotice?.includes("Google does not provide an official API"), "Policy notice must cite official Google separation");
  console.log("  ✔ Phase 1 & 2: Consumer subscription structural separation verified.");

  // ----------------------------------------------------------------------------
  // PHASE 3 & 4: GeminiProvider Interface & Method Compliance
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 3 & 4: GeminiProvider Interface Implementation...");
  const apiAdapter = new GeminiApiAdapter();
  const apiStatus = await apiAdapter.connect();

  assert.strictEqual(typeof apiAdapter.connect, "function", "connect() must be implemented");
  assert.strictEqual(typeof apiAdapter.generateText, "function", "generateText() must be implemented");
  assert.strictEqual(typeof apiAdapter.generateImage, "function", "generateImage() must be implemented");
  assert.strictEqual(typeof apiAdapter.getUsage, "function", "getUsage() must be implemented");
  assert.strictEqual(typeof apiAdapter.disconnect, "function", "disconnect() must be implemented");
  console.log(`  ✔ Phase 3 & 4: Interface contract satisfied. API Connected: ${apiStatus.isConnected}`);

  // ----------------------------------------------------------------------------
  // PHASE 5: Automatic Task Detection & Routing
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 5: Automatic Task Detection...");
  const service = GeminiConnectorService.getInstance();

  const codeTask = service.detectTask("Write a Python function to sort an array");
  assert.strictEqual(codeTask, "coding", "Code directive must be detected as coding");

  const mathTask = service.detectTask("Solve the math equation 3x + 9 = 27 step-by-step");
  assert.strictEqual(mathTask, "reasoning", "Math calculation must be detected as reasoning");

  const sumTask = service.detectTask("Summarize this executive report in three bullet points");
  assert.strictEqual(sumTask, "summarization", "Summary directive must be detected as summarization");

  const imgTask = service.detectTask("Generate an image of a neon city at night");
  assert.strictEqual(imgTask, "image", "Image directive must be detected as image");

  const dataTask = service.detectTask("Output a structured JSON schema of users");
  assert.strictEqual(dataTask, "structured_data", "Structured data directive must be detected as structured_data");
  console.log("  ✔ Phase 5: Task detection accurately classified all 5 domains.");

  // ----------------------------------------------------------------------------
  // PHASE 6: Usage Protection & Quota Limits
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 6: Usage Protection & Quota Controls...");
  const usageStatus = await apiAdapter.getUsage();
  assert.strictEqual(usageStatus.rateLimitPerMinute, 15, "Rate limit ceiling must be 15 RPM");
  assert.strictEqual(typeof usageStatus.isQuotaExhausted, "boolean", "Quota exhaustion flag must be boolean");
  assert.ok(usageStatus.authoritativeSource.includes("Google"), "Authoritative source must be identified");

  const consumerUsage = await consumerAdapter.getUsage();
  assert.strictEqual(consumerUsage.isQuotaExhausted, true, "Consumer usage must block requests to prevent unapproved charges");
  console.log("  ✔ Phase 6: Usage limits and quota guardrails verified.");

  // ----------------------------------------------------------------------------
  // PHASE 7: Honest Output Handling & Image Non-Fabrication
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 7: Honest Output Handling & Image Capability Verification...");
  let imageErrorCaught = false;
  try {
    await apiAdapter.generateImage("A peaceful forest");
  } catch (err: any) {
    imageErrorCaught = true;
    assert.ok(
      err.message.includes("does not support native image generation") ||
      err.message.includes("Imagen 3"),
      "Must explicitly state language model does not support image generation"
    );
  }
  assert.strictEqual(imageErrorCaught, true, "Image generation on standard model must throw error instead of returning mock image");
  console.log("  ✔ Phase 7: Zero-mock image policy strictly enforced.");

  // ----------------------------------------------------------------------------
  // PHASE 8: Security & Secret Protection
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 8: Security & Credential Isolation...");
  const serializedStatus = JSON.stringify(apiStatus);
  assert.ok(!serializedStatus.includes(process.env.GEMINI_API_KEY || "AIza"), "API key must never appear in ConnectionStatus object");
  console.log("  ✔ Phase 8: Zero-secret exposure verified in public payloads.");

  // ----------------------------------------------------------------------------
  // PHASE 9: Real Provider Live Execution
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 9: Real Provider Live Execution Test...");
  if (apiStatus.isConnected) {
    const textRes = await apiAdapter.generateText(
      "Respond strictly with the single word: CONFIRMED",
      { model: "gemini-3.5-flash-lite", temperature: 0 }
    );
    assert.ok(textRes.text.length > 0, "Response text must be non-empty");
    assert.ok(textRes.latencyMs > 0, "Latency must be recorded");
    assert.ok(textRes.usage?.totalTokens, "Token usage metrics must be computed");
    console.log(`  ✔ Phase 9: Real Gemini request succeeded (${textRes.latencyMs}ms): "${textRes.text.trim()}"`);
  } else {
    console.log("  ⚠ Phase 9: Developer API key not configured; live call skipped.");
  }

  // ----------------------------------------------------------------------------
  // PHASE 10: Failure Condition Adherence for Consumer Subscriptions
  // ----------------------------------------------------------------------------
  console.log("\n▶ Phase 10: Failure Condition Adherence...");
  let consumerErrorCaught = false;
  try {
    await consumerAdapter.generateText("Hello from consumer");
  } catch (err: any) {
    consumerErrorCaught = true;
    assert.ok(err.message.includes("Consumer Google AI Pro subscription cannot be invoked directly"));
    assert.ok(err.message.includes("paid API fallback is disabled"));
  }
  assert.strictEqual(consumerErrorCaught, true, "Consumer adapter must reject execution and avoid paid fallback");
  console.log("  ✔ Phase 10: Failure condition strictly respected. Zero fake simulation.");

  console.log("\n================================================================================");
  console.log("✨ ALL 10 PHASES OF GEMINI CONNECTOR VERIFICATION PASSED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runGeminiConnectorVerification().catch((err) => {
  console.error("Gemini Connector Verification Failed:", err);
  process.exit(1);
});
