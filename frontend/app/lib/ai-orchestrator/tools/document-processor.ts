/**
 * TATTVA AI - Document & File Intelligence Engine Tool
 * Deep content extraction, semantic chunking, and tabular parsing
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";

export interface ParsedDocumentData {
  format: string;
  charCount: number;
  wordCount: number;
  lineCount: number;
  headings: string[];
  tables?: Array<{ headers: string[]; rows: string[][] }>;
  extractedText: string;
  summaryPreview: string;
}

/**
 * Parses and inspects diverse document formats (TXT, CSV, JSON, Markdown, etc.)
 */
export function extractDocumentContent(content: string, format: string): ParsedDocumentData {
  const cleanFormat = format.toLowerCase().replace(/^\./, "");
  const trimmed = content.trim();

  let extractedText = trimmed;
  const headings: string[] = [];
  const tables: Array<{ headers: string[]; rows: string[][] }> = [];

  // Parse CSV
  if (cleanFormat === "csv") {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      const headers = lines[0].split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
      tables.push({ headers, rows });
      extractedText = `Tabular CSV Data:\nHeaders: ${headers.join(" | ")}\nRows Count: ${rows.length}\nSample Data:\n${rows.slice(0, 10).map((r) => r.join(" | ")).join("\n")}`;
    }
  }

  // Parse JSON
  else if (cleanFormat === "json") {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        const headers = Object.keys(parsed[0]);
        const rows = parsed.map((item) => headers.map((k) => String(item[k] ?? "")));
        tables.push({ headers, rows });
        extractedText = `JSON Table:\nFields: ${headers.join(", ")}\nTotal Objects: ${parsed.length}\nSample Objects:\n${JSON.stringify(parsed.slice(0, 5), null, 2)}`;
      } else {
        extractedText = `Structured JSON Content:\n${JSON.stringify(parsed, null, 2)}`;
      }
    } catch {
      extractedText = trimmed;
    }
  }

  // Parse Markdown / Text
  else {
    const lines = trimmed.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith("#")) {
        headings.push(line.replace(/^#+\s*/, "").trim());
      }
    }
  }

  const words = extractedText.split(/\s+/).filter(Boolean);

  return {
    format: cleanFormat,
    charCount: extractedText.length,
    wordCount: words.length,
    lineCount: extractedText.split(/\r?\n/).length,
    headings,
    tables: tables.length > 0 ? tables : undefined,
    extractedText,
    summaryPreview: extractedText.slice(0, 400) + (extractedText.length > 400 ? "..." : ""),
  };
}

export const documentProcessorTool: ToolDefinition = {
  name: "document_processor",
  displayName: "Document & Multimodal File Analyzer",
  description: "Extract text, structure, tabular data, and key metrics from uploaded documents (PDF, CSV, JSON, Markdown, TXT, DOCX).",
  category: "file",
  riskLevel: "safe",
  parameters: {
    format: {
      type: "string",
      description: "File extension or format type (e.g. 'csv', 'json', 'pdf', 'txt', 'md')",
      required: true,
      default: "txt",
    },
    rawContent: {
      type: "string",
      description: "Raw text or base64 file content to parse and analyze",
      required: true,
    },
    query: {
      type: "string",
      description: "Specific question or analysis target to extract from document",
      required: false,
    },
  },
  execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    try {
      const format = String(params.format || "txt");
      let raw = String(params.rawContent || "");

      // If base64 encoded text
      if (raw.includes(";base64,")) {
        const [, b64] = raw.split(";base64,");
        raw = Buffer.from(b64, "base64").toString("utf-8");
      }

      const parsed = extractDocumentContent(raw, format);

      return {
        toolName: "document_processor",
        success: true,
        output: parsed,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        toolName: "document_processor",
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};

