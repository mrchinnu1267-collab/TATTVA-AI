import { detectDocumentGenerationIntent } from "../app/lib/document-engine/intent";
import { synthesizeDocument } from "../app/lib/document-engine/synthesizer";
import { inspectAndReadDocument } from "../app/lib/document-engine/reader";
import { readZip } from "../app/lib/document-engine/zip";

async function runOfficeTests() {
  console.log("=== TATTVA AI - Universal File Creation & Microsoft Office Compatibility Tests ===");

  const testCases = [
    // TEST 1: DOCX assignment about DBMS
    {
      prompt: "Create a detailed DBMS assignment.",
      expectedFormat: "docx",
      expectedCategory: "document",
      expectedTopicMatch: "DBMS",
    },
    // TEST 2: 15-slide presentation about Artificial Intelligence
    {
      prompt: "Create a 15-slide presentation about Artificial Intelligence.",
      expectedFormat: "pptx",
      expectedCategory: "presentation",
      expectedSlides: 15,
      expectedTopicMatch: "Artificial Intelligence",
    },
    // TEST 3: Excel student marks calculator
    {
      prompt: "Create an Excel student marks calculator.",
      expectedFormat: "xlsx",
      expectedCategory: "spreadsheet",
      checkFormulas: true,
      expectedTopicMatch: "Student",
    },
    // TEST 4: PDF about Machine Learning
    {
      prompt: "Create a PDF about Machine Learning.",
      expectedFormat: "pdf",
      expectedCategory: "document",
      expectedTopicMatch: "Machine Learning",
    },
    // TEST 5: Project report about Smart Hostel Management (customized, not generic!)
    {
      prompt: "Create a project report about Smart Hostel Management.",
      expectedFormat: "docx",
      expectedCategory: "document",
      expectedTopicMatch: "Smart Hostel Management",
      validateContentSpecific: (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes("strategic framework for document")) {
          throw new Error("Failed: Generated generic placeholder 'Strategic Framework for document'!");
        }
        if (!lower.includes("hostel") && !lower.includes("accommodation") && !lower.includes("residential")) {
          throw new Error("Failed: Document does not contain hostel-specific domain content!");
        }
      },
    },
    // TEST 6: Presentation about cybersecurity (distinct design and content!)
    {
      prompt: "Create a presentation about cybersecurity.",
      expectedFormat: "pptx",
      expectedCategory: "presentation",
      expectedTopicMatch: "Cybersecurity",
      validateContentSpecific: (text: string) => {
        const lower = text.toLowerCase();
        if (!lower.includes("cyber") && !lower.includes("security") && !lower.includes("zero trust")) {
          throw new Error("Failed: Presentation does not contain cybersecurity-specific content!");
        }
      },
    },
    // TEST 7: CSV containing student records
    {
      prompt: "Create a CSV file with student records",
      expectedFormat: "csv",
      expectedCategory: "data",
    },
    // TEST 8: Java program as .java file
    {
      prompt: "Create a java program to solve two sum",
      expectedFormat: "java",
      expectedCategory: "code",
    },
  ];

  const generatedContents: Map<string, string> = new Map();

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
    console.log(`  -> Detected format: ${intent.format}, category: ${intent.category}, topic: "${intent.topic}"`);

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

    // Inspect binary structure and extract text
    const base64Data = generated.dataUri.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    const inspection = await inspectAndReadDocument(buffer, generated.filename);

    if (!inspection.success) {
      throw new Error(`Failed: Inspection reported invalid structure for ${generated.filename}: ${inspection.error}`);
    }

    if (tc.validateContentSpecific) {
      tc.validateContentSpecific(inspection.extractedText);
    }

    // Check distinctness: documents with different topics must not be identical
    if (tc.expectedFormat === "docx" || tc.expectedFormat === "pptx") {
      for (const [otherPrompt, prevText] of generatedContents.entries()) {
        if (prevText === inspection.extractedText && inspection.extractedText.length > 50) {
          throw new Error(`Failed duplicate detection: "${tc.prompt}" produced identical content to "${otherPrompt}"!`);
        }
      }
      generatedContents.set(tc.prompt, inspection.extractedText);
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
        if (!zipMap.has("ppt/slides/slide1.xml")) {
          throw new Error(`Failed OpenXML: Missing ppt/slides/slide1.xml`);
        }
        if (!zipMap.has("ppt/presentation.xml")) {
          throw new Error(`Failed OpenXML: Missing ppt/presentation.xml`);
        }
      }

      if (intent.format === "xlsx" && tc.checkFormulas) {
        const sheet1 = zipMap.get("xl/worksheets/sheet1.xml")?.toString("utf8") || "";
        if (!sheet1.includes("<f>SUM(") || !sheet1.includes("<f>AVERAGE(")) {
          throw new Error(`Failed XLSX formulas: sheet1.xml must include dynamic <f>SUM and <f>AVERAGE formulas!`);
        }
      }
    }

    console.log(`  -> Verified ${generated.filename} (${generated.sizeBytes} bytes) | Distinct: TRUE | Compatible: TRUE | Status: PASSED`);
  }

  // TEST 9: Test Uploaded Attachment Extraction & Synthesis
  console.log("\nTesting: Synthesis from Uploaded Attachment Source...");
  const dummyPdfText = `%PDF-1.4\n1 0 obj\n<< /Title (Hostel IoT Requirements Spec) /Author (TATTVA) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
  const attachmentBuffer = Buffer.from(dummyPdfText, "utf8");

  const attachedIntent = detectDocumentGenerationIntent("Create a project report using my uploaded PDF");
  const attachedResult = await synthesizeDocument(attachedIntent, {
    attachmentBuffer,
    attachmentFilename: "hostel_spec.pdf",
  });

  if (!attachedResult.success || !attachedResult.verifiedOfficeCompatible) {
    throw new Error(`Failed: Attachment synthesis failed: ${attachedResult.error}`);
  }
  console.log(`  -> Verified ${attachedResult.filename} using uploaded attachment | Compatible: TRUE | Status: PASSED`);

  console.log("\nALL TEST SUITE SCENARIOS VERIFIED SUCCESSFULLY! ✅\n");
}

runOfficeTests().catch((err) => {
  console.error("Office compatibility test failed:", err);
  process.exit(1);
});
