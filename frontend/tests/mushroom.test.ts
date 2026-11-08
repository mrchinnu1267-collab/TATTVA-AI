import assert from "node:assert/strict";
import { detectDocumentGenerationIntent, stripTechnicalModePrefixes } from "../app/lib/document-engine/intent";
import { synthesizeDocument } from "../app/lib/document-engine/synthesizer";
import { validatePptxWithPython } from "../app/lib/document-engine/python-bridge";

async function runMushroomTest() {
  console.log("\n🧪 Running Mushroom & Mode Sanitization PPTX Verification Test...\n");

  // 1. Test stripTechnicalModePrefixes directly
  const rawStr = "_mode_web_search_fact_retrieval_mashroom";
  const cleaned = stripTechnicalModePrefixes(rawStr);
  console.log("1. Stripping technical mode prefix:", rawStr, "->", cleaned);
  assert.equal(cleaned, "mashroom");

  // 2. Test intent detection with technical prefix
  const intent = detectDocumentGenerationIntent("[Mode: Web Search & Fact Retrieval]: create a ppt on mashroom");
  console.log("2. Detected Intent:", { format: intent.format, topic: intent.topic, category: intent.category });
  assert.equal(intent.format, "pptx");
  assert.equal(intent.topic.toLowerCase().includes("mode"), false);
  assert.equal(intent.topic.toLowerCase().includes("search"), false);
  assert.equal(intent.topic.toLowerCase().includes("mashroom"), true);

  // 3. Test document synthesis
  console.log("3. Synthesizing PPTX document...");
  const doc = await synthesizeDocument(intent);
  console.log("Synthesized Document:", {
    filename: doc.filename,
    title: doc.title,
    format: doc.format,
    sizeBytes: doc.sizeBytes,
    verified: doc.verifiedOfficeCompatible,
  });

  assert.equal(doc.filename.includes("mode"), false);
  assert.equal(doc.filename.includes("web_search"), false);
  assert.equal(doc.filename.endsWith(".pptx"), true);
  assert.equal(doc.sizeBytes > 20000, true);

  // 4. Validate PPTX with native python-pptx
  const buf = Buffer.from(doc.dataUri.split(",")[1], "base64");
  const validation = validatePptxWithPython(buf);
  console.log("4. Python PPTX Validation:", validation);
  assert.equal(validation.valid, true);

  console.log("\n✅ Mushroom & Mode Sanitization PPTX Verification Test PASSED!\n");
}

runMushroomTest().catch((err) => {
  console.error("Mushroom test failed:", err);
  process.exit(1);
});
