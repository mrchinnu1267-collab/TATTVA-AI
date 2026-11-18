import { modelRouter } from "../app/lib/ai-orchestrator/model-router.ts";

async function testModels() {
  console.log("Testing executeWithFallback...");
  try {
    const res = await modelRouter.executeWithFallback("reasoning", 7, {
      messages: [{ role: "user", content: "A bat and ball cost 1.10. Bat costs 1.00 more than ball. Ball cost?" }],
      timeoutMs: 25000,
    });
    console.log("SUCCESS:", res.modelUsed, "Output:", res.text);
    console.log("Warnings:", res.warnings);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

testModels();
