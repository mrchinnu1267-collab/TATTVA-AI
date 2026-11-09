import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  console.log("=== TATTVA PRESENTATION STUDIO VERIFICATION SUITE ===");

  // 1. Test Model Resolution & Speed
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log("Testing gemini-3.5-flash-lite connectivity...");
  const t0 = Date.now();
  const testRes = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: "Respond with the word OK",
  });
  console.log(`✓ Gemini response received in ${Date.now() - t0}ms:`, testRes.text?.trim());

  // 2. Test Document Engine Synthesizer for 5 Slides Presentation
  console.log("\nTesting autonomous topic research and slide synthesis for 'Agentic AI' (5 slides)...");
  const { detectDocumentIntent, synthesizeResearchToFile } = await import("../app/lib/document-engine/index.ts");

  const intent = detectDocumentIntent("Create a ppt on agentic ai with 5 slides", {
    hasAttachments: false,
    inChatConversation: true,
  });

  console.log("Detected intent:", {
    topic: intent.topic,
    archetype: intent.archetype,
    format: intent.format,
    slideCount: intent.length.slideCount,
  });

  if (intent.length.slideCount !== 5) {
    throw new Error(`Expected 5 slides requested, got ${intent.length.slideCount}`);
  }

  const tStart = Date.now();
  const pkg = await synthesizeResearchToFile(intent, {
    apiKey: process.env.GEMINI_API_KEY,
    userId: "test_suite_user",
  });
  const durationMs = Date.now() - tStart;
  console.log(`✓ Synthesis completed in ${durationMs}ms`);

  console.log(`Document format: .${pkg.document.format}`);
  console.log(`File size: ${pkg.document.sizeBytes} bytes`);
  console.log(`Slides generated count: ${pkg.slides?.length}`);

  if (!pkg.slides || pkg.slides.length !== 5) {
    throw new Error(`Expected exactly 5 slides, got ${pkg.slides?.length}`);
  }

  // Inspect slide contents to ensure NO planning notes or markdown artifacts
  pkg.slides.forEach((s, idx) => {
    console.log(`\nSlide ${idx + 1}: [${s.category}] ${s.title}`);
    console.log(`  Bullets (${s.bullets.length}):`);
    s.bullets.forEach((b) => console.log(`   - ${b.slice(0, 80)}...`));
    console.log(`  Takeaway: ${s.takeaway?.slice(0, 80)}...`);
    console.log(`  Notes: ${s.notes?.slice(0, 80)}...`);

    if (s.title.includes("**") || s.title.includes("Presentation Structure")) {
      throw new Error(`Slide ${idx + 1} contains markdown symbols or planning notes: ${s.title}`);
    }
    s.bullets.forEach((b) => {
      if (b.includes("**Presentation Structure")) {
        throw new Error(`Slide ${idx + 1} bullet contains planning notes: ${b}`);
      }
    });
  });

  // Verify buffer with Python PPTX and OpenXML ZipFile
  console.log("\nVerifying PPTX buffer via OpenXML ZipFile and python-pptx...");
  const { validateDocumentBuffer } = await import("../app/lib/document-engine/validator.ts");
  const validation = validateDocumentBuffer(pkg.document.buffer, "pptx", 5);
  console.log("Validation report:", validation);

  if (!validation.valid) {
    throw new Error(`PPTX binary validation failed: ${validation.error}`);
  }

  console.log("\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});

