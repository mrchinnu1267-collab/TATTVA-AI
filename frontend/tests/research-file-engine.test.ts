import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectDocumentIntent,
  conductAutonomousResearch,
  synthesizeResearchToFile,
  validateDocumentBuffer,
  createDocx,
  createPptx,
  createXlsx,
  createPdf,
  createCsv,
} from "../app/lib/document-engine";

describe("TATTVA AI – Research-to-File Generation Engine Test Suite", () => {
  // TEST 1: Intent Understanding from Brief Topic Name (in Document Studio / forced generation)
  it("TEST 1: Understands topic intention from a short topic name alone", () => {
    const prompt = "Artificial Intelligence";
    const intent = detectDocumentIntent(prompt, { forceDocument: true });

    assert.equal(intent.isDocumentRequest, true);
    assert.ok(intent.confidence >= 0.7);
    assert.equal(intent.topic.includes("Artificial Intelligence"), true);
    assert.ok(["research_report", "presentation", "assignment"].includes(intent.archetype));
    assert.ok(["docx", "pptx", "pdf"].includes(intent.format));
  });

  // TEST 2: Explicit Presentation Intent & Slide Count Extraction
  it("TEST 2: Explicit presentation request parses slide count and PPTX format", () => {
    const prompt = "Create a 12-slide presentation about Quantum Computing for university students";
    const intent = detectDocumentIntent(prompt);

    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.archetype, "presentation");
    assert.equal(intent.format, "pptx");
    assert.equal(intent.length.slideCount, 12);
    assert.equal(intent.audience, "academic");
  });

  // TEST 3: Spreadsheet & Financial Intent Recognition
  it("TEST 3: Spreadsheet request identifies Excel format, calculations, and financial audience", () => {
    const prompt = "Generate an Excel budget sheet with quarterly expenses and revenue forecast";
    const intent = detectDocumentIntent(prompt);

    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.archetype, "spreadsheet");
    assert.equal(intent.format, "xlsx");
    assert.equal(intent.audience, "financial");
  });

  // TEST 4: Autonomous Research Gathering & Citations
  it("TEST 4: Autonomous research gathers definitions, core concepts, and authentic citations", async () => {
    const dossier = await conductAutonomousResearch("Distributed Cloud Computing", {
      depth: "standard",
    });

    assert.ok(dossier.definition.length > 20);
    assert.ok(dossier.coreConcepts.length >= 2);
    assert.ok(dossier.applications.length >= 2);
    assert.ok(dossier.citations.length >= 2);
    assert.equal(dossier.citations.some((c) => c.authority === "official_standard"), true);
  });

  // TEST 5: Genuine DOCX Generation & Validation
  it("TEST 5: DOCX Generator produces valid OpenXML package and passes validation", () => {
    const buffer = createDocx({
      title: "Distributed Database Systems",
      subtitle: "Enterprise Reliability & Scaling",
      sections: [
        {
          heading: "1. Architectural Overview",
          content: "Distributed database systems partition data across heterogeneous cluster nodes.",
          bullets: ["ACID vs. BASE trade-offs", "CAP theorem implications", "Consensus protocols (Raft/Paxos)"],
        },
      ],
      references: ["IEEE Transactions on Parallel & Distributed Systems (2025)."],
    });

    assert.ok(buffer.length > 1000);
    const validation = validateDocumentBuffer(buffer, "docx");
    assert.equal(validation.valid, true);
    assert.equal(validation.checks.magicBytesValid, true);
    assert.equal(validation.checks.minimumSizeSatisfied, true);
  });

  // TEST 6: Genuine PPTX 16:9 Presentation Generation & Validation
  it("TEST 6: PPTX Generator produces valid 16:9 widescreen presentation and passes validation", () => {
    const buffer = createPptx({
      title: "Machine Learning at the Edge",
      subtitle: "Autonomous Telemetry & Micro-Inference",
      slides: [
        {
          title: "Introduction to Edge ML",
          category: "OVERVIEW",
          bullets: ["Quantized neural network deployment", "Sub-10ms localized inference", "Zero cloud dependency"],
        },
        {
          title: "Key Performance Benchmarks",
          category: "PERFORMANCE",
          bullets: ["3.4x power efficiency", "99.98% uptime at remote edge gateways"],
        },
      ],
    });

    assert.ok(buffer.length > 1000);
    const validation = validateDocumentBuffer(buffer, "pptx");
    assert.equal(validation.valid, true);
    assert.equal(validation.checks.magicBytesValid, true);
    assert.equal(validation.checks.minimumSizeSatisfied, true);
  });

  // TEST 7: Genuine XLSX Spreadsheet Generation & Validation
  it("TEST 7: XLSX Generator produces valid OpenXML workbook and passes validation", () => {
    const buffer = createXlsx({
      title: "Quarterly Financial Forecast",
      sheets: [
        {
          title: "Forecast 2026",
          rows: [
            ["Quarter", "Revenue", "OpEx", "Net Profit"],
            ["Q1", 120000, 45000, 75000],
            ["Q2", 145000, 48000, 97000],
            ["Total", "=SUM(B2:B3)", "=SUM(C2:C3)", "=SUM(D2:D3)"],
          ],
        },
      ],
    });

    assert.ok(buffer.length > 1000);
    const validation = validateDocumentBuffer(buffer, "xlsx");
    assert.equal(validation.valid, true);
    assert.equal(validation.checks.magicBytesValid, true);
  });

  // TEST 8: Genuine PDF Generation & Validation
  it("TEST 8: PDF Generator produces valid binary PDF with %%EOF trailer", () => {
    const buffer = createPdf({
      title: "Cybersecurity Framework & Zero Trust Architecture",
      subtitle: "Defense-in-Depth Engineering",
      sections: [
        {
          heading: "1. Executive Summary",
          content: "Zero trust architecture mandates strict cryptographic authentication for every service boundary.",
        },
      ],
    });

    assert.ok(buffer.length > 300);
    const validation = validateDocumentBuffer(buffer, "pdf");
    assert.equal(validation.valid, true);
    assert.equal(validation.checks.magicBytesValid, true);
  });

  // TEST 9: RFC 4180 CSV Generator
  it("TEST 9: CSV Generator outputs clean UTF-8 BOM data with escaped commas", () => {
    const buffer = createCsv([
      ["City", "Country", "Notes"],
      ["Tokyo", "Japan", "High-density metropolis, excellent transport"],
      ["Paris", "France", "Capital of France"],
    ]);

    const csvText = buffer.toString("utf8");
    assert.ok(csvText.startsWith("\uFEFF"));
    assert.ok(csvText.includes('"High-density metropolis, excellent transport"'));
  });

  // TEST 10: Complete End-to-End Research-to-File Pipeline
  it("TEST 10: Complete pipeline takes topic, researches, generates, validates, and stores document", async () => {
    const intent = detectDocumentIntent("Generate an assignment on Database Management Systems");
    const docPackage = await synthesizeResearchToFile(intent, {
      userId: "test_research_user",
    });

    assert.equal(docPackage.success, true);
    assert.ok(docPackage.document.sizeBytes > 1000);
    assert.ok(docPackage.vault.signedUrl.length > 0);
    assert.equal(docPackage.validation.valid, true);
    assert.ok(docPackage.summary.includes("Database Management Systems"));
    assert.ok(docPackage.progressStages.length >= 4);
  });

  // TEST 11: Transformer Architecture Presentation - Deep Concept Explanations & Zero Filler
  it("TEST 11: Generates authentic Transformer Architecture presentation covering all 12 required concepts", async () => {
    const intent = detectDocumentIntent("Create a presentation on Transformer Architecture");
    assert.equal(intent.archetype, "presentation");
    assert.equal(intent.format, "pptx");

    const docPackage = await synthesizeResearchToFile(intent, {
      userId: "transformer_tester",
    });

    assert.equal(docPackage.success, true);
    assert.equal(docPackage.document.format, "pptx");
    assert.equal(docPackage.validation.valid, true);

    const outline = docPackage.outlineMarkdown;

    // 1. Must NOT contain generic filler headings
    assert.equal(outline.includes("The Core Problem & Context"), false, "Must not contain generic title 'The Core Problem & Context'");
    assert.equal(outline.includes("Major Conceptual Pillars"), false, "Must not contain generic title 'Major Conceptual Pillars'");
    assert.equal(outline.includes("Operational Challenges & Trade-offs"), false, "Must not contain generic title 'Operational Challenges & Trade-offs'");

    // 2. Must cover core technical requirements
    const lowerOutline = outline.toLowerCase();
    assert.ok(lowerOutline.includes("attention"), "Must cover attention mechanism");
    assert.ok(lowerOutline.includes("encoder") || lowerOutline.includes("decoder"), "Must cover encoder/decoder architecture");
    assert.ok(lowerOutline.includes("query") || lowerOutline.includes("key") || lowerOutline.includes("value") || lowerOutline.includes("q, k, v"), "Must cover Q, K, V");
    assert.ok(lowerOutline.includes("positional encoding"), "Must cover Positional Encoding");
    assert.ok(lowerOutline.includes("feed-forward") || lowerOutline.includes("ffn"), "Must cover Feed-Forward Networks");
    assert.ok(lowerOutline.includes("multi-head"), "Must cover Multi-Head Attention");

    // 3. Must reference authentic sources
    assert.ok(docPackage.research.citations.length >= 1);
    assert.ok(docPackage.research.citations.some((c) => c.sourceName.includes("Vaswani") || c.referenceText.includes("Attention Is All You Need")));
  });

  // TEST 12: Distinct Topic Specificity Across Domains (No Template Reuse)
  it("TEST 12: Different technical domains produce genuinely distinct, non-overlapping slide decks", async () => {
    const osIntent = detectDocumentIntent("Create a presentation on Operating Systems");
    const osPackage = await synthesizeResearchToFile(osIntent);

    const dbmsIntent = detectDocumentIntent("Create a presentation on Database Management Systems");
    const dbmsPackage = await synthesizeResearchToFile(dbmsIntent);

    const osOutline = osPackage.outlineMarkdown.toLowerCase();
    const dbmsOutline = dbmsPackage.outlineMarkdown.toLowerCase();

    // OS should mention Kernel, Scheduling, Memory, or Processes
    assert.ok(
      osOutline.includes("kernel") || osOutline.includes("scheduling") || osOutline.includes("virtual memory") || osOutline.includes("paging"),
      "OS presentation must discuss OS-specific mechanisms"
    );

    // DBMS should mention ACID, Transactions, Indexing, or Storage Engine
    assert.ok(
      dbmsOutline.includes("acid") || dbmsOutline.includes("transaction") || dbmsOutline.includes("indexing") || dbmsOutline.includes("b+ tree"),
      "DBMS presentation must discuss DBMS-specific mechanisms"
    );

    // They must not share the same generic structure
    assert.notEqual(osPackage.outlineMarkdown, dbmsPackage.outlineMarkdown, "Outlines must be completely different");
  });

  // TEST 13: Final Acceptance Test 1 - Assignment about Transformer Architecture (.docx)
  it("ACCEPTANCE TEST 1: 'Create an assignment about Transformer Architecture' -> Generates valid DOCX", async () => {
    const prompt = "Create an assignment about Transformer Architecture.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "docx");
    assert.equal(intent.archetype, "assignment");

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "docx");
    assert.equal(pkg.validation.valid, true);
    assert.ok(pkg.document.sizeBytes > 1000);
  });

  // TEST 14: Final Acceptance Test 2 - 10-Slide PPT about DBMS (.pptx)
  it("ACCEPTANCE TEST 2: 'Create a 10-slide PPT about DBMS.' -> Generates valid 10-slide PPTX", async () => {
    const prompt = "Create a 10-slide PPT about DBMS.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "pptx");
    assert.equal(intent.archetype, "presentation");
    assert.equal(intent.length.slideCount, 10);

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "pptx");
    assert.equal(pkg.validation.valid, true);
    assert.ok(pkg.document.sizeBytes > 1000);
  });

  // TEST 15: Final Acceptance Test 3 - Excel workbook for student marks (.xlsx)
  it("ACCEPTANCE TEST 3: 'Create an Excel workbook for student marks.' -> Generates valid XLSX workbook", async () => {
    const prompt = "Create an Excel workbook for student marks.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "xlsx");
    assert.equal(intent.archetype, "spreadsheet");

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "xlsx");
    assert.equal(pkg.validation.valid, true);
    assert.ok(pkg.document.sizeBytes > 1000);
    assert.ok(pkg.outlineMarkdown.toLowerCase().includes("student") || pkg.outlineMarkdown.toLowerCase().includes("marks"));
  });

  // TEST 16: Final Acceptance Test 4 - PDF about Artificial Intelligence (.pdf)
  it("ACCEPTANCE TEST 4: 'Generate a PDF about Artificial Intelligence.' -> Generates valid PDF", async () => {
    const prompt = "Generate a PDF about Artificial Intelligence.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "pdf");

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "pdf");
    assert.equal(pkg.validation.valid, true);
    assert.ok(pkg.document.sizeBytes > 300);
  });

  // TEST 17: Final Acceptance Test 5 - JSON file containing sample student records (.json)
  it("ACCEPTANCE TEST 5: 'Create a JSON file containing sample student records.' -> Generates valid parseable JSON", async () => {
    const prompt = "Create a JSON file containing sample student records.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "json");
    assert.equal(intent.archetype, "data_file");

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "json");
    assert.equal(pkg.validation.valid, true);

    const jsonText = pkg.document.buffer.toString("utf8");
    const parsed = JSON.parse(jsonText);
    assert.ok(typeof parsed === "object");
  });

  // TEST 18: Final Acceptance Test 6 - Python binary-search program file (.py)
  it("ACCEPTANCE TEST 6: 'Write a Python binary-search program and save it as a file.' -> Generates valid PY script", async () => {
    const prompt = "Write a Python binary-search program and save it as a file.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "py");
    assert.equal(intent.archetype, "source_code");

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "py");
    assert.equal(pkg.validation.valid, true);

    const pyCode = pkg.document.buffer.toString("utf8");
    assert.ok(pyCode.includes("def binary_search"));
    assert.ok(pyCode.includes("target"));
  });

  // TEST 19: Final Acceptance Test 7 - CSV containing employee records (.csv)
  it("ACCEPTANCE TEST 7: 'Create a CSV containing employee records.' -> Generates valid structured CSV", async () => {
    const prompt = "Create a CSV containing employee records.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "csv");
    assert.equal(intent.archetype, "spreadsheet");

    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "csv");
    assert.equal(pkg.validation.valid, true);

    const csvText = pkg.document.buffer.toString("utf8");
    assert.ok(csvText.includes("Employee") || csvText.includes("EMP") || csvText.includes(","));
  });

  // TEST 20: Information Query vs File Generation Disambiguation
  it("ACCEPTANCE TEST 8: 'Give me the information about Operating Systems.' -> Answer in chat, NOT a file", () => {
    const prompt = "Give me the information about Operating Systems.";
    const intent = detectDocumentIntent(prompt);
    assert.equal(intent.isDocumentRequest, false, "Must not trigger file generation for informational questions");
  });

  // TEST 21: Authentic Amazon Research & Delivery without dumping section paragraphs
  it("ACCEPTANCE TEST 9: 'amazon' -> Genuinely researches Amazon/AWS, produces valid DOCX without robotic filler", async () => {
    const research = await conductAutonomousResearch("Amazon");
    assert.ok(research.definition.toLowerCase().includes("amazon") || research.definition.toLowerCase().includes("commerce") || research.definition.toLowerCase().includes("aws"));
    assert.ok(!research.definition.toLowerCase().includes("multidisciplinary domain focusing on systematic principles"));
    assert.ok(research.coreMechanisms.some((m) => m.name.toLowerCase().includes("flywheel") || m.name.toLowerCase().includes("aws") || m.name.toLowerCase().includes("fulfillment") || m.name.toLowerCase().includes("enterprise")));

    const intent = detectDocumentIntent("Prepare a research report about Amazon.");
    const pkg = await synthesizeResearchToFile(intent);
    assert.equal(pkg.success, true);
    assert.equal(pkg.document.format, "docx");
    assert.equal(pkg.validation.valid, true);
    assert.ok(!pkg.outlineMarkdown.includes("1. Introduction & Background: Amazon is a multidisciplinary domain"));
    assert.ok(pkg.outlineMarkdown.includes("Document Structure"));
  });

  // TEST 22: Authentic Gaming Evolution Research
  it("ACCEPTANCE TEST 10: 'gaming' / 'Games' -> Genuinely researches interactive media, game engines & netcode", async () => {
    const research = await conductAutonomousResearch("gaming");
    assert.ok(research.definition.toLowerCase().includes("game") || research.definition.toLowerCase().includes("graphics") || research.definition.toLowerCase().includes("interactive"));
    assert.ok(research.coreMechanisms.some((m) => m.name.toLowerCase().includes("game loop") || m.name.toLowerCase().includes("rendering") || m.name.toLowerCase().includes("netcode")));
  });

  // TEST 23: Human-Centred Conversational Intelligence vs Unnecessary File Generation
  it("ACCEPTANCE TEST 11: Normal questions & inquiries must NOT trigger file generation", () => {
    const questions = [
      "What is India?",
      "Tell me about Amazon.",
      "Explain Transformer Architecture.",
      "How does Artificial Intelligence work?",
      "What are the advantages of DBMS?",
      "What are its applications?",
      "Why is the sky blue?",
      "Can you explain neural networks?",
      "Research quantum computing",
    ];

    for (const q of questions) {
      const intent = detectDocumentIntent(q, { inChatConversation: true });
      assert.equal(
        intent.isDocumentRequest,
        false,
        `Expected "${q}" to be answered in chat without generating a file, but isDocumentRequest was true`
      );
    }
  });

  // TEST 24: Single topics in chat must NOT generate files
  it("ACCEPTANCE TEST 12: Single topic keywords in chat ('amazon', 'Games') must NOT trigger file generation", () => {
    const chatTopics = ["amazon", "Games", "India", "Artificial Intelligence", "DBMS"];
    for (const t of chatTopics) {
      const intent = detectDocumentIntent(t, { inChatConversation: true });
      assert.equal(
        intent.isDocumentRequest,
        false,
        `Expected topic "${t}" in chat to be answered conversationally, but isDocumentRequest was true`
      );
    }
  });

  // TEST 25: Explicit file requests MUST trigger genuine file generation
  it("ACCEPTANCE TEST 13: Explicit file requests trigger actual file generation with correct formats", () => {
    const fileRequests: Array<{ prompt: string; expectedFormat: string }> = [
      { prompt: "Create a PDF about India.", expectedFormat: "pdf" },
      { prompt: "Make a PPT about Artificial Intelligence.", expectedFormat: "pptx" },
      { prompt: "Prepare an assignment in DOCX format.", expectedFormat: "docx" },
      { prompt: "Generate an Excel sheet.", expectedFormat: "xlsx" },
      { prompt: "Give me a downloadable Python file.", expectedFormat: "py" },
      { prompt: "Write a Python script and save it as a file.", expectedFormat: "py" },
    ];

    for (const req of fileRequests) {
      const intent = detectDocumentIntent(req.prompt, { inChatConversation: true });
      assert.equal(
        intent.isDocumentRequest,
        true,
        `Expected "${req.prompt}" to trigger file generation, but isDocumentRequest was false`
      );
      assert.equal(
        intent.format,
        req.expectedFormat,
        `Expected format "${req.expectedFormat}" for "${req.prompt}", but got "${intent.format}"`
      );
    }
  });

  // TEST 26: Multi-turn Follow-up Context Resolution
  it("ACCEPTANCE TEST 14: Follow-up 'Now create a PPT about it.' resolves topic from preceding conversation", () => {
    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: "Explain Transformer Architecture." },
      { role: "assistant", content: "Transformer Architecture is a deep learning model based on self-attention mechanisms..." },
      { role: "user", content: "What are its applications?" },
      { role: "assistant", content: "Key applications include large language models, machine translation, and computer vision." },
    ];

    const followUpPrompt = "Now create a PPT about it.";
    const intent = detectDocumentIntent(followUpPrompt, {
      history: conversationHistory,
      inChatConversation: true,
    });

    assert.equal(intent.isDocumentRequest, true);
    assert.equal(intent.format, "pptx");
    assert.equal(intent.archetype, "presentation");
    assert.ok(
      intent.topic.toLowerCase().includes("transformer") || intent.topic.toLowerCase().includes("architecture"),
      `Expected resolved topic to reference Transformer Architecture, but got: "${intent.topic}"`
    );
  });

  // TEST 27: Contained Emphasized Items Cleaning & Normalization
  it("ACCEPTANCE TEST 15: Contained emphasized items (nested markdown emphasis) are completely and cleanly normalized", () => {
    const { cleanSlideText } = require("../app/lib/document-engine/pptx");

    const cases = [
      {
        input: "**Bold text containing *contained emphasized item* inside**",
        expected: "Bold text containing contained emphasized item inside",
      },
      {
        input: "*Italic containing **bold item** inside*",
        expected: "Italic containing bold item inside",
      },
      {
        input: "***Triple emphasized item***",
        expected: "Triple emphasized item",
      },
      {
        input: "**Formal Principles and Domain-Specific Definition of As Ppt** *(FOUNDATIONS)*",
        expected: "Formal Principles and Domain-Specific Definition of As Ppt (FOUNDATIONS)",
      },
      {
        input: "* **Slide Title with *inner emphasis* here** *(CATEGORY)*",
        expected: "Slide Title with inner emphasis here (CATEGORY)",
      },
      {
        input: "**Presentation Structure (8 Slides):**",
        expected: "Presentation Structure (8 Slides):",
      },
    ];

    for (const c of cases) {
      const output = cleanSlideText(c.input);
      assert.equal(output, c.expected, `Failed for input: "${c.input}". Expected "${c.expected}", got "${output}"`);
      assert.ok(!output.includes("**"), `Output must not contain raw asterisks: "${output}"`);
      assert.ok(!output.startsWith("*") && !output.endsWith("*"), `Output must not have border asterisks: "${output}"`);
    }
  });
});

