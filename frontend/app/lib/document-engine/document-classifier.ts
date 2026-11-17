/**
 * TATTVA AI - Intelligent Document Classifier & Structure Analyzer
 * Analyzes document text, headers, and metadata to classify intent, genre, and structure.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type DocumentCategory =
  | "technical_specification"
  | "research_paper"
  | "source_code"
  | "financial_report"
  | "tabular_dataset"
  | "legal_policy"
  | "presentation_deck"
  | "general_document";

export interface DocumentClassificationResult {
  category: DocumentCategory;
  confidence: number;
  detectedFormat: string;
  wordCount: number;
  sectionCount: number;
  sections: Array<{ title: string; characterOffset: number }>;
  keyEntities: string[];
  hasTables: boolean;
  hasCodeBlocks: boolean;
  summary: string;
}

/**
 * Classifies document genre and extracts structural sections
 */
export function classifyDocument(
  text: string,
  filename: string = "",
  format: string = ""
): DocumentClassificationResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const ext = (filename.split(".").pop() || "").toLowerCase();
  const detectedFormat = format || ext || "txt";

  // Check code files
  const codeExts = ["ts", "js", "py", "java", "cpp", "c", "go", "rs", "sql", "html", "css", "json", "xml"];
  const isCodeExtension = codeExts.includes(ext);
  const hasCodeSyntax =
    /\b(?:export\s+class|export\s+default|export\s+function|import\s+.*\s+from|public\s+static\s+void|def\s+[a-zA-Z0-9_]+\s*\(|function\s+[a-zA-Z0-9_]+\s*\()\b/.test(clean);

  if (isCodeExtension || hasCodeSyntax) {
    return {
      category: "source_code",
      confidence: 0.95,
      detectedFormat,
      wordCount,
      sectionCount: 1,
      sections: [{ title: filename || "Source File", characterOffset: 0 }],
      keyEntities: extractKeyEntities(clean),
      hasTables: false,
      hasCodeBlocks: true,
      summary: `Source code file (${detectedFormat}) containing ${wordCount} tokens across function/class definitions.`,
    };
  }

  // Check tabular datasets
  if (ext === "csv" || ext === "tsv" || ext === "xlsx" || ext === "xls" || (clean.includes("|") && clean.includes("---"))) {
    return {
      category: "tabular_dataset",
      confidence: 0.92,
      detectedFormat,
      wordCount,
      sectionCount: 1,
      sections: [{ title: "Tabular Matrix", characterOffset: 0 }],
      keyEntities: extractKeyEntities(clean),
      hasTables: true,
      hasCodeBlocks: false,
      summary: `Tabular dataset containing rows and columns formatted as ${detectedFormat}.`,
    };
  }

  // Check presentation decks
  if (ext === "pptx" || ext === "ppt" || lower.includes("[slide ") || lower.includes("slide 1:")) {
    return {
      category: "presentation_deck",
      confidence: 0.9,
      detectedFormat,
      wordCount,
      sectionCount: Math.max(1, (clean.match(/\[Slide \d+\]/gi) || []).length),
      sections: extractPresentationSections(clean),
      keyEntities: extractKeyEntities(clean),
      hasTables: clean.includes("|"),
      hasCodeBlocks: false,
      summary: `Presentation slide deck containing multiple structured slides.`,
    };
  }

  // Check research paper
  if (
    lower.includes("abstract") &&
    (lower.includes("introduction") || lower.includes("methodology") || lower.includes("references") || lower.includes("arxiv"))
  ) {
    const sections = extractHeadingSections(clean);
    return {
      category: "research_paper",
      confidence: 0.88,
      detectedFormat,
      wordCount,
      sectionCount: Math.max(1, sections.length),
      sections,
      keyEntities: extractKeyEntities(clean),
      hasTables: clean.includes("|"),
      hasCodeBlocks: clean.includes("```"),
      summary: `Academic research paper structured with Abstract, Methodology, and References.`,
    };
  }

  // Check technical specification
  if (
    lower.includes("architecture") ||
    lower.includes("specification") ||
    lower.includes("api endpoint") ||
    lower.includes("system design")
  ) {
    const sections = extractHeadingSections(clean);
    return {
      category: "technical_specification",
      confidence: 0.85,
      detectedFormat,
      wordCount,
      sectionCount: Math.max(1, sections.length),
      sections,
      keyEntities: extractKeyEntities(clean),
      hasTables: clean.includes("|"),
      hasCodeBlocks: clean.includes("```"),
      summary: `Technical specification or architectural design document detailing system components and protocols.`,
    };
  }

  // Check financial report
  if (
    (lower.includes("balance sheet") || lower.includes("income statement") || lower.includes("revenue") || lower.includes("quarterly report")) &&
    (clean.includes("$") || clean.includes("€") || clean.includes("₹") || clean.includes("%"))
  ) {
    const sections = extractHeadingSections(clean);
    return {
      category: "financial_report",
      confidence: 0.85,
      detectedFormat,
      wordCount,
      sectionCount: Math.max(1, sections.length),
      sections,
      keyEntities: extractKeyEntities(clean),
      hasTables: clean.includes("|"),
      hasCodeBlocks: false,
      summary: `Financial report tracking performance metrics, statements, and revenue indicators.`,
    };
  }

  // Default to general document
  const sections = extractHeadingSections(clean);
  return {
    category: "general_document",
    confidence: 0.75,
    detectedFormat,
    wordCount,
    sectionCount: Math.max(1, sections.length),
    sections,
    keyEntities: extractKeyEntities(clean),
    hasTables: clean.includes("|"),
    hasCodeBlocks: clean.includes("```"),
    summary: `Structured document comprising ${wordCount} words and ${sections.length} sections.`,
  };
}

function extractHeadingSections(text: string): Array<{ title: string; characterOffset: number }> {
  const sections: Array<{ title: string; characterOffset: number }> = [];
  const lines = text.split("\n");
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Markdown headings #, ##, ### or numbered headings 1. Introduction
    if (/^(?:#{1,4}\s+|[0-9]+\.\s+[A-Z])/.test(trimmed)) {
      sections.push({
        title: trimmed.replace(/^#+\s*/, "").replace(/^[0-9]+\.\s*/, ""),
        characterOffset: offset,
      });
    }
    offset += line.length + 1;
  }

  if (sections.length === 0) {
    sections.push({ title: "Overview", characterOffset: 0 });
  }

  return sections;
}

function extractPresentationSections(text: string): Array<{ title: string; characterOffset: number }> {
  const sections: Array<{ title: string; characterOffset: number }> = [];
  const matches = [...text.matchAll(/\[Slide (\d+)\]:?([^\n]*)/gi)];
  for (const m of matches) {
    sections.push({
      title: `Slide ${m[1]}${m[2] ? ` - ${m[2].trim().slice(0, 40)}` : ""}`,
      characterOffset: m.index || 0,
    });
  }
  return sections;
}

function extractKeyEntities(text: string): string[] {
  // Extract capitalized multi-word phrases and acronyms
  const acronyms = new Set(text.match(/\b[A-Z]{2,6}\b/g) || []);
  const titledMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  const entities = new Set<string>();

  for (const a of acronyms) {
    if (entities.size >= 8) break;
    entities.add(a);
  }
  for (const tm of titledMatches) {
    if (entities.size >= 12) break;
    entities.add(tm);
  }

  return Array.from(entities);
}
