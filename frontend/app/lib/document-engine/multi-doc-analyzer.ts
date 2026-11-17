/**
 * TATTVA AI - Multi-Document Understanding, Comparison & Source Code Analysis Engine
 * Multi-file synthesis, table extraction, code inspection, and strict tenant isolation.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export interface SourceCodeAnalysis {
  language: string;
  lineCount: number;
  functions: string[];
  classes: string[];
  imports: string[];
  securityAlerts: string[];
}

export interface DocumentComparisonSummary {
  documentsAnalyzed: string[];
  commonThemes: string[];
  contrastingPoints: string[];
  tabularComparison: Array<{ attribute: string; values: Record<string, string> }>;
  groundedSummary: string;
}

/**
 * Extracts structured tables from CSV, Markdown, or Pipe-delimited spreadsheet text
 */
export function extractTabularData(text: string, filename: string = ""): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // 1. Detect Markdown or Pipe-delimited tables
  const pipeLines = lines.filter((l) => l.includes("|"));
  if (pipeLines.length >= 2) {
    const tableRows: string[][] = [];
    for (const line of pipeLines) {
      if (/^\|?[-:\s|]+\|?$/.test(line)) continue; // Separator row
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c, idx, arr) => (idx === 0 && c === "" ? false : idx === arr.length - 1 && c === "" ? false : true));
      if (cells.length > 0) {
        tableRows.push(cells);
      }
    }

    if (tableRows.length >= 2) {
      const headers = tableRows[0];
      const rows = tableRows.slice(1);
      tables.push({
        headers,
        rows,
        rowCount: rows.length,
      });
    }
  }

  // 2. Detect Comma-Separated Values (CSV) if no markdown table found
  if (tables.length === 0 && (filename.endsWith(".csv") || lines.some((l) => (l.match(/,/g) || []).length >= 2))) {
    const csvRows = lines.map((line) => {
      // Split on comma while respecting quotes
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") inQuotes = !inQuotes;
        else if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });

    if (csvRows.length >= 2) {
      tables.push({
        headers: csvRows[0],
        rows: csvRows.slice(1),
        rowCount: csvRows.length - 1,
      });
    }
  }

  return tables;
}

/**
 * Performs deep semantic inspection on uploaded source code files
 */
export function analyzeSourceCodeFile(content: string, filename: string): SourceCodeAnalysis {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const lines = content.split("\n");
  const lineCount = lines.length;

  let language = "text";
  if (["js", "jsx", "mjs"].includes(ext)) language = "javascript";
  else if (["ts", "tsx"].includes(ext)) language = "typescript";
  else if (["py"].includes(ext)) language = "python";
  else if (["go"].includes(ext)) language = "go";
  else if (["rs"].includes(ext)) language = "rust";
  else if (["java"].includes(ext)) language = "java";
  else if (["c", "h"].includes(ext)) language = "c";
  else if (["cpp", "hpp", "cc"].includes(ext)) language = "cpp";
  else if (["sql"].includes(ext)) language = "sql";
  else if (["php"].includes(ext)) language = "php";

  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];
  const securityAlerts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Imports
    if (/^(import|require|#include|from|use)\s+/i.test(trimmed)) {
      imports.push(trimmed.slice(0, 80));
    }

    // Function definitions
    const fnMatch =
      trimmed.match(/(?:function\s+|def\s+|func\s+|fn\s+)([A-Za-z0-9_]+)/i) ||
      trimmed.match(/([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/i);
    if (fnMatch && fnMatch[1]) {
      functions.push(fnMatch[1]);
    }

    // Class / Struct definitions
    const classMatch = trimmed.match(/(?:class|struct|interface|type)\s+([A-Za-z0-9_]+)/i);
    if (classMatch && classMatch[1]) {
      classes.push(classMatch[1]);
    }

    // Security scans (hardcoded secrets, eval, SQL injection patterns)
    if (/eval\s*\(|exec\s*\(|dangerouslySetInnerHTML/i.test(trimmed)) {
      securityAlerts.push(`Dangerous execution pattern detected: \`${trimmed.slice(0, 60)}\``);
    }
    if (/(?:api[_-]?key|secret|password|jwt_secret)\s*[:=]\s*["'][A-Za-z0-9-_]{16,}["']/i.test(trimmed)) {
      securityAlerts.push(`Potential hardcoded credential or token detected.`);
    }
    if (/\b(?:SELECT|INSERT|UPDATE|DELETE)\b.*?\+\s*[\w$]+/i.test(trimmed)) {
      securityAlerts.push(`Potential unparameterized SQL concatenation.`);
    }
  }

  return {
    language,
    lineCount,
    functions: Array.from(new Set(functions)).slice(0, 30),
    classes: Array.from(new Set(classes)).slice(0, 20),
    imports: Array.from(new Set(imports)).slice(0, 20),
    securityAlerts: Array.from(new Set(securityAlerts)),
  };
}

/**
 * Builds grounded context for multi-document question answering
 * Explicitly distinguishes document-derived facts from model assumptions
 */
export function buildGroundedDocumentContext(
  documents: Array<{ name: string; content: string; mime?: string }>
): string {
  if (!documents || documents.length === 0) return "";

  const docBlocks: string[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const isCode = /\.(py|js|ts|tsx|jsx|go|rs|c|cpp|java|php|sql|json|yaml|yml)$/i.test(doc.name);

    if (isCode) {
      const codeInfo = analyzeSourceCodeFile(doc.content, doc.name);
      docBlocks.push(
        `=== UPLOADED CODEBASE DOCUMENT #${i + 1}: ${doc.name} (${codeInfo.language.toUpperCase()}, ${codeInfo.lineCount} lines) ===\n` +
          `Key Symbols: Functions=[${codeInfo.functions.slice(0, 10).join(", ")}], Classes=[${codeInfo.classes.slice(0, 5).join(", ")}]\n` +
          (codeInfo.securityAlerts.length > 0
            ? `Security Warnings: ${codeInfo.securityAlerts.join("; ")}\n`
            : "") +
          `SOURCE CODE:\n\`\`\`${codeInfo.language}\n${doc.content.slice(0, 10000)}\n\`\`\``
      );
    } else {
      const tables = extractTabularData(doc.content, doc.name);
      docBlocks.push(
        `=== UPLOADED TEXT/DATA DOCUMENT #${i + 1}: ${doc.name} (${(doc.content.length / 1024).toFixed(1)} KB) ===\n` +
          (tables.length > 0 ? `[Extracted Tables Found: ${tables.length} table(s) structured]\n` : "") +
          `DOCUMENT TEXT:\n"""\n${doc.content.slice(0, 10000)}\n"""`
      );
    }
  }

  return (
    `\n\n[STRICT MULTI-DOCUMENT GROUNDING DIRECTIVE]:\n` +
    `You are answering based on the user-provided documents below.\n` +
    `1. Strict Fact Grounding: Every assertion must be derived directly from the supplied document content.\n` +
    `2. Document Identification: When citing facts, explicitly name the specific source document (e.g., "[Per document: ${documents[0]?.name}]").\n` +
    `3. Distinguish External Assumptions: If the documents do not contain the answer, explicitly state: "The provided documents do not contain information on this topic." Never fabricate missing details.\n\n` +
    docBlocks.join("\n\n---\n\n")
  );
}
