import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  detectDocumentGenerationIntent,
  synthesizeDocument,
} from "../app/lib/document-engine";

describe("Multilingual File Generation & User Mind Understanding", () => {
  test("Detects English PPT request and extracts clean topic", () => {
    const res = detectDocumentGenerationIntent("create a ppt on solar energy");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "pptx");
    assert.equal(res.topic.toLowerCase().includes("solar energy"), true);
    assert.equal(res.detectedLanguage, "en");
  });

  test("Detects English presentation request with variations", () => {
    const res1 = detectDocumentGenerationIntent("make a presentation about machine learning");
    assert.equal(res1.isDocumentRequest, true);
    assert.equal(res1.format, "pptx");
    assert.equal(res1.topic.toLowerCase().includes("machine learning"), true);

    const res2 = detectDocumentGenerationIntent("generate a slide deck on renewable power");
    assert.equal(res2.isDocumentRequest, true);
    assert.equal(res2.format, "pptx");
  });

  test("Detects Telugu transliterated PPT request", () => {
    const res = detectDocumentGenerationIntent("solar energy gurinchi ppt chey");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "pptx");
    assert.equal(res.topic.toLowerCase().includes("solar energy"), true);
  });

  test("Detects Telugu script PPT request", () => {
    const res = detectDocumentGenerationIntent("సౌరశక్తి పై పిపిటి తయారు చేయండి");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "pptx");
    assert.equal(res.detectedLanguage, "te");
  });

  test("Detects Hindi transliterated PPT request", () => {
    const res = detectDocumentGenerationIntent("photosynthesis par ppt banao");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "pptx");
    assert.equal(res.topic.toLowerCase().includes("photosynthesis"), true);
  });

  test("Detects Hindi script PPT request", () => {
    const res = detectDocumentGenerationIntent("सोलर एनर्जी पर प्रेजेंटेशन बनाओ");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "pptx");
    assert.equal(res.detectedLanguage, "hi");
  });

  test("Detects Word document request", () => {
    const res = detectDocumentGenerationIntent("create a word doc on quantum computing");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "docx");
    assert.equal(res.topic.toLowerCase().includes("quantum computing"), true);
  });

  test("Detects Excel spreadsheet request", () => {
    const res = detectDocumentGenerationIntent("make an excel sheet for monthly family budget");
    assert.equal(res.isDocumentRequest, true);
    assert.equal(res.format, "xlsx");
    assert.equal(res.topic.toLowerCase().includes("family budget"), true);
  });

  test("Ignores non-file conversational queries", () => {
    const res1 = detectDocumentGenerationIntent("what is solar energy?");
    assert.equal(res1.isDocumentRequest, false);

    const res2 = detectDocumentGenerationIntent("how are you doing today?");
    assert.equal(res2.isDocumentRequest, false);
  });

  test("Synthesizes a genuine PowerPoint (.pptx) file directly from prompt", async () => {
    const intent = detectDocumentGenerationIntent("create a ppt on Artificial Intelligence");
    const doc = await synthesizeDocument(intent);

    assert.equal(doc.success, true);
    assert.equal(doc.format, "pptx");
    assert.equal(doc.filename.endsWith(".pptx"), true);
    assert.equal(doc.mimeType, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    assert.equal(doc.dataUri.startsWith("data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,"), true);
    assert.equal(doc.sizeBytes > 1000, true);
    assert.equal(doc.summaryMessage.includes("PowerPoint"), true);
  });

  test("Synthesizes a genuine Excel (.xlsx) file directly from prompt", async () => {
    const intent = detectDocumentGenerationIntent("make an excel sheet for Project Financials");
    const doc = await synthesizeDocument(intent);

    assert.equal(doc.success, true);
    assert.equal(doc.format, "xlsx");
    assert.equal(doc.filename.endsWith(".xlsx"), true);
    assert.equal(doc.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.equal(doc.dataUri.startsWith("data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,"), true);
    assert.equal(doc.sizeBytes > 1000, true);
  });

  test("Synthesizes a genuine Word (.docx) file directly from prompt", async () => {
    const intent = detectDocumentGenerationIntent("generate a word doc on Climate Policy");
    const doc = await synthesizeDocument(intent);

    assert.equal(doc.success, true);
    assert.equal(doc.format, "docx");
    assert.equal(doc.filename.endsWith(".docx"), true);
    assert.equal(doc.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(doc.sizeBytes > 1000, true);
  });
});

