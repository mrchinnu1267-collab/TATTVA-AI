import { detectDocumentGenerationIntent } from "../app/lib/document-engine/intent";
import { synthesizeDocument } from "../app/lib/document-engine/synthesizer";
import { inspectAndReadDocument } from "../app/lib/document-engine/reader";
import { readZip } from "../app/lib/document-engine/zip";

async function runOfficeTests() {
  console.log("=== TATTVA AI - Universal File Creation & Microsoft Office Compatibility Tests ===");

  const testCases = [
    // 1. DOCX assignment about DBMS
    {
      prompt: "Create an assignment about DBMS",
      expectedFormat: "docx",
      expectedCategory: "document",
    },
    // 2. 15-slide presentation about Artificial Intelligence
    {
      prompt: "Create a 15-slide presentation about Artificial Intelligence",
      expectedFormat: "pptx",
      expectedCategory: "presentation",
      expectedSlides: 15,
    },
    // 3. XLSX student marks calculator with formulas
    {
      prompt: "Prepare student marks analysis",
      expectedFormat: "xlsx",
      expectedCategory: "spreadsheet",
      checkFormulas: true,
    },
    // 4. PDF research report about Machine Learning
    {
      prompt: "Create a research report about Machine Learning in PDF",
      expectedFormat: "pdf",
      expectedCategory: "document",
    },
    // 5. CSV containing student records
    {
      prompt: "Create a CSV file with student records",
      expectedFormat: "csv",
      expectedCategory: "data",
    },
    // 6. Java program as .java file
    {
      prompt: "Create a java program to solve two sum",
      expectedFormat: "java",
      expectedCategory: "code",
    },
    // 7. Technical flag stripping: ensure prompts with [Mode: ...] are cleaned
    {
      prompt: "[Mode: Web Search & Fact Retrieval]: mashroom presentation",
      expectedFormat: "pptx",
      expectedCategory: "presentation",
      cleanTitleCheck: true,
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
    if (tc.expectedSlides && intent.requestedSlideCount !== tc.expectedSlides) {
      throw new Error(`Failed: Expected slide count ${tc.expectedSlides}, got ${intent.requestedSlideCount}`);
    }
    if (tc.cleanTitleCheck) {
      if (intent.topic.toLowerCase().includes("mode") || intent.topic.toLowerCase().includes("web_search")) {
        throw new Error(`Failed: Technical prompt flag was not stripped from topic: "${intent.topic}"`);
      }
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
    if (generated.sizeBytes < 50) {
      throw new Error(`Failed: File size too small (${generated.sizeBytes} bytes) for ${generated.filename}`);
    }
    if (tc.expectedSlides && generated.pageOrSlideCount !== tc.expectedSlides) {
      throw new Error(`Failed: Expected ${tc.expectedSlides} slides in generated payload, got ${generated.pageOrSlideCount}`);
    }

    // Inspect binary structure
    const base64Data = generated.dataUri.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    const inspection = await inspectAndReadDocument(buffer, generated.filename);

    if (!inspection.success) {
      throw new Error(`Failed: Inspection reported invalid structure for ${generated.filename}: ${inspection.error}`);
    }

    // Office OpenXML checks (DOCX, XLSX, PPTX)
    if (["docx", "xlsx", "pptx"].includes(intent.format)) {
      const zipMap = readZip(buffer);
      const zipKeys = Array.from(zipMap.keys());

      // OPC Spec Check: [Content_Types].xml MUST be entry #1, _rels/.rels MUST be entry #2
      if (zipKeys[0] !== "[Content_Types].xml") {
        throw new Error(`Failed OPC packaging: [Content_Types].xml must be entry #1, but found: ${zipKeys[0]}`);
      }
      if (zipKeys[1] !== "_rels/.rels") {
        throw new Error(`Failed OPC packaging: _rels/.rels must be entry #2, but found: ${zipKeys[1]}`);
      }

      if (intent.format === "pptx") {
        const slide1 = zipMap.get("ppt/slides/slide1.xml")?.toString("utf8") || "";
        // Strict Android Check 1: Explicit preset geometry on shapes
        if (!slide1.includes("<a:prstGeom prst=\"rect\">")) {
          throw new Error(`Failed OpenXML: ppt/slides/slide1.xml is missing explicit <a:prstGeom prst="rect"> shape geometry!`);
        }
        // Strict Android Check 2: No orphan placeholders pointing to non-existent layout placeholders
        if (slide1.includes("<p:ph type=\"title\"") || slide1.includes("<p:ph idx=\"1\"")) {
          throw new Error(`Failed OpenXML: ppt/slides/slide1.xml contains orphan <p:ph> placeholder that causes Android PowerPoint to crash!`);
        }
        // Strict Android Check 3: Slide Master and Layout existence
        if (!zipMap.has("ppt/slideMasters/slideMaster1.xml")) {
          throw new Error(`Failed OpenXML: Missing ppt/slideMasters/slideMaster1.xml`);
        }
        if (!zipMap.has("ppt/slideLayouts/slideLayout1.xml")) {
          throw new Error(`Failed OpenXML: Missing ppt/slideLayouts/slideLayout1.xml`);
        }
        if (!zipMap.has("ppt/theme/theme1.xml")) {
          throw new Error(`Failed OpenXML: Missing ppt/theme/theme1.xml`);
        }
        // Strict Android Check 4: SlideMaster contains lvl1pPr in txStyles
        const masterXml = zipMap.get("ppt/slideMasters/slideMaster1.xml")?.toString("utf8") || "";
        if (!masterXml.includes("<a:lvl1pPr")) {
          throw new Error(`Failed OpenXML: ppt/slideMasters/slideMaster1.xml is missing <a:lvl1pPr> in text styles hierarchy!`);
        }
      }

      if (intent.format === "xlsx" && tc.checkFormulas) {
        const sheet1 = zipMap.get("xl/worksheets/sheet1.xml")?.toString("utf8") || "";
        if (!sheet1.includes("<f>SUM(") || !sheet1.includes("<f>AVERAGE(")) {
          throw new Error(`Failed XLSX formulas: sheet1.xml must include dynamic <f>SUM and <f>AVERAGE formulas!`);
        }
      }
    }

    console.log(`  -> Verified ${generated.filename} (${generated.sizeBytes} bytes) | Compatible: TRUE | Status: PASSED`);
  }

  // 8. Test Uploaded Attachment Extraction & Synthesis
  console.log("\nTesting: Synthesis from Uploaded Attachment Source...");
  const dummyPdfText = `%PDF-1.4\n1 0 obj\n<< /Title (Project Requirements Document) /Author (TATTVA) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
  const attachmentBuffer = Buffer.from(dummyPdfText, "utf8");

  const attachedIntent = detectDocumentGenerationIntent("Create a project report using my uploaded PDF");
  const attachedResult = await synthesizeDocument(attachedIntent, {
    attachmentBuffer,
    attachmentFilename: "requirements_spec.pdf",
  });

  if (!attachedResult.success || !attachedResult.verifiedOfficeCompatible) {
    throw new Error(`Failed: Attachment synthesis failed: ${attachedResult.error}`);
  }
  console.log(`  -> Verified ${attachedResult.filename} using uploaded attachment | Compatible: TRUE | Status: PASSED`);

  console.log("\nALL 8 MANDATORY UNIVERSAL FILE GENERATION TESTS PASSED SUCCESSFULLY! ✅\n");
}

runOfficeTests().catch((err) => {
  console.error("Office compatibility test failed:", err);
  process.exit(1);
});
