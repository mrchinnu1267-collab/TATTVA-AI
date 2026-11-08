import { createDocx, DocxPayload } from "./docx";
import { createXlsx, SpreadsheetPayload } from "./xlsx";
import { createPptx, PresentationPayload } from "./pptx";
import { createPdf, PdfPayload } from "./pdf";
import { createCsv } from "./csv";
import { inspectAndReadDocument, ExtractedDocumentContent } from "./reader";
import { detectDocumentGenerationIntent, DocumentGenerationIntent, DocumentFormat } from "./intent";
import { synthesizeDocument, GeneratedFilePayload } from "./synthesizer";

export {
  createDocx,
  createXlsx,
  createPptx,
  createPdf,
  createCsv,
  inspectAndReadDocument,
  detectDocumentGenerationIntent,
  synthesizeDocument,
};
export type { ExtractedDocumentContent, DocumentGenerationIntent, GeneratedFilePayload, DocumentFormat };

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
  | "doc"
  | "xls"
  | "ppt"
  | "java"
  | "py"
  | "c"
  | "cpp"
  | "js"
  | "ts"
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
  js: "text/javascript;charset=utf-8",
  ts: "text/typescript;charset=utf-8",
  sql: "application/sql;charset=utf-8",
};

/**
 * Master Document Generator for TATTVA AI
 * Generates genuine binary files for DOCX, XLSX, PPTX, PDF, CSV, RTF, HTML, XML, TXT.
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
      case "doc":
        finalFormat = "docx";
        mimeType = MIME_TYPES.docx;
        buffer = createDocx({
          title,
          subtitle: options.subtitle,
          sections: options.sections,
          references: options.references,
          rawText: options.content,
        });
        break;

      case "rtf":
        finalFormat = "rtf";
        mimeType = MIME_TYPES.rtf;
        buffer = Buffer.from(
          `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\\viewkind4\\uc1\\pard\\lang1033\\b\\fs32 ${title}\\b0\\fs22\\par\\par ${options.subtitle ? `{\\i ${options.subtitle}}\\par\\par ` : ""}${(options.content || "")
            .replace(/\\/g, "\\\\")
            .replace(/{/g, "\\{")
            .replace(/}/g, "\\}")
            .replace(/\n/g, "\\par ")}}`,
          "utf8"
        );
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
        const csvData = options.data || (options.sheets && options.sheets[0] ? options.sheets[0].rows : undefined);
        buffer = createCsv(csvData || options.content || "");
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

      case "html":
        finalFormat = "html";
        mimeType = MIME_TYPES.html;
        buffer = Buffer.from(
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 860px; margin: 3rem auto; padding: 1.5rem; color: #0f172a; line-height: 1.6; }
    h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { color: #1e293b; margin-top: 2rem; }
    p { margin: 1rem 0; color: #334155; }
    .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #e0f2fe; color: #0284c7; font-weight: bold; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <span class="badge">TATTVA AI Intelligence Suite</span>
  <h1>${title}</h1>
  ${options.subtitle ? `<p><em>${options.subtitle}</em></p>` : ""}
  ${options.content ? `<div>${options.content.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</div>` : ""}
  <footer>Generated by TATTVA AI • ${new Date().toLocaleDateString()}</footer>
</body>
</html>`,
          "utf8"
        );
        break;

      case "xml":
        finalFormat = "xml";
        mimeType = MIME_TYPES.xml;
        buffer = Buffer.from(
          `<?xml version="1.0" encoding="UTF-8"?>\n<document version="1.0">\n  <metadata>\n    <title>${title}</title>\n    <creator>TATTVA AI Intelligence Suite</creator>\n    <date>${new Date().toISOString()}</date>\n  </metadata>\n  <content>\n    <![CDATA[${options.content || ""}]]>\n  </content>\n</document>`,
          "utf8"
        );
        break;

      case "java":
      case "py":
      case "c":
      case "cpp":
      case "js":
      case "ts":
      case "sql":
        finalFormat = normFormat;
        mimeType = MIME_TYPES[normFormat] || "text/plain;charset=utf-8";
        buffer = Buffer.from(options.content || `// ${title}\n// Generated by TATTVA AI\n`, "utf8");
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
