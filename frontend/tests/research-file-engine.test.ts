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
  // TEST 1: Intent Understanding from Brief Topic Name
  it("TEST 1: Understands topic intention from a short topic name alone", () => {
    const prompt = "Artificial Intelligence";
    const intent = detectDocumentIntent(prompt);

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
});

