import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { inspectAndReadDocument } from "../app/lib/document-engine";

describe("Document Reader & Universal File Processing Suite", () => {
  test("Plain Text File (.txt) Reading & Extraction", async () => {
    const textBuffer = Buffer.from("System architecture for TATTVA AI.\nHigh performance AI reasoning.", "utf8");
    const result = await inspectAndReadDocument(textBuffer, "notes.txt", "text/plain");
    assert.equal(result.success, true);
    assert.equal(result.format, "txt");
    assert.equal(result.extractedText.includes("System architecture"), true);
  });

  test("CSV File (.csv) Parsing & Row Extraction", async () => {
    const csvBuffer = Buffer.from("Name,Age,Role\nAlice,30,Engineer\nBob,25,Designer", "utf8");
    const result = await inspectAndReadDocument(csvBuffer, "team.csv", "text/csv");
    assert.equal(result.success, true);
    assert.equal(result.format, "csv");
    assert.equal(result.extractedText.includes("Alice"), true);
    assert.equal(result.extractedText.includes("Engineer"), true);
  });

  test("JSON File (.json) Parsing & Pretty Printing", async () => {
    const jsonBuffer = Buffer.from(JSON.stringify({ project: "TATTVA AI", version: "1.0.0" }), "utf8");
    const result = await inspectAndReadDocument(jsonBuffer, "config.json", "application/json");
    assert.equal(result.success, true);
    assert.equal(result.format, "json");
    assert.equal(result.extractedText.includes("TATTVA AI"), true);
  });

  test("Empty File Handling returns graceful error", async () => {
    const emptyBuffer = Buffer.alloc(0);
    const result = await inspectAndReadDocument(emptyBuffer, "empty.pdf");
    assert.equal(result.success, false);
    assert.equal(result.error?.includes("empty"), true);
  });

  test("Image OCR / Multimodal Marker for Vision Processing", async () => {
    // PNG Header: \x89PNG\r\n\x1a\n
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const result = await inspectAndReadDocument(pngHeader, "screenshot.png", "image/png");
    assert.equal(result.success, true);
    assert.equal(result.isBinaryMultimodal, true);
  });
});
