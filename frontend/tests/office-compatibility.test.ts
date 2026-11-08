import { detectDocumentGenerationIntent } from "../app/lib/document-engine/intent";
import { synthesizeDocument } from "../app/lib/document-engine/synthesizer";
import { inspectAndReadDocument } from "../app/lib/document-engine/reader";
import { readZip } from "../app/lib/document-engine/zip";

async function runOfficeTests() {
  console.log("=== TATTVA AI - Genuine Microsoft Office Compatibility Tests ===");

  const testCases = [
    {
      prompt: "Create an assignment about DBMS",
      expectedFormat: "docx",
      expectedCategory: "document",
    },
    {
      prompt: "Prepare student marks analysis",
      expectedFormat: "xlsx",
      expectedCategory: "spreadsheet",
    },
    {
      prompt: "Create a presentation about AI",
      expectedFormat: "pptx",
      expectedCategory: "presentation",
    },
    {
      prompt: "Create a financial report",
      expectedFormat: "xlsx",
      expectedCategory: "spreadsheet",
    },
    {
      prompt: "Create a question bank on Python",
      expectedFormat: "docx",
      expectedCategory: "document",
    },
    {
      prompt: "Create a resume for software engineer",
      expectedFormat: "docx",
      expectedCategory: "document",
    },
  ];

  for (const tc of testCases) {
    console.log(`\nTesting: "${tc.prompt}"`);
    const intent = detectDocumentGenerationIntent(tc.prompt);
    if (!intent.isDocumentRequest) {
      throw new Error(`Failed: Intent not detected as document request for "${tc.prompt}"`);
    }
    if (intent.format !== tc.expectedFormat) {
      throw new Error(`Failed: Expected format ${tc.expectedFormat}, got ${intent.format}`);
    }
    console.log(`  -> Detected format: ${intent.format}, topic: "${intent.topic}"`);

    // Synthesize binary file
    const generated = await synthesizeDocument(intent);
    if (!generated.success) {
      throw new Error(`Failed: Generation failed for "${tc.prompt}" - ${generated.error}`);
    }
    if (!generated.verifiedOfficeCompatible) {
      throw new Error(`Failed: Office compatibility verification failed for ${generated.filename}`);
    }
    if (generated.sizeBytes < 500) {
      throw new Error(`Failed: File size too small (${generated.sizeBytes} bytes) for ${generated.filename}`);
    }

    // Inspect binary structure
    const base64Data = generated.dataUri.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    const inspection = await inspectAndReadDocument(buffer, generated.filename);

    if (!inspection.success) {
      throw new Error(`Failed: Inspection reported invalid structure for ${generated.filename}: ${inspection.error}`);
    }

    // OPC Spec Check: Verify [Content_Types].xml is the FIRST entry and _rels/.rels is the second entry
    const zipMap = readZip(buffer);
    const zipKeys = Array.from(zipMap.keys());
    if (zipKeys[0] !== "[Content_Types].xml") {
      throw new Error(`Failed OPC packaging: [Content_Types].xml must be entry #1, but found: ${zipKeys[0]}`);
    }
    if (zipKeys[1] !== "_rels/.rels") {
      throw new Error(`Failed OPC packaging: _rels/.rels must be entry #2, but found: ${zipKeys[1]}`);
    }

    if (intent.format === "pptx") {
      const slide1 = zipMap.get("ppt/slides/slide1.xml")?.toString("utf8") || "";
      if (!slide1.includes("<a:prstGeom prst=\"rect\">")) {
        throw new Error(`Failed OpenXML: ppt/slides/slide1.xml is missing explicit <a:prstGeom prst="rect"> shape geometry!`);
      }
      if (!zipMap.has("ppt/slideMasters/slideMaster1.xml")) {
        throw new Error(`Failed OpenXML: Missing ppt/slideMasters/slideMaster1.xml`);
      }
      if (!zipMap.has("ppt/slideLayouts/slideLayout1.xml")) {
        throw new Error(`Failed OpenXML: Missing ppt/slideLayouts/slideLayout1.xml`);
      }
      if (!zipMap.has("ppt/theme/theme1.xml")) {
        throw new Error(`Failed OpenXML: Missing ppt/theme/theme1.xml`);
      }
      if (!zipMap.has("ppt/presProps.xml")) {
        throw new Error(`Failed OpenXML: Missing ppt/presProps.xml`);
      }
      if (!zipMap.has("ppt/viewProps.xml")) {
        throw new Error(`Failed OpenXML: Missing ppt/viewProps.xml`);
      }
      if (!zipMap.has("ppt/tableStyles.xml")) {
        throw new Error(`Failed OpenXML: Missing ppt/tableStyles.xml`);
      }
    }

    console.log(`  -> Verified ${generated.filename} (${generated.sizeBytes} bytes) | Magic bytes: PK\\x03\\x04 | OPC First Entry: [Content_Types].xml | Compatible: TRUE`);
  }

  console.log("\nALL MICROSOFT OFFICE COMPATIBILITY TESTS PASSED SUCCESSFULLY! ✅\n");
}

runOfficeTests().catch((err) => {
  console.error("Office compatibility test failed:", err);
  process.exit(1);
});
