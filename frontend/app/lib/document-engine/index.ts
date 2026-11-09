/**
 * TATTVA AI - Intelligent AI-Powered Research-to-File Generation Engine
 * Master orchestration interface for:
 * - Intent understanding & archetype detection
 * - Autonomous multi-source research
 * - Professional multi-format file generation (DOCX, PPTX, XLSX, PDF, CSV, TXT, JSON, MD, Code)
 * - File validation and compatibility verification
 * - Secure vault storage & signed download URLs
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { createDocx, DocxPayload } from "./docx";
import { createXlsx, SpreadsheetPayload } from "./xlsx";
import { createPptx, PresentationPayload } from "./pptx";
import { createPdf, PdfPayload } from "./pdf";
import { createCsv } from "./csv";
import { inspectAndReadDocument, ExtractedDocumentContent } from "./reader";
import {
  detectDocumentIntent,
  DocumentIntentResult,
  DocumentFormat,
  DocumentArchetype,
  DocumentAudience,
  IntentContextOptions,
} from "./intent";
import {
  conductAutonomousResearch,
  ResearchDossier,
  ResearchCitation,
} from "./researcher";
import {
  synthesizeResearchToFile,
  SynthesizedDocumentPackage,
  SynthesisOptions,
} from "./synthesizer";
import {
  validateDocumentBuffer,
  ValidationReport,
} from "./validator";
import {
  executePythonOffice,
  validatePptxWithPython,
  validateDocxWithPython,
} from "./python-bridge";
import {
  saveGeneratedDocumentToVault,
  StoredDocumentResult,
} from "./storage";

export {
  createDocx,
  createXlsx,
  createPptx,
  createPdf,
  createCsv,
  inspectAndReadDocument,
  detectDocumentIntent,
  conductAutonomousResearch,
  synthesizeResearchToFile,
  validateDocumentBuffer,
  executePythonOffice,
  validatePptxWithPython,
  validateDocxWithPython,
  saveGeneratedDocumentToVault,
};

export type {
  ExtractedDocumentContent,
  DocumentIntentResult,
  DocumentFormat,
  DocumentArchetype,
  DocumentAudience,
  IntentContextOptions,
  ResearchDossier,
  ResearchCitation,
  SynthesizedDocumentPackage,
  SynthesisOptions,
  ValidationReport,
  StoredDocumentResult,
};

export type SupportedDocumentFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "csv"
  | "txt"
  | "md"
  | "json"
  | "html"
  | "xml"
  | "rtf"
  | "py"
  | "ts"
  | "js"
  | "java"
  | "c"
  | "cpp"
  | "css"
  | "sql";

export interface BuildDocumentOptions {
  format: SupportedDocumentFormat | string;
  title?: string;
  subtitle?: string;
  content?: string;
  sections?: Array<{
    heading?: string;
    subheading?: string;
    content?: string;
    bullets?: string[];
    table?: (string | number)[][];
    callout?: string;
  }>;
  references?: string[];
  slides?: Array<{
    title: string;
    category?: string;
    bullets?: string[];
    content?: string;
    takeaway?: string;
  }>;
  sheets?: Array<{
    title?: string;
    rows: (string | number | boolean | null | undefined)[][];
  }>;
  data?: (string | number | boolean | null | undefined)[][];
  filename?: string;
}

export interface GeneratedDocumentResult {
  success: boolean;
  format: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  dataUri: string;
  error?: string;
  sections?: any[];
}

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  rtf: "application/rtf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  json: "application/json;charset=utf-8",
  html: "text/html;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  java: "text/x-java-source;charset=utf-8",
  py: "text/x-python;charset=utf-8",
  c: "text/x-c;charset=utf-8",
  cpp: "text/x-c++;charset=utf-8",
  css: "text/css;charset=utf-8",
  js: "text/javascript;charset=utf-8",
  ts: "text/typescript;charset=utf-8",
  sql: "application/sql;charset=utf-8",
};

/**
 * Master Document Generator for TATTVA AI
 * Generates genuine binary files for DOCX, XLSX, PPTX, PDF, CSV, RTF, HTML, XML, TXT, JSON, and Code.
 */
export function buildDocument(options: BuildDocumentOptions): GeneratedDocumentResult {
  const normFormat = (options.format || "docx").toLowerCase().replace(/^\./, "");
  const title = options.title || "TATTVA AI Generated Document";
  const timestamp = Date.now();
  const baseName = (options.filename || `tattva_${normFormat}_${timestamp}`)
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  let buffer: Buffer;
  let finalFormat = normFormat;
  let mimeType = MIME_TYPES[normFormat] || "application/octet-stream";

  try {
    switch (normFormat) {
      case "docx":
      case "doc": {
        finalFormat = "docx";
        mimeType = MIME_TYPES.docx;
        const pyDocx = executePythonOffice("generate_docx", {
          title,
          subtitle: options.subtitle,
          sections: options.sections,
          references: options.references,
        });
        if (pyDocx && pyDocx.success && pyDocx.buffer) {
          buffer = pyDocx.buffer;
        } else {
          buffer = createDocx({
            title,
            subtitle: options.subtitle,
            sections: options.sections,
            references: options.references,
            rawText: options.content,
          });
        }
        break;
      }

      case "pptx":
      case "ppt": {
        finalFormat = "pptx";
        mimeType = MIME_TYPES.pptx;
        const pyPptx = executePythonOffice("generate_pptx", {
          title,
          subtitle: options.subtitle,
          slides: options.slides,
        });
        if (pyPptx && pyPptx.success && pyPptx.buffer) {
          buffer = pyPptx.buffer;
        } else {
          buffer = createPptx({
            title,
            subtitle: options.subtitle,
            slides: options.slides,
            rawText: options.content,
          });
        }
        break;
      }

      case "xlsx":
      case "xls": {
        finalFormat = "xlsx";
        mimeType = MIME_TYPES.xlsx;
        buffer = createXlsx({
          title,
          sheets: options.sheets,
          data: options.data,
          rawText: options.content,
        });
        break;
      }

      case "pdf": {
        finalFormat = "pdf";
        mimeType = MIME_TYPES.pdf;
        buffer = createPdf({
          title,
          subtitle: options.subtitle,
          sections: options.sections,
          rawText: options.content,
        });
        break;
      }

      case "csv": {
        finalFormat = "csv";
        mimeType = MIME_TYPES.csv;
        const csvData = options.data || (options.sheets && options.sheets[0] ? options.sheets[0].rows : undefined);
        buffer = createCsv(csvData || options.content || "");
        break;
      }

      case "json": {
        finalFormat = "json";
        mimeType = MIME_TYPES.json;
        buffer = Buffer.from(
          typeof options.content === "string" && options.content.trim().startsWith("{") || typeof options.content === "string" && options.content.trim().startsWith("[")
            ? options.content
            : JSON.stringify(options.data || options.sections || { title }, null, 2),
          "utf8"
        );
        break;
      }

      case "xml": {
        finalFormat = "xml";
        mimeType = MIME_TYPES.xml;
        const xmlContent = typeof options.content === "string" && options.content.includes("<")
          ? options.content
          : `<?xml version="1.0" encoding="UTF-8"?>\n<document>\n  <title>${title}</title>\n</document>`;
        buffer = Buffer.from(xmlContent, "utf8");
        break;
      }

      case "html": {
        finalFormat = "html";
        mimeType = MIME_TYPES.html;
        const htmlContent = typeof options.content === "string" && options.content.includes("<html")
          ? options.content
          : `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${title}</title>\n</head>\n<body>\n  <h1>${title}</h1>\n  <p>${options.subtitle || ""}</p>\n</body>\n</html>`;
        buffer = Buffer.from(htmlContent, "utf8");
        break;
      }

      case "css": {
        finalFormat = "css";
        mimeType = MIME_TYPES.css;
        buffer = Buffer.from(options.content || `/* ${title} */\n:root {\n  --primary: #D95B26;\n}\n`, "utf8");
        break;
      }

      case "md": {
        finalFormat = "md";
        mimeType = MIME_TYPES.md;
        buffer = Buffer.from(options.content || `# ${title}\n\n${options.subtitle || ""}`, "utf8");
        break;
      }

      case "py":
      case "ts":
      case "js":
      case "java":
      case "c":
      case "cpp":
      case "sql": {
        finalFormat = normFormat;
        mimeType = MIME_TYPES[normFormat] || "text/plain;charset=utf-8";
        buffer = Buffer.from(options.content || `// ${title}\n// Generated by TATTVA AI\n`, "utf8");
        break;
      }

      case "txt":
      default: {
        finalFormat = "txt";
        mimeType = MIME_TYPES.txt;
        buffer = Buffer.from(options.content || `${title}\n\n${options.subtitle || ""}`, "utf8");
        break;
      }
    }

    const filename = `${baseName}.${finalFormat}`;
    const b64 = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${b64}`;

    return {
      success: true,
      format: finalFormat,
      filename,
      mimeType,
      sizeBytes: buffer.length,
      buffer,
      dataUri,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const fallbackBuffer = Buffer.from(`${title}\n\n${options.content || ""}`, "utf8");
    return {
      success: false,
      format: "txt",
      filename: `${baseName}.txt`,
      mimeType: "text/plain;charset=utf-8",
      sizeBytes: fallbackBuffer.length,
      buffer: fallbackBuffer,
      dataUri: `data:text/plain;base64,${fallbackBuffer.toString("base64")}`,
      error: errorMsg,
    };
  }
}
