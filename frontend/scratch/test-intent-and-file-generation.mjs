/**
 * TATTVA AI - Comprehensive Intent Understanding & File Generation Validation Test Suite
 * Tests 35 distinct scenarios across:
 * - Simple file creation across formats (PDF, DOCX, PPTX, XLSX, CSV, TXT, MD)
 * - Complex multi-page documents (Research report, Resume, Poster, Project Documentation, Diagrams)
 * - Typo tolerance & misspelling resilience
 * - Conversational phrasing without explicit command verbs
 * - Multi-turn conversation context & pronouns ("this", "it", "previous file")
 * - Specific user instructions ("Make it more professional", "Use previous file as reference",
 *   "Don't remove any content", "Convert this into PDF", "Change only first page",
 *   "Recreate like reference", "Add more images", "Keep file size below 10 MB")
 * - Ambiguity handling & single clarification questions
 * - Multi-step instructions
 * - Uploaded attachment context extraction
 * - Binary file structure validation, magic bytes, and non-corruption checks
 */

import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const jiti = require("../node_modules/jiti/lib/jiti.cjs")(import.meta.url);

const { detectDocumentIntent, synthesizeResearchToFile, validateDocumentBuffer } = jiti("../app/lib/document-engine");

async function runAllTests() {
  console.log("===============================================================================");
  console.log("     TATTVA AI - 35-SCENARIO INTENT & FILE GENERATION TEST SUITE");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  function record(scenarioNum, name, condition, details = "") {
    if (condition) {
      console.log(`✓ Scenario ${scenarioNum} PASSED: ${name}`);
      passed++;
    } else {
      console.error(`✗ Scenario ${scenarioNum} FAILED: ${name} -> ${details}`);
      failed++;
    }
  }

  // --- 1. SIMPLE FILE CREATION ACROSS FORMATS ---
  const s1 = detectDocumentIntent("generate a pdf on cybersecurity fundamentals");
  record(1, "Simple PDF Creation", s1.isDocumentRequest && s1.format === "pdf" && s1.topic.includes("Cybersecurity"), `Got: format=${s1.format}, topic=${s1.topic}`);

  const s2 = detectDocumentIntent("create a word document about machine learning architectures");
  record(2, "Simple Word DOCX Creation", s2.isDocumentRequest && s2.format === "docx" && s2.topic.includes("Machine Learning"), `Got: format=${s2.format}, topic=${s2.topic}`);

  const s3 = detectDocumentIntent("prepare a 5-slide presentation on renewable energy technologies");
  record(3, "Simple PPTX Presentation (5 slides)", s3.isDocumentRequest && s3.format === "pptx" && s3.length.slideCount === 5 && s3.topic.includes("Renewable Energy"), `Got: format=${s3.format}, slides=${s3.length.slideCount}, topic=${s3.topic}`);

  const s4 = detectDocumentIntent("create an excel sheet of monthly office budget");
  record(4, "Simple Excel Spreadsheet", s4.isDocumentRequest && s4.format === "xlsx" && s4.archetype === "spreadsheet", `Got: format=${s4.format}, archetype=${s4.archetype}`);

  const s5 = detectDocumentIntent("generate a csv file of top tech companies by revenue");
  record(5, "CSV File Generation", s5.isDocumentRequest && s5.format === "csv", `Got: format=${s5.format}`);

  const s6 = detectDocumentIntent("give me a txt file summarizing quantum computing principles");
  record(6, "Plain Text (.txt) File Generation", s6.isDocumentRequest && s6.format === "txt", `Got: format=${s6.format}`);

  const s7 = detectDocumentIntent("create a markdown document on docker containerization");
  record(7, "Markdown (.md) File Generation", s7.isDocumentRequest && s7.format === "md", `Got: format=${s7.format}`);

  // --- 2. COMPLEX & SPECIALIZED DOCUMENT ARCHETYPES ---
  const s8 = detectDocumentIntent("draft a comprehensive technical research report on nuclear fusion reactors");
  record(8, "Complex Technical Research Report", s8.isDocumentRequest && s8.archetype === "research_report" && s8.length.depth === "comprehensive", `Got: archetype=${s8.archetype}, depth=${s8.length.depth}`);

  const s9 = detectDocumentIntent("create a resume for a senior full stack developer with 7 years experience");
  record(9, "Professional Resume Generation", s9.isDocumentRequest && s9.archetype === "resume" && (s9.format === "docx" || s9.format === "pdf"), `Got: archetype=${s9.archetype}, format=${s9.format}`);

  const s10 = detectDocumentIntent("make a poster for an international AI summit 2026");
  record(10, "Event Poster Generation", s10.isDocumentRequest && s10.archetype === "poster", `Got: archetype=${s10.archetype}`);

  const s11 = detectDocumentIntent("create an assignment on operating system process scheduling algorithms");
  record(11, "Academic Assignment Generation", s11.isDocumentRequest && s11.archetype === "assignment" && s11.audience === "academic", `Got: archetype=${s11.archetype}, audience=${s11.audience}`);

  const s12 = detectDocumentIntent("write project documentation for an e-commerce microservices platform");
  record(12, "Project Documentation Generation", s12.isDocumentRequest && s12.archetype === "project_documentation" && s12.audience === "technical", `Got: archetype=${s12.archetype}, audience=${s12.audience}`);

  const s13 = detectDocumentIntent("generate a flowchart and system diagram for payment processing");
  record(13, "Flowchart & System Diagram", s13.isDocumentRequest && s13.archetype === "chart_diagram", `Got: archetype=${s13.archetype}`);

  // --- 3. TYPO TOLERANCE & MISSPELLING RESILIENCE ---
  const s14 = detectDocumentIntent("cretae a presenation on artificial intelligence");
  record(14, "Typo in Verb & Format (cretae presenation)", s14.isDocumentRequest && s14.format === "pptx" && s14.topic.includes("Artificial Intelligence"), `Got: format=${s14.format}, topic=${s14.topic}`);

  const s15 = detectDocumentIntent("mak an excl sheet of product sales");
  record(15, "Typo in Verb & Spreadsheet (mak excl)", s15.isDocumentRequest && s15.format === "xlsx" && s15.archetype === "spreadsheet", `Got: format=${s15.format}, archetype=${s15.archetype}`);

  const s16 = detectDocumentIntent("generte a doxc reprt about climate change");
  record(16, "Typo in Verb, Word & Report (generte doxc reprt)", s16.isDocumentRequest && s16.format === "docx", `Got: format=${s16.format}`);

  const s17 = detectDocumentIntent("mak a pfd on cloud security");
  record(17, "Typo in PDF (mak a pfd)", s17.isDocumentRequest && s17.format === "pdf" && s17.topic.includes("Cloud Security"), `Got: format=${s17.format}, topic=${s17.topic}`);

  // --- 4. CONVERSATIONAL PHRASING WITHOUT ACTION VERBS ---
  const s18 = detectDocumentIntent("8 slides on agentic ai");
  record(18, "Conversational Slide Count ('8 slides on agentic ai')", s18.isDocumentRequest && s18.format === "pptx" && s18.length.slideCount === 8 && s18.topic.includes("Agentic AI"), `Got: format=${s18.format}, slides=${s18.length.slideCount}, topic=${s18.topic}`);

  const s19 = detectDocumentIntent("spreadsheet for quarterly sales performance");
  record(19, "Conversational Spreadsheet ('spreadsheet for quarterly sales...')", s19.isDocumentRequest && (s19.format === "xlsx" || s19.format === "csv"), `Got: format=${s19.format}`);

  const s20 = detectDocumentIntent("presentation on deep learning architectures");
  record(20, "Conversational Presentation ('presentation on deep learning...')", s20.isDocumentRequest && s18.format === "pptx", `Got: format=${s20.format}`);

  // --- 5. MULTI-TURN CONVERSATION CONTEXT & REVISIONS ---
  const mockPrevPresentation = {
    id: "prev_ppt_1",
    title: "Cloud Migration Strategy",
    topic: "Cloud Migration Strategy",
    format: "pptx",
    archetype: "presentation",
    slides: [
      { number: 1, title: "Cloud Migration Overview", bullets: ["Lift and shift vs refactor"] },
      { number: 2, title: "Architecture & Tools", bullets: ["AWS, GCP, Kubernetes"] },
      { number: 3, title: "Cost & Governance", bullets: ["FinOps, tagging"] },
    ],
  };

  const s21 = detectDocumentIntent("Create a PDF on this.", {
    history: [
      { role: "user", content: "What is Kubernetes and why is it important?" },
      { role: "assistant", content: "Kubernetes is an open-source container orchestration platform designed to automate deploying, scaling, and operating application containers." },
    ],
  });
  record(21, "Multi-turn Inquiry Followed by 'Create a PDF on this.'", s21.isDocumentRequest && s21.format === "pdf" && s21.topic.toLowerCase().includes("kubernetes"), `Got: format=${s21.format}, topic=${s21.topic}`);

  const s22 = detectDocumentIntent("Make it more professional.", {
    history: [
      { role: "user", content: "prepare a presentation on Cloud Migration Strategy" },
      { role: "assistant", content: "Your presentation on Cloud Migration Strategy is ready.", generatedDocument: mockPrevPresentation },
    ],
  });
  record(22, "Multi-turn Revision: 'Make it more professional.'", s22.isDocumentRequest && s22.isRevision && s22.revisionDirectives?.makeMoreProfessional && s22.audience === "business" && s22.topic.includes("Cloud Migration"), `Got: isRevision=${s22.isRevision}, audience=${s22.audience}, topic=${s22.topic}`);

  const s23 = detectDocumentIntent("Convert this into PDF.", {
    history: [
      { role: "user", content: "create a word doc on Cyber Defense Mechanisms" },
      { role: "assistant", content: "Your document on Cyber Defense Mechanisms is ready.", generatedDocument: { topic: "Cyber Defense Mechanisms", format: "docx" } },
    ],
  });
  record(23, "Multi-turn Format Conversion: 'Convert this into PDF.'", s23.isDocumentRequest && s23.format === "pdf" && s23.topic.includes("Cyber Defense"), `Got: format=${s23.format}, topic=${s23.topic}`);

  const s24 = detectDocumentIntent("Change only the first page.", {
    history: [
      { role: "user", content: "prepare presentation on Cloud Migration Strategy" },
      { role: "assistant", content: "Your presentation on Cloud Migration Strategy is ready.", generatedDocument: mockPrevPresentation },
    ],
  });
  record(24, "Multi-turn Directive: 'Change only the first page.'", s24.isDocumentRequest && s24.isRevision && (s24.revisionDirectives?.changeOnlyFirstPage || s24.revisionDirectives?.targetSlide === 1), `Got: changeOnlyFirstPage=${s24.revisionDirectives?.changeOnlyFirstPage}, targetSlide=${s24.revisionDirectives?.targetSlide}`);

  const s25 = detectDocumentIntent("Add modern industry examples but don't remove any content.", {
    history: [
      { role: "user", content: "prepare presentation on Cloud Migration Strategy" },
      { role: "assistant", content: "Your presentation on Cloud Migration Strategy is ready.", generatedDocument: mockPrevPresentation },
    ],
  });
  record(25, "Multi-turn Directive: 'Don't remove any content.'", s25.isDocumentRequest && s25.revisionDirectives?.preserveAllContent, `Got: preserveAllContent=${s25.revisionDirectives?.preserveAllContent}`);

  const s26 = detectDocumentIntent("Use the previous file as a reference to create an executive presentation.", {
    history: [
      { role: "user", content: "Here is the architectural review" },
      { role: "assistant", content: "Your document on System Architecture is ready.", generatedDocument: { topic: "System Architecture", format: "docx" } },
    ],
  });
  record(26, "Reference Directive: 'Use the previous file as a reference.'", s26.isDocumentRequest && s26.revisionDirectives?.useReference, `Got: useReference=${s26.revisionDirectives?.useReference}`);

  const s27 = detectDocumentIntent("Recreate it like the reference.", {
    history: [
      { role: "user", content: "Here is my template" },
      { role: "assistant", content: "Your document on Quarterly Plan is ready.", generatedDocument: { topic: "Quarterly Plan", format: "docx" } },
    ],
  });
  record(27, "Reference Directive: 'Recreate it like the reference.'", s27.isDocumentRequest && s27.revisionDirectives?.recreateLikeReference, `Got: recreateLikeReference=${s27.revisionDirectives?.recreateLikeReference}`);

  const s28 = detectDocumentIntent("Add more images and diagrams to the slides.", {
    history: [
      { role: "user", content: "prepare presentation on Cloud Migration" },
      { role: "assistant", content: "Your presentation on Cloud Migration is ready.", generatedDocument: mockPrevPresentation },
    ],
  });
  record(28, "Visual Enhancement: 'Add more images and diagrams.'", s28.isDocumentRequest && s28.revisionDirectives?.addMoreImages, `Got: addMoreImages=${s28.revisionDirectives?.addMoreImages}`);

  const s29 = detectDocumentIntent("Create a PDF on distributed systems and keep the file size below 10 MB.");
  record(29, "Constraint Directive: 'Keep the file size below 10 MB.'", s29.isDocumentRequest && s29.revisionDirectives?.maxSizeBytes === 10485760, `Got: maxSizeBytes=${s29.revisionDirectives?.maxSizeBytes}`);

  // --- 6. AMBIGUITY HANDLING & CLARIFICATION ---
  const s30 = detectDocumentIntent("create a file");
  record(30, "Ambiguous Command without Context ('create a file')", s30.needsClarification && s30.clarificationQuestion?.includes("What specific topic"), `Got: needsClarification=${s30.needsClarification}, question=${s30.clarificationQuestion}`);

  const s31 = detectDocumentIntent("generate it");
  record(31, "Ambiguous Pronoun without Context ('generate it')", s31.needsClarification && Boolean(s31.clarificationQuestion), `Got: needsClarification=${s31.needsClarification}`);

  // --- 7. MULTI-STEP INSTRUCTIONS ---
  const s32 = detectDocumentIntent("First explain transformer models, then create an 8 slide presentation on it with speaker notes");
  record(32, "Multi-step Instruction (Explain + 8 Slide PPT)", s32.isDocumentRequest && s32.format === "pptx" && s32.length.slideCount === 8 && s32.topic.includes("Transformer"), `Got: format=${s32.format}, slides=${s32.length.slideCount}, topic=${s32.topic}`);

  // --- 8. UPLOADED ATTACHMENT CONTEXT ---
  const s33 = detectDocumentIntent("Create a presentation based on this file.", {
    history: [
      {
        role: "user",
        content: "Attached is our Q3 financial audit.",
        attachments: [{ name: "Q3_Financial_Audit.pdf", type: "application/pdf" }],
      },
    ],
  });
  record(33, "Uploaded Attachment Context Extraction", s33.isDocumentRequest && s33.format === "pptx" && s33.topic.includes("Q3 Financial Audit"), `Got: format=${s33.format}, topic=${s33.topic}`);

  // --- 9. CONVERSATIONAL INQUIRY GUARD ---
  const s35 = detectDocumentIntent("How does a neural network work?");
  record(35, "Conversational Inquiry Guard ('How does a neural network work?')", !s35.isDocumentRequest, `Got: isDocumentRequest=${s35.isDocumentRequest}`);

  // --- 10. REAL FILE GENERATION & VALIDATION PIPELINE ---
  console.log("\n--- EXECUTING REAL FILE GENERATION & STRUCTURAL VALIDATION PIPELINE ---");
  try {
    // Generate actual files for key archetypes and formats
    const pptIntent = detectDocumentIntent("create a 4-slide presentation on Artificial Intelligence");
    const pptPkg = await synthesizeResearchToFile(pptIntent);
    const pptVal = validateDocumentBuffer(pptPkg.document.buffer, "pptx", 4);
    assert.ok(pptVal.valid, `PPTX buffer validation failed: ${pptVal.error}`);
    assert.ok(pptPkg.vault.signedUrl, "PPTX download URL exists");
    console.log(`  ✓ Generated authentic PPTX (${pptPkg.document.sizeBytes} bytes) - Validated OpenXML structure`);

    const pdfIntent = detectDocumentIntent("generate a pdf report on Cybersecurity");
    const pdfPkg = await synthesizeResearchToFile(pdfIntent);
    const pdfVal = validateDocumentBuffer(pdfPkg.document.buffer, "pdf");
    assert.ok(pdfVal.valid, `PDF buffer validation failed: ${pdfVal.error}`);
    assert.ok(pdfPkg.vault.signedUrl, "PDF download URL exists");
    console.log(`  ✓ Generated authentic PDF (${pdfPkg.document.sizeBytes} bytes) - Validated PDF header & trailer`);

    const docxIntent = detectDocumentIntent("create a resume for Senior Cloud Architect");
    const docxPkg = await synthesizeResearchToFile(docxIntent);
    const docxVal = validateDocumentBuffer(docxPkg.document.buffer, "docx");
    assert.ok(docxVal.valid, `DOCX buffer validation failed: ${docxVal.error}`);
    assert.ok(docxPkg.vault.signedUrl, "DOCX download URL exists");
    console.log(`  ✓ Generated authentic DOCX Resume (${docxPkg.document.sizeBytes} bytes) - Validated WordprocessingML`);

    const xlsxIntent = detectDocumentIntent("create an excel spreadsheet of company budget");
    const xlsxPkg = await synthesizeResearchToFile(xlsxIntent);
    const xlsxVal = validateDocumentBuffer(xlsxPkg.document.buffer, "xlsx");
    assert.ok(xlsxVal.valid, `XLSX buffer validation failed: ${xlsxVal.error}`);
    assert.ok(xlsxPkg.vault.signedUrl, "XLSX download URL exists");
    console.log(`  ✓ Generated authentic XLSX Spreadsheet (${xlsxPkg.document.sizeBytes} bytes) - Validated Workbook structure`);

    record(34, "End-to-End File Generation & Verification (PPTX, PDF, DOCX, XLSX)", true);
  } catch (genErr) {
    record(34, "End-to-End File Generation & Verification", false, genErr.message);
  }

  console.log("\n===============================================================================");
  console.log(`  TEST RESULTS: ${passed} / 35 PASSED (${Math.round((passed / 35) * 100)}%) | ${failed} FAILED`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
