/**
 * TATTVA AI - Pre-Generation Document Content Quality & Integrity Validator
 * Validates document and presentation content BEFORE compiling into PDF, PPTX, DOCX, or XLSX.
 * Strictly guarantees topic relevance, domain density, and zero robotic boilerplate filler.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { DocumentArchetype, DocumentFormat } from "./intent";
import { ResearchDossier } from "./researcher";

export interface ContentValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  reasons: string[];
  remedyAction?: "regenerate" | "re-research" | "pass";
  repairedSections?: any[];
  repairedSlides?: any[];
}

export const FORBIDDEN_TOPIC_WORDS = new Set([
  "pdf",
  "pptx",
  "ppt",
  "docx",
  "doc",
  "word",
  "excel",
  "xlsx",
  "xls",
  "csv",
  "spreadsheet",
  "sheet",
  "workbook",
  "slides",
  "slide",
  "slideshow",
  "presentation",
  "report",
  "document",
  "file",
  "txt",
  "json",
  "xml",
  "code",
  "script",
  "assignment",
  "notes",
  "data",
  "matter",
  "content",
  "topic",
  "research",
]);

export const ROBOTIC_BOILERPLATE_PATTERNS = [
  /is a conceptual and practical subject defined by formal principles/i,
  /domain-specific mechanics, and verifiable methodologies/i,
  /Primary Mechanism of /i,
  /Domain specification standard/i,
  /Core System Layer.*Primary processing and state management/i,
  /Maintains operational invariant rules and executes domain workflows/i,
  /sub-layer coordination and data flow/i,
  /\*\*Presentation Structure \(\d+ Slides\):\*\*/i,
  /\*\*Document Structure \(\d+ Sections\):\*\*/i,
  /^Slide \d+:.*Overview.*Pillars/i,
  /empirical and theoretical investigation into/i,
  /systematic synthesis of authoritative technical standards/i,
  /publication delivers foundational analysis, architectural formulations/i,
  /Methodology & Information Gathering/i,
  /Multi-source corroboration across official documentation/i,
  /A balanced engineering assessment reveals clear operational benefits/i,
  /operational invariant/i,
  /high-impact domain essential for next-generation system engineering/i,
];

export function isForbiddenTopic(rawTopic: string): boolean {
  if (!rawTopic || rawTopic.trim().length === 0) return true;
  const lower = rawTopic.trim().toLowerCase();

  // 1. Direct match with forbidden format names
  if (FORBIDDEN_TOPIC_WORDS.has(lower)) return true;

  // 2. Matches format extensions or generic combinations
  if (/^(a\s+|the\s+)?(pdf|ppt|pptx|docx|excel|spreadsheet|document|presentation|file|report)(\s+file|\s+document|\s+format)?$/i.test(lower)) {
    return true;
  }

  // 3. Procedural / conversational command strings
  if (/^(gather|collect|compile|summarize)\s+(the\s+)?(slide|slides|ai|information|matter)/i.test(lower)) {
    return true;
  }

  if (/^(slide\s*wise|slidewise|slide-wise|up\s*to|upto|slide\s*by\s*slide)/i.test(lower)) {
    return true;
  }

  if (/^(now\s+create|create\s+a\s+pdf|make\s+a\s+ppt|as\s+a\s+ppt|of\s+matter|matter\s+of)/i.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Validates document content before binary file compilation
 */
export function validateDocumentContent(params: {
  topic: string;
  archetype: DocumentArchetype;
  format: DocumentFormat;
  sections?: Array<{ heading: string; content?: string; paragraphs?: string[]; bullets?: string[]; callout?: string }>;
  slides?: Array<{ title: string; category?: string; bullets: string[]; takeaway?: string; notes?: string }>;
  research: ResearchDossier;
  hasAttachment?: boolean;
}): ContentValidationResult {
  const { topic, archetype, format, sections, slides, research, hasAttachment } = params;
  const reasons: string[] = [];
  let score = 100;

  // Check 1: Topic Validity (Never allow "Pdf", "Document", or conversational verbs as topic)
  if (isForbiddenTopic(topic)) {
    reasons.push(`Forbidden or invalid topic name detected: "${topic}". Topic must represent a real subject matter, not a file format or command.`);
    return {
      valid: false,
      score: 0,
      reasons,
      remedyAction: "regenerate",
    };
  }

  // Check 2: Content Existence
  const isPpt = archetype === "presentation" || format === "pptx" || (format as string) === "ppt";
  if (isPpt) {
    if (!slides || slides.length === 0) {
      reasons.push("No presentation slides were produced.");
      return { valid: false, score: 0, reasons, remedyAction: "regenerate" };
    }
  } else if (archetype !== "source_code" && archetype !== "data_file") {
    if (!sections || sections.length === 0) {
      reasons.push("No document sections were produced.");
      return { valid: false, score: 0, reasons, remedyAction: "regenerate" };
    }
  }

  // Check 3: Anti-Boilerplate & Anti-Filler Check (Strict zero tolerance)
  const fullTextPieces: string[] = [research.definition, research.backgroundAndMotivation];
  if (slides) {
    for (const s of slides) {
      fullTextPieces.push(s.title, ...(s.bullets || []), s.takeaway || "", s.notes || "");
    }
  }
  if (sections) {
    for (const sec of sections) {
      fullTextPieces.push(sec.heading, sec.content || "", ...(sec.paragraphs || []), ...(sec.bullets || []));
    }
  }
  const combinedText = fullTextPieces.join("\n");

  for (const pattern of ROBOTIC_BOILERPLATE_PATTERNS) {
    if (pattern.test(combinedText)) {
      reasons.push(`Detected robotic filler boilerplate matching pattern: ${pattern.source}`);
      score -= 35;
    }
  }

  // Check 4: Slide Specific Quality & Non-Empty Check
  if (isPpt && slides) {
    let emptyOrStubCount = 0;
    const seenTitles = new Set<string>();

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      const titleLower = s.title.toLowerCase().trim();

      // Check for generic or repeated slide titles
      if (seenTitles.has(titleLower)) {
        reasons.push(`Duplicate slide title detected on slide ${i + 1}: "${s.title}"`);
        score -= 15;
      }
      seenTitles.add(titleLower);

      if (titleLower.includes("presentation structure") || titleLower.includes("document structure")) {
        reasons.push(`Slide ${i + 1} contains outline/planning notes header instead of actual slide matter.`);
        score -= 25;
      }

      if (!s.bullets || s.bullets.length < 2) {
        emptyOrStubCount++;
      }
    }

    if (emptyOrStubCount > 0) {
      reasons.push(`${emptyOrStubCount} slides have fewer than 2 informative bullets.`);
      score -= emptyOrStubCount * 10;
    }
  }

  // Check 5: Document Section Quality Check
  if (!isPpt && sections && sections.length > 0) {
    let emptySectionCount = 0;
    for (const sec of sections) {
      const bodyLength = (sec.content || "").length + (sec.paragraphs || []).join(" ").length + (sec.bullets || []).join(" ").length;
      if (bodyLength < 25) {
        emptySectionCount++;
      }
    }
    if (emptySectionCount > 0) {
      reasons.push(`${emptySectionCount} sections lack substantive body content.`);
      score -= emptySectionCount * 15;
    }
  }

  // Check 6: Domain Keyword Relevance
  const topicWords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const mentionsTopic = topicWords.some((w) => combinedText.toLowerCase().includes(w));
  if (!mentionsTopic && topicWords.length > 0) {
    reasons.push(`The generated content does not sufficiently mention the core subject "${topic}".`);
    score -= 40;
  }

  // Final evaluation
  const valid = score >= 70 && reasons.filter((r) => r.includes("robotic") || r.includes("Forbidden") || r.includes("No presentation")).length === 0;

  return {
    valid,
    score: Math.max(0, score),
    reasons,
    remedyAction: valid ? "pass" : "regenerate",
  };
}
