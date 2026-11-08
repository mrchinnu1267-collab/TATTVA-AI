/**
 * TATTVA AI - Intelligent User Intent Understanding & Document Archetype Engine
 * Analyzes natural language instructions (even short topic names or incomplete requests)
 * and determines:
 * - Document Archetype (assignment, presentation, research_report, study_notes, spreadsheet, code, etc.)
 * - File Format (DOCX, PPTX, XLSX, PDF, CSV, TXT, MD, JSON, Source Code)
 * - Audience, tone, formatting requirements, and predicted next needs
 * - Confidence scoring and ambiguity detection
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type DocumentFormat =
  | "docx"
  | "xlsx"
  | "pptx"
  | "pdf"
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
  | "cpp"
  | "sql";

export type DocumentArchetype =
  | "assignment"
  | "presentation"
  | "research_report"
  | "study_notes"
  | "spreadsheet"
  | "source_code"
  | "general_document";

export type DocumentAudience = "academic" | "business" | "technical" | "financial" | "general";

export interface DocumentIntentResult {
  isDocumentRequest: boolean;
  confidence: number; // 0.0 to 1.0
  needsClarification: boolean;
  clarificationQuestion?: string;
  topic: string;
  archetype: DocumentArchetype;
  format: DocumentFormat;
  audience: DocumentAudience;
  length: {
    slideCount?: number;
    sectionCount?: number;
    depth: "brief" | "standard" | "comprehensive";
  };
  formattingRequirements: string[];
  predictedNextNeeds: string[];
  detectedLanguage: string;
  originalQuery: string;
  isConfirmedPreference: boolean;
}

export interface IntentContextOptions {
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  preferences?: Record<string, any>;
  hasAttachments?: boolean;
}

/**
 * Intelligent single-instruction & context-aware intent processor
 */
export function detectDocumentIntent(
  query: string,
  options?: IntentContextOptions
): DocumentIntentResult {
  const clean = (query || "").trim();
  const lower = clean.toLowerCase();

  // 1. Language Detection
  const hasTelugu = /[\u0C00-\u0C7F]/.test(clean);
  const hasHindi = /[\u0900-\u097F]/.test(clean);
  const detectedLanguage = hasTelugu ? "te" : hasHindi ? "hi" : "en";

  // 2. Action keywords and indicators
  const hasActionVerb =
    /\b(create|generate|make|build|prepare|design|draft|write|export|produce|give me|i need|can you (make|create|generate)|develop)\b/i.test(lower) ||
    /\b(chey|cheyyi|cheyandi|cheyali|tayaru|kavali|ivvu)\b/i.test(lower) ||
    /చేయి|చేయ్|చెయ్యి|చేయండి|తయారు|కావాలి|ఇవ్వు/i.test(clean) ||
    /\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/i.test(lower) ||
    /बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|बना/i.test(clean);

  // 3. Explicit Document Terms
  const isPptTerm =
    /\b(ppt|pptx|powerpoint|presentation|slides|slide deck|pitch deck|deck|keynote|seminar slides)\b/i.test(lower) ||
    /పిపిటి|ప్రెజెంటేషన్|స్లైడ్స్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन|स्लाइड्स/i.test(clean);

  const isExcelTerm =
    /\b(excel|xlsx|xls|spreadsheet|sheet|worksheet|data table|financial report|budget|p&l|balance sheet|tracker|inventory|marks analysis|ledger)\b/i.test(lower) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్/i.test(clean) ||
    /एक्सेल|स्प्रेडशीट/i.test(clean);

  const isDocxTerm =
    /\b(word doc|word document|docx|doc|assignment|project report|essay|thesis|dissertation|research paper|case study|whitepaper|handbook|manual)\b/i.test(lower) ||
    /వర్డ్|అసైన్‌మెంట్/i.test(clean) ||
    /वर्ड|असाइनमेंट/i.test(clean);

  const isPdfTerm = /\b(pdf|pdf document|pdf report|handout|brochure)\b/i.test(lower);
  const isCsvTerm = /\b(csv|csv file|comma separated)\b/i.test(lower);
  const isCodeTerm = /\b(\.py|\.ts|\.js|\.java|\.cpp|\.sql|python script|java program|typescript file|sql script)\b/i.test(lower);

  // 4. Slide Count Extraction
  let requestedSlideCount: number | undefined = undefined;
  const slideCountMatch = lower.match(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/i);
  if (slideCountMatch && slideCountMatch[1]) {
    const parsedCount = parseInt(slideCountMatch[1], 10);
    if (parsedCount >= 2 && parsedCount <= 30) {
      requestedSlideCount = parsedCount;
    }
  }

  // 5. Analyze Previous Conversation Context
  let contextFavorsPpt = false;
  let contextFavorsAcademic = false;
  let contextFavorsSpreadsheet = false;

  if (options?.history && options.history.length > 0) {
    const recentHistory = options.history.slice(-4).map((h) => h.content.toLowerCase()).join(" ");
    if (/\b(presentation|slides|deck|pptx|powerpoint)\b/.test(recentHistory)) {
      contextFavorsPpt = true;
    }
    if (/\b(assignment|college|university|exam|student|syllabus|homework)\b/.test(recentHistory)) {
      contextFavorsAcademic = true;
    }
    if (/\b(excel|spreadsheet|table|rows|columns|xlsx|budget)\b/.test(recentHistory)) {
      contextFavorsSpreadsheet = true;
    }
  }

  // 6. Check if query is just a topic name (e.g. "Artificial Intelligence", "Quantum Computing", "DBMS")
  const words = clean.split(/\s+/).filter(Boolean);
  const isShortTopic = words.length >= 1 && words.length <= 6 && !hasActionVerb && !isPptTerm && !isExcelTerm && !isDocxTerm;

  // Determine isDocumentRequest and Confidence
  let isDocumentRequest = false;
  let confidence = 0.5;

  if (hasActionVerb && (isPptTerm || isExcelTerm || isDocxTerm || isPdfTerm || isCsvTerm || isCodeTerm)) {
    isDocumentRequest = true;
    confidence = 0.95;
  } else if (isPptTerm || isExcelTerm || isDocxTerm || isPdfTerm || isCsvTerm) {
    isDocumentRequest = true;
    confidence = 0.9;
  } else if (hasActionVerb && words.length >= 2) {
    isDocumentRequest = true;
    confidence = 0.8;
  } else if (isShortTopic && (contextFavorsPpt || contextFavorsAcademic || contextFavorsSpreadsheet)) {
    isDocumentRequest = true;
    confidence = 0.85;
  } else if (isShortTopic && words.length >= 1) {
    // Pure topic entered (e.g. "Artificial Intelligence")
    isDocumentRequest = true;
    confidence = 0.75;
  }

  // Ambiguity check
  let needsClarification = false;
  let clarificationQuestion: string | undefined;

  if (words.length === 1 && /^(it|this|that|file|doc|ppt)$/i.test(words[0]) && (!options?.history || options.history.length === 0)) {
    needsClarification = true;
    clarificationQuestion = "Could you please specify the topic or content you would like me to prepare?";
    confidence = 0.2;
  }

  // 7. Resolve Archetype & Format
  let archetype: DocumentArchetype = "research_report";
  let format: DocumentFormat = "docx";

  if (isPptTerm || requestedSlideCount || contextFavorsPpt) {
    archetype = "presentation";
    format = "pptx";
  } else if (isExcelTerm || contextFavorsSpreadsheet) {
    archetype = "spreadsheet";
    format = isCsvTerm ? "csv" : "xlsx";
  } else if (isCodeTerm) {
    archetype = "source_code";
    if (lower.includes(".py") || lower.includes("python")) format = "py";
    else if (lower.includes(".ts") || lower.includes("typescript")) format = "ts";
    else if (lower.includes(".java")) format = "java";
    else if (lower.includes(".sql")) format = "sql";
    else format = "js";
  } else if (/\b(assignment|homework|coursework)\b/i.test(lower) || contextFavorsAcademic) {
    archetype = "assignment";
    format = isPdfTerm ? "pdf" : "docx";
  } else if (/\b(notes|study notes|revision|cheat sheet)\b/i.test(lower)) {
    archetype = "study_notes";
    format = isPdfTerm ? "pdf" : "docx";
  } else if (isPdfTerm) {
    archetype = "research_report";
    format = "pdf";
  } else if (isCsvTerm) {
    archetype = "spreadsheet";
    format = "csv";
  } else {
    archetype = "research_report";
    format = "docx";
  }

  // 8. Resolve Audience
  let audience: DocumentAudience = "general";
  if (archetype === "assignment" || archetype === "study_notes" || /\b(student|exam|university|college|academic)\b/i.test(lower)) {
    audience = "academic";
  } else if (archetype === "spreadsheet" || /\b(financial|revenue|budget|profit|cost|ebitda)\b/i.test(lower)) {
    audience = "financial";
  } else if (archetype === "source_code" || /\b(technical|architecture|algorithm|engineer)\b/i.test(lower)) {
    audience = "technical";
  } else if (/\b(business|executive|client|stakeholder|proposal|pitch)\b/i.test(lower)) {
    audience = "business";
  }

  // 9. Clean Topic Extraction
  let topic = clean;
  topic = topic
    .replace(/^\[\s*Mode:[^\]]+\]:?\s*/i, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/gi, "")
    .replace(/\b(please|can you|could you|i want to|i need to|i want|i need|give me a|give me)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce)\b/gi, "")
    .replace(/\b(a|an|the)\s+(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/gi, "")
    .replace(/\b(a|an|the)\s+(word doc|word document|docx|doc|document|assignment|project report|research paper|notes)\b/gi, "")
    .replace(/\b(a|an|the)\s+(excel sheet|excel|xlsx|spreadsheet|sheet|budget|csv file|pdf report|pdf)\b/gi, "")
    .replace(/\b(ppt|pptx|powerpoint|presentation|slides|word|docx|excel|xlsx|spreadsheet|assignment)\b/gi, "")
    .replace(/\b(chey|cheyyi|cheyandi|cheyali|tayaru chey|kavali|ivvu|banao|banaiye|karo)\b/gi, "")
    .replace(/చేయి|చేయ్|చెయ్యి|చేయండి|తయారు చేయి|కావాలి|ఇవ్వు|పిపిటి|ప్రెజెంటేషన్/g, "")
    .replace(/बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|पीपीटी|प्रेजेंटेशन/g, "")
    .replace(/\b(on|about|regarding|for|meeda|gurinchi|par|pe)\b/gi, " ")
    .replace(/[?!.,;:"']/g, " ")
    .trim();

  if (!topic || topic.length < 2) {
    topic = clean
      .replace(/\[\s*Mode:[^\]]+\]:?/gi, "")
      .replace(/\b(create|generate|make|prepare|ppt|word|excel|assignment)\b/gi, "")
      .trim();
  }

  if (!topic) {
    topic = archetype === "presentation" ? "Artificial Intelligence & Future Innovations" : "Comprehensive Technical Analysis";
  }

  // Title-case topic
  topic = topic
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 80);

  // 10. Depth & Length Configuration
  const isComprehensive = /\b(comprehensive|detailed|in-depth|complete|full|exhaustive|deep dive)\b/i.test(lower);
  const isBrief = /\b(brief|short|quick|concise|summary|overview)\b/i.test(lower);
  const depth: "brief" | "standard" | "comprehensive" = isBrief ? "brief" : isComprehensive ? "comprehensive" : "standard";

  const slideCount = requestedSlideCount || (depth === "brief" ? 6 : depth === "comprehensive" ? 12 : 8);
  const sectionCount = depth === "brief" ? 4 : depth === "comprehensive" ? 8 : 6;

  // 11. Formatting Requirements & Predicted Next Needs
  const formattingRequirements: string[] = [];
  if (archetype === "presentation") {
    formattingRequirements.push("16:9 widescreen layout", "Bullet points with visual suggestions", "Speaker notes");
  } else if (archetype === "spreadsheet") {
    formattingRequirements.push("Styled header rows", "Calculated formulas (SUM/AVERAGE)", "Alternating zebra rows");
  } else {
    formattingRequirements.push("Executive summary", "Structured numbered sections", "Data comparison table", "Verifiable references");
  }

  const predictedNextNeeds: string[] = [];
  if (archetype === "presentation") {
    predictedNextNeeds.push("Speaker script / presentation notes", "Executive handout document");
  } else if (archetype === "assignment") {
    predictedNextNeeds.push("Bibliography / IEEE citations check", "Key concept revision flashcards");
  } else if (archetype === "research_report") {
    predictedNextNeeds.push("Methodology deep dive", "Slide deck summary for presentation");
  }

  return {
    isDocumentRequest,
    confidence,
    needsClarification,
    clarificationQuestion,
    topic,
    archetype,
    format,
    audience,
    length: {
      slideCount: archetype === "presentation" ? slideCount : undefined,
      sectionCount,
      depth,
    },
    formattingRequirements,
    predictedNextNeeds,
    detectedLanguage,
    originalQuery: clean,
    isConfirmedPreference: false,
  };
}

