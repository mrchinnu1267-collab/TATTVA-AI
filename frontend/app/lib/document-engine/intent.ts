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
  | "c"
  | "cpp"
  | "css"
  | "sql";

export type DocumentArchetype =
  | "assignment"
  | "presentation"
  | "research_report"
  | "study_notes"
  | "spreadsheet"
  | "source_code"
  | "data_file"
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
  preview?: boolean;
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

  // 3. Explicit Document & File Terms
  const isPptTerm =
    /\b(ppt|pptx|powerpoint|presentation|slides?|slide deck|pitch deck|deck|keynote|seminar slides)\b/i.test(lower) ||
    /పిపిటి|ప్రెజెంటేషన్|స్లైడ్స్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन|स्लाइड्स/i.test(clean);

  const isExcelTerm =
    /\b(excel|xlsx|xls|spreadsheet|workbook|sheet|worksheet|data table|financial report|budget sheet|budget|p&l|balance sheet|tracker|inventory|marks analysis|marks sheet|ledger)\b/i.test(lower) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్/i.test(clean) ||
    /एक्सेल|स्प्रेडशीट/i.test(clean);

  const isDocxTerm =
    /\b(word doc|word document|docx|doc|assignment|project report|essay|thesis|dissertation|research paper|case study|whitepaper|handbook|manual)\b/i.test(lower) ||
    /వర్డ్|అసైన్‌మెంట్/i.test(clean) ||
    /वर्ड|असाइनमेंट/i.test(clean);

  const isPdfTerm = /\b(pdf|pdf document|pdf report|pdf file|generate a pdf|as a pdf)\b/i.test(lower);
  const isCsvTerm = /\b(csv|csv file|comma separated)\b/i.test(lower);
  const isJsonTerm = /\b(json|json file|json data|\.json)\b/i.test(lower);
  const isXmlTerm = /\b(xml|xml file|xml document|\.xml)\b/i.test(lower);
  const isMarkdownTerm = /\b(markdown|markdown file|\.md|md file)\b/i.test(lower);
  const isTxtTerm = /\b(text file|txt file|\.txt|plain text file)\b/i.test(lower);

  const isCodeTerm =
    /\b(python (file|script|program)|java (file|program)|typescript (file|code)|javascript (file|code)|cpp (file|code)|c\+\+ (file|code)|c (file|program)|sql (file|script)|html (file|page)|css (file|stylesheet)|\.py|\.ts|\.js|\.java|\.cpp|\.c\b|\.sql|\.html|\.css)\b/i.test(lower) ||
    (/\b(python|java|javascript|typescript|c\+\+|cpp|html|css|sql|script|program|code)\b/i.test(lower) && /\b(file|as a file|give me the file|save as|save it as|download|code file)\b/i.test(lower));

  const hasExplicitFileRequest =
    /\b(as a file|give me the file|save as a file|save it as a file|downloadable file|create a .* file|generate a .* file|write a .* file|make a .* file|in a file|download the file)\b/i.test(lower);

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

  // 6. Check if query is an information / question query vs a file generation task
  const isAnyFileTerm =
    isPptTerm ||
    isExcelTerm ||
    isDocxTerm ||
    isPdfTerm ||
    isCsvTerm ||
    isJsonTerm ||
    isXmlTerm ||
    isMarkdownTerm ||
    isTxtTerm ||
    isCodeTerm ||
    hasExplicitFileRequest;

  // Pure informational questions: "Give me the information about Operating Systems", "What is", "Tell me about"
  const isPureInfoQuery =
    /\b(give me (the )?information (about|on)|tell me (about|on)|what is|who is|explain|describe|how does .* work|how do i)\b/i.test(lower) &&
    !isAnyFileTerm;

  const words = clean.split(/\s+/).filter(Boolean);
  const isShortTopic = words.length >= 1 && words.length <= 6 && !hasActionVerb && !isAnyFileTerm;

  // Determine isDocumentRequest and Confidence
  let isDocumentRequest = false;
  let confidence = 0.5;

  if (isPureInfoQuery) {
    // Explicitly a chat question, NOT a document generation task!
    isDocumentRequest = false;
    confidence = 0.95;
  } else if (hasActionVerb && isAnyFileTerm) {
    isDocumentRequest = true;
    confidence = 0.98;
  } else if (isAnyFileTerm) {
    isDocumentRequest = true;
    confidence = 0.95;
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
  } else if (isExcelTerm) {
    archetype = "spreadsheet";
    format = "xlsx";
  } else if (isCsvTerm) {
    archetype = "spreadsheet";
    format = "csv";
  } else if (isJsonTerm) {
    archetype = "data_file";
    format = "json";
  } else if (isXmlTerm) {
    archetype = "data_file";
    format = "xml";
  } else if (isMarkdownTerm) {
    archetype = "general_document";
    format = "md";
  } else if (isTxtTerm) {
    archetype = "general_document";
    format = "txt";
  } else if (isCodeTerm || lower.includes("program") || lower.includes("script") || lower.includes("code")) {
    archetype = "source_code";
    if (lower.includes(".py") || lower.includes("python")) format = "py";
    else if (lower.includes(".ts") || lower.includes("typescript")) format = "ts";
    else if (lower.includes(".java") || lower.includes("java ")) format = "java";
    else if (lower.includes(".cpp") || lower.includes("c++") || lower.includes("cpp")) format = "cpp";
    else if (lower.includes(".c\b") || lower.includes(" c ") || lower.includes("c program")) format = "c";
    else if (lower.includes(".sql") || lower.includes("sql")) format = "sql";
    else if (lower.includes(".html") || lower.includes("html")) format = "html";
    else if (lower.includes(".css") || lower.includes("css")) format = "css";
    else format = "js";
  } else if (isPdfTerm) {
    archetype = /\b(assignment|homework)\b/i.test(lower) ? "assignment" : "research_report";
    format = "pdf";
  } else if (/\b(assignment|homework|coursework)\b/i.test(lower) || contextFavorsAcademic) {
    archetype = "assignment";
    format = "docx";
  } else if (/\b(notes|study notes|revision|cheat sheet)\b/i.test(lower)) {
    archetype = "study_notes";
    format = "docx";
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
    .replace(/\b(and save it as a file|and give me the file|save as a file|give me the file|as a file|downloadable file|in a file|as file|to file)\b/gi, "")
    .replace(/\b(please|can you|could you|i want to|i need to|i want|i need|give me a|give me)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce)\b/gi, "")
    .replace(/\b(a|an|the)\s+(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/gi, "")
    .replace(/\b(a|an|the)\s+(word doc|word document|docx|doc|document|assignment|project report|research paper|notes)\b/gi, "")
    .replace(/\b(a|an|the)\s+(excel sheet|excel workbook|excel|xlsx|spreadsheet|sheet|budget|csv file|csv|pdf report|pdf document|pdf)\b/gi, "")
    .replace(/\b(a|an|the)\s+(json file|json data|json|xml file|xml document|xml|text file|txt file|txt|markdown file|md file|markdown)\b/gi, "")
    .replace(/\b(a|an|the)\s+(python program|python script|python file|python|java program|java file|java|cpp program|cpp file|cpp|c program|c file|sql script|sql file|sql)\b/gi, "")
    .replace(/\b(ppt|pptx|powerpoint|presentation|slides|word|docx|excel|xlsx|spreadsheet|workbook|assignment|pdf|csv|json|xml|markdown)\b/gi, "")
    .replace(/\b(containing|sample|workbook for|sheet for|data for)\b/gi, "")
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

