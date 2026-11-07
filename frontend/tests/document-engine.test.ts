import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildDocument } from "../app/lib/document-engine";
import { createDocx } from "../app/lib/document-engine/docx";
import { createXlsx } from "../app/lib/document-engine/xlsx";
import { createPptx } from "../app/lib/document-engine/pptx";
import { createPdf } from "../app/lib/document-engine/pdf";
import { createCsv } from "../app/lib/document-engine/csv";
import { inspectAndReadDocument } from "../app/lib/document-engine/reader";

describe("Document Engine & Universal File Processor", () => {
  test("Word (.docx) Generation & Full Text Extraction", async () => {
    const docxBuffer = createDocx({
      title: "Quarterly Financial Analysis",
      rawText: "Revenue increased by 45% year-over-year.\nOperating margins expanded by 320 basis points.",
      author: "TATTVA AI",
    });
    assert.equal(Buffer.isBuffer(docxBuffer), true);
    assert.equal(docxBuffer.length > 500, true);
    // Magic bytes PK\x03\x04
    assert.equal(docxBuffer[0], 0x50);
    assert.equal(docxBuffer[1], 0x4b);
    assert.equal(docxBuffer[2], 0x03);
    assert.equal(docxBuffer[3], 0x04);

    const readResult = await inspectAndReadDocument(
      docxBuffer,
      "financial.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    assert.equal(readResult.success, true);
    assert.equal(readResult.format, "docx");
    assert.equal(readResult.extractedText.includes("Revenue increased by 45%"), true);
    assert.equal(readResult.extractedText.includes("Quarterly Financial Analysis"), true);
  });

  test("Excel (.xlsx) Generation & Cell Extraction", async () => {
    const xlsxBuffer = createXlsx({
      title: "Regional Sales",
      sheets: [
        {
          name: "Q4 Sales",
          rows: [
            ["Region", "Target", "Actual", "Growth"],
            ["North America", "1000000", "1250000", "25%"],
            ["Asia Pacific", "800000", "950000", "18.75%"],
          ],
        },
      ],
    });
    assert.equal(Buffer.isBuffer(xlsxBuffer), true);
    assert.equal(xlsxBuffer.length > 500, true);
    assert.equal(xlsxBuffer[0], 0x50);
    assert.equal(xlsxBuffer[1], 0x4b);

    const readResult = await inspectAndReadDocument(
      xlsxBuffer,
      "sales.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    assert.equal(readResult.success, true);
    assert.equal(readResult.format, "xlsx");
    assert.equal(readResult.extractedText.includes("North America"), true);
    assert.equal(readResult.extractedText.includes("1250000"), true);
  });

  test("PowerPoint (.pptx) Generation & Slide Extraction", async () => {
    const pptxBuffer = createPptx({
      title: "Strategic Vision 2027",
      subtitle: "AI Infrastructure Roadmap",
      slides: [
        {
          title: "Executive Summary",
          bullets: ["Decentralized Edge Intelligence", "Sub-100ms Inference Pipelines"],
        },
        {
          title: "Key Metrics",
          bullets: ["99.99% Uptime", "Zero-trust Security Architecture"],
        },
      ],
    });
    assert.equal(Buffer.isBuffer(pptxBuffer), true);
    assert.equal(pptxBuffer[0], 0x50);
    assert.equal(pptxBuffer[1], 0x4b);

    const readResult = await inspectAndReadDocument(
      pptxBuffer,
      "strategy.pptx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    assert.equal(readResult.success, true);
    assert.equal(readResult.format, "pptx");
    assert.equal(readResult.extractedText.includes("Strategic Vision 2027"), true);
    assert.equal(readResult.extractedText.includes("Decentralized Edge Intelligence"), true);
  });

  test("PDF (.pdf) Generation with Exact XRef Offsets", async () => {
    const pdfBuffer = createPdf({
      title: "System Architecture Specification",
      content:
        "The TATTVA AI core architecture is partitioned into deterministic microservices with robust error containment.",
    });
    assert.equal(Buffer.isBuffer(pdfBuffer), true);
    const pdfHeader = pdfBuffer.slice(0, 8).toString("utf-8");
    assert.equal(pdfHeader.startsWith("%PDF-1.4"), true);
    const pdfTail = pdfBuffer.slice(-128).toString("utf-8");
    assert.equal(pdfTail.includes("%%EOF"), true);
    assert.equal(pdfTail.includes("startxref"), true);

    const readResult = await inspectAndReadDocument(pdfBuffer, "spec.pdf", "application/pdf");
    assert.equal(readResult.success, true);
    assert.equal(readResult.format, "pdf");
    assert.equal(readResult.isBinaryMultimodal, true);
  });

  test("CSV (.csv) Generation with UTF-8 BOM", async () => {
    const csvBuffer = createCsv({
      title: "User Demographics",
      content: 'Name, Country, Role\nAlice, "USA, West", Admin\nBob, India, Developer',
    });
    assert.equal(Buffer.isBuffer(csvBuffer), true);
    // UTF-8 BOM
    assert.equal(csvBuffer[0], 0xef);
    assert.equal(csvBuffer[1], 0xbb);
    assert.equal(csvBuffer[2], 0xbf);

    const readResult = await inspectAndReadDocument(csvBuffer, "users.csv", "text/csv");
    assert.equal(readResult.success, true);
    assert.equal(readResult.format, "csv");
    assert.equal(readResult.extractedText.includes("Alice"), true);
  });

  test("Master buildDocument Multi-Format Generation", async () => {
    const formats = ["pdf", "docx", "xlsx", "pptx", "csv", "json", "txt", "md"];
    for (const fmt of formats) {
      const res = await buildDocument({
        format: fmt,
        content: `Test content for ${fmt} document generation.`,
        title: `Generated ${fmt.toUpperCase()}`,
      });
      assert.equal(res.dataUri.startsWith("data:"), true);
      assert.equal(res.filename.endsWith(`.${fmt}`), true);
      assert.equal(res.sizeBytes > 0, true);
    }
  });

  test("Corrupted and Empty File Error Containment", async () => {
    const emptyRes = await inspectAndReadDocument(Buffer.alloc(0), "empty.docx");
    assert.equal(emptyRes.success, false);

    const corruptBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03]);
    const corruptRes = await inspectAndReadDocument(corruptBuf, "broken.docx");
    assert.equal(corruptRes.success, false);
  });
});
