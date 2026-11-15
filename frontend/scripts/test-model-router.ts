import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ModelRouter } from "../app/lib/ai-orchestrator/model-router";

async function testModelRouter() {
  const router = ModelRouter.getInstance();
  console.log("Testing ModelRouter with preferred models...");

  // Test 1: Gemini 3.5 Flash Lite
  try {
    const res1 = await router.executeWithFallback("general_chat", 2, {
      messages: [{ role: "user", content: "Reply with exactly: GEMINI_ROUTED_OK" }],
      preferredModel: "gemini-3.5-flash-lite",
    });
    console.log("[Router Test 1 - Gemini Flash Lite]:", {
      text: res1.text,
      modelUsed: res1.modelUsed,
      provider: res1.provider,
      latencyMs: res1.latencyMs,
    });
  } catch (e: any) {
    console.error("[Router Test 1 ERROR]:", e.message);
  }

  // Test 2: DeepSeek V3 via OpenRouter
  try {
    const res2 = await router.executeWithFallback("coding", 6, {
      messages: [{ role: "user", content: "Reply with exactly: DEEPSEEK_ROUTED_OK" }],
      preferredModel: "deepseek/deepseek-chat",
    });
    console.log("[Router Test 2 - DeepSeek]:", {
      text: res2.text,
      modelUsed: res2.modelUsed,
      provider: res2.provider,
      latencyMs: res2.latencyMs,
    });
  } catch (e: any) {
    console.error("[Router Test 2 ERROR]:", e.message);
  }

  // Test 3: Llama 3.3 70B via OpenRouter
  try {
    const res3 = await router.executeWithFallback("reasoning", 6, {
      messages: [{ role: "user", content: "Reply with exactly: LLAMA_ROUTED_OK" }],
      preferredModel: "meta-llama/llama-3.3-70b-instruct",
    });
    console.log("[Router Test 3 - Llama]:", {
      text: res3.text,
      modelUsed: res3.modelUsed,
      provider: res3.provider,
      latencyMs: res3.latencyMs,
    });
  } catch (e: any) {
    console.error("[Router Test 3 ERROR]:", e.message);
  }
}

testModelRouter();
