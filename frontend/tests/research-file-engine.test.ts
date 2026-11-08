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
});
