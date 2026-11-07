import { createDocx, DocxPayload } from "./docx";
import { createXlsx, SpreadsheetPayload } from "./xlsx";
import { createPptx, PresentationPayload } from "./pptx";
import { createPdf, PdfPayload } from "./pdf";
import { createCsv } from "./csv";
import { inspectAndReadDocument, ExtractedDocumentContent } from "./reader";

export { createDocx, createXlsx, createPptx, createPdf, createCsv, inspectAndReadDocument };
export type { ExtractedDocumentContent };

export type SupportedDocumentFormat =
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "csv"
  | "txt"
  | "md"
  | "json";

export interface BuildDocumentOptions {
  format: SupportedDocumentFormat | string;
  title?: string;
  subtitle?: string;
  content?: string;
  sections?: Array<{
    heading?: string;
    content?: string;
    bullets?: string[];
    table?: (string | number)[][];
  }>;
  slides?: Array<{
    title: string;
    bullets?: string[];
    content?: string;
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
}

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  json: "application/json;charset=utf-8",
};

/**
 * Master Document Generator for TATTVA AI
 * Generates 100% compliant binary files for PDF, DOCX, XLSX, PPTX, CSV, and text.
 */
export function buildDocument(options: BuildDocumentOptions): GeneratedDocumentResult {
  const normFormat = (options.format || "pdf").toLowerCase().replace(/^\./, "");
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
      case "doc":
        finalFormat = "docx";
        mimeType = MIME_TYPES.docx;
        buffer = createDocx({
          title,
          subtitle: options.subtitle,
          sections: options.sections,
          rawText: options.content,
        });
        break;

      case "xlsx":
      case "xls":
        finalFormat = "xlsx";
        mimeType = MIME_TYPES.xlsx;
        buffer = createXlsx({
          title,
          sheets: options.sheets,
          data: options.data,
          rawText: options.content,
        });
        break;

      case "pptx":
      case "ppt":
        finalFormat = "pptx";
        mimeType = MIME_TYPES.pptx;
        buffer = createPptx({
          title,
          subtitle: options.subtitle,
          slides: options.slides,
          rawText: options.content,
        });
        break;

      case "pdf":
        finalFormat = "pdf";
        mimeType = MIME_TYPES.pdf;
        buffer = createPdf({
          title,
          subtitle: options.subtitle,
          sections: options.sections,
          rawText: options.content,
        });
        break;

      case "csv":
        finalFormat = "csv";
        mimeType = MIME_TYPES.csv;
        buffer = createCsv(options.data || options.content || "");
        break;

      case "json":
        finalFormat = "json";
        mimeType = MIME_TYPES.json;
        buffer = Buffer.from(
          typeof options.content === "string"
            ? options.content
            : JSON.stringify(options.data || options.sections || { title }, null, 2),
          "utf8"
        );
        break;

      case "md":
        finalFormat = "md";
        mimeType = MIME_TYPES.md;
        buffer = Buffer.from(options.content || `# ${title}\n\n${options.subtitle || ""}`, "utf8");
        break;

      case "txt":
      default:
        finalFormat = "txt";
        mimeType = MIME_TYPES.txt;
        buffer = Buffer.from(options.content || `${title}\n\n${options.subtitle || ""}`, "utf8");
        break;
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Document generation error.";
    return {
      success: false,
      format: normFormat,
      filename: `${baseName}.${normFormat}`,
      mimeType,
      sizeBytes: 0,
      buffer: Buffer.alloc(0),
      dataUri: "",
      error: errorMsg,
    };
  }
}

