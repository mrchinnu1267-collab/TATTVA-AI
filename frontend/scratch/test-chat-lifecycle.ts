import { aiOrchestrator } from "../app/lib/ai-orchestrator";
import { detectDocumentIntent } from "../app/lib/document-engine/intent";
import { classifyIntent } from "../app/lib/ai-orchestrator/intent-classifier";

async function main() {
  console.log("=== Testing HTML UI Code-Generation Request Lifecycle ===");

  const testPrompts = [
    "Create an interactive single-file HTML/CSS/JS dashboard with dark mode and chart for crypto trading",
    "generate an HTML UI code-generation request",
    "build an interactive HTML dashboard",
    "can you make a single page html application with controls"
  ];

  for (const prompt of testPrompts) {
    console.log("\n--------------------------------------------------");
    console.log("Prompt:", prompt);
    const start = Date.now();

    // 1. Detect Document Intent
    const docIntent = detectDocumentIntent(prompt);
    console.log("Document Intent:", {
      isDocumentRequest: docIntent.isDocumentRequest,
      archetype: docIntent.archetype,
      format: docIntent.format,
      topic: docIntent.topic,
    });

    // 2. Classify Intent
    const taskIntent = await classifyIntent(prompt, false, false);
    console.log("Task Intent:", taskIntent.primaryIntent, "complexity:", taskIntent.complexityScore);

    // 3. Process Request through Orchestrator
    try {
      const res = await aiOrchestrator.processRequest({
        messages: [{ role: "user", content: prompt }],
        context: {
          userId: "test_user_id",
          userEmail: "test@tattva.ai",
          asyncImageJob: true,
        },
        mode: "chat",
      });
      console.log(`Success in ${Date.now() - start}ms:`, {
        role: res.role,
        kind: res.kind,
        intent: res.intent,
        modelUsed: res.modelUsed,
        contentLength: res.content?.length,
        hasGeneratedDocument: Boolean(res.generatedDocument),
      });
    } catch (err: any) {
      console.error(`FAILED in ${Date.now() - start}ms:`, err?.message || err);
    }
  }
}

main().catch(console.error);
