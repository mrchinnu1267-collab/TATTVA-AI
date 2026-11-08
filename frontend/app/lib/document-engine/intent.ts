/**
 * TATTVA AI - Universal Multilingual File & Document Intent Recognizer
 * Analyzes natural language instructions and extracts:
 * - Purpose, format, slide count, tone, audience, and source file references
 * Supports English, Telugu, Hindi, Tamil, and transliterated queries
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type DocumentFormat =
  | "docx"
  | "xlsx"
  | "pptx"
  | "pdf"
  | "csv"
  | "txt"
  | "html"
  | "json"
  | "xml"
  | "rtf"
  | "doc"
  | "xls"
  | "ppt"
  | "md"
  | "java"
  | "py"
  | "c"
  | "cpp"
  | "js"
  | "ts"
  | "sql"
  | "svg";

export type DocumentAudience = "academic" | "business" | "technical" | "financial" | "general";

export interface DocumentGenerationIntent {
  isDocumentRequest: boolean;
  format: DocumentFormat;
  topic: string;
  category: "presentation" | "document" | "spreadsheet" | "data" | "code";
  audience: DocumentAudience;
  requestedSlideCount?: number;
  useUploadedAttachment?: boolean;
  detectedLanguage: string;
  originalQuery: string;
}

/**
 * Intelligent single-instruction intent processor:
 * - "Create a 15-slide presentation about Machine Learning" -> PPTX, 15 slides, technical/general
 * - "Prepare a complete DBMS assignment" -> DOCX, academic
 * - "Create an Excel sheet for student marks" -> XLSX, academic/spreadsheet
 * - "Create a financial report / budget" -> XLSX, financial
 * - "Generate a Java program as a .java file" -> JAVA, code
 * - "Create a project report using my uploaded PDF" -> DOCX/PDF, useUploadedAttachment: true
 */
export function detectDocumentGenerationIntent(query: string, hasAttachments = false): DocumentGenerationIntent {
  if (!query || typeof query !== "string") {
    return {
      isDocumentRequest: false,
      format: "docx",
      topic: "",
      category: "document",
      audience: "general",
      detectedLanguage: "en",
      originalQuery: "",
    };
  }

  // Strip any leading mode flags (e.g. "[Mode: Web Search & Fact Retrieval]: ...")
  const clean = query
    .replace(/^\[\s*Mode:[^\]]+\]:?\s*/i, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .trim();
  const lower = clean.toLowerCase();

  // 1. Language Detection
  const hasTelugu = /[\u0C00-\u0C7F]/.test(clean);
  const hasHindi = /[\u0900-\u097F]/.test(clean);
  const detectedLanguage = hasTelugu ? "te" : hasHindi ? "hi" : "en";

  // 2. Action Verbs
  const hasActionVerb =
    /\b(create|generate|make|build|prepare|design|draft|write|export|produce|give me|i need|can you (make|create|generate)|develop)\b/i.test(lower) ||
    /\b(chey|cheyyi|cheyandi|cheyali|tayaru|kavali|ivvu|pettandi)\b/i.test(lower) ||
    /చేయి|చేయ్|చెయ్యి|చేయండి|తయారు|కావాలి|ఇవ్వు/i.test(clean) ||
    /\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/i.test(lower) ||
    /बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|बना/i.test(clean);

  // 3. Extract Specific Slide Count if Requested (e.g. "15-slide presentation", "10 slides", "20 slides")
  let requestedSlideCount: number | undefined = undefined;
  const slideCountMatch = lower.match(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/i);
  if (slideCountMatch && slideCountMatch[1]) {
    const parsedCount = parseInt(slideCountMatch[1], 10);
    if (parsedCount >= 2 && parsedCount <= 30) {
      requestedSlideCount = parsedCount;
    }
  }

  // 4. Source Attachment Reference
  const useUploadedAttachment =
    hasAttachments &&
    /\b(uploaded|attachment|attached|from this (pdf|document|file)|using (my|the) (pdf|file|doc))\b/i.test(lower);

  // 5. Code File Formats Detection
  const isJava = /\b(java program|java file|\.java|in java)\b/i.test(lower);
  const isPython = /\b(python script|python file|\.py|in python)\b/i.test(lower) && !lower.includes("pptx") && !lower.includes("powerpoint");
  const isCpp = /\b(c\+\+ program|c\+\+ file|\.cpp|in c\+\+)\b/i.test(lower);
  const isC = /\b(c program|c file|\.c file|in c language)\b/i.test(lower);
  const isSql = /\b(sql script|sql file|\.sql|database schema sql|sql queries)\b/i.test(lower);
  const isJs = /\b(javascript file|\.js file|node\.js script)\b/i.test(lower);
  const isTs = /\b(typescript file|\.ts file)\b/i.test(lower);

  const isCode = isJava || isPython || isCpp || isC || isSql || isJs || isTs;

  // 6. Presentation Formats
  const isPpt =
    Boolean(requestedSlideCount) ||
    /\b(ppt|pptx|powerpoint|presentation|slides|slide deck|pitch deck|deck|seminar slides|keynote)\b/i.test(lower) ||
    /\b(slides? on|slides? about|presentation on|presentation about)\b/i.test(lower) ||
    /పిపిటి|ప్రెజెంటేషన్|స్లైడ్స్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन|स्लाइड्स/i.test(clean);

  // 7. Spreadsheet Formats
  const isExcel =
    /\b(excel|xlsx|xls|spreadsheet|sheet|marks analysis|student marks|marks calculator|grade sheet|report card)\b/i.test(lower) ||
    /\b(financial report|balance sheet|profit and loss|p&l|budget|expense|payroll|cash flow|sales forecast|financial model|ledger|tracker)\b/i.test(lower) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్|బడ్జెట్/i.test(clean) ||
    /एक्सेल|स्प parse|बजट/i.test(clean);

  const isCsv = /\b(csv|comma separated|delimited)\b/i.test(lower);

  // 8. Word Document Formats
  const isWord =
    /\b(word|docx|doc|rtf|assignment|project report|report|question bank|question paper|exam paper|resume|cv|curriculum vitae|thesis|dissertation|essay|article|whitepaper|case study|study guide|syllabus)\b/i.test(lower) ||
    /\b(assignment on|assignment about|report on|report about|notes on|notes about)\b/i.test(lower) ||
    /వర్డ్|డాక్యుమెంట్|అసైన్‌మెంట్|రిపోర్ట్/i.test(clean) ||
    /वर्ड|डॉक्यूमेंट|असाइनमेंट|रिपोर्ट/i.test(clean);

  // 9. PDF Formats
  const isPdf = /\b(pdf|pdf format|portable document|research report in pdf|pdf report)\b/i.test(lower);

  // 10. Data & Markup Formats
  const isJson = /\b(json|json file|json data)\b/i.test(lower);
  const isHtml = /\b(html|html file|webpage)\b/i.test(lower);
  const isXml = /\b(xml|xml file)\b/i.test(lower);
  const isTxt = /\b(txt|text file|plain text)\b/i.test(lower);
  const isSvg = /\b(svg|vector graphics)\b/i.test(lower);

  const isContextualRequest =
    isPpt ||
    isExcel ||
    isWord ||
    isPdf ||
    isCsv ||
    isCode ||
    isJson ||
    isHtml ||
    isXml ||
    isTxt ||
    isSvg;

  const isDocumentRequest =
    (isContextualRequest && (
      hasActionVerb ||
      isPpt ||
      isCode ||
      isCsv ||
      /\b(assignment|spreadsheet|analysis|report|presentation|slides|deck|question bank|resume)\b/i.test(lower) ||
      /\b(on|about|for|gurinchi|meeda|par|pe|ke liye)\b/i.test(lower)
    )) ||
    /^(create|make|generate|prepare)\s+a?\s*(ppt|document|file|assignment|presentation|spreadsheet|sheet|report|program)\b/i.test(lower);

  if (!isDocumentRequest) {
    return {
      isDocumentRequest: false,
      format: "docx",
      topic: "",
      category: "document",
      audience: "general",
      detectedLanguage,
      originalQuery: clean,
    };
  }

  // 11. Resolve Audience & Tone
  let audience: DocumentAudience = "general";
  if (/\b(assignment|thesis|dissertation|syllabus|study guide|exam|student|school|university|academic|course)\b/i.test(lower)) {
    audience = "academic";
  } else if (/\b(financial|budget|expense|revenue|p&l|balance sheet|ebitda|audit|fiscal|payroll)\b/i.test(lower)) {
    audience = "financial";
  } else if (/\b(code|algorithm|system|api|architecture|program|database|dbms|technical|engineer)\b/i.test(lower)) {
    audience = "technical";
  } else if (/\b(executive|business|pitch|stakeholder|quarterly|strategic|client|proposal)\b/i.test(lower)) {
    audience = "business";
  }

  // 12. Resolve exact format & category
  let format: DocumentFormat = "docx";
  let category: "presentation" | "document" | "spreadsheet" | "data" | "code" = "document";

  if (isCode) {
    category = "code";
    if (isJava) format = "java";
    else if (isPython) format = "py";
    else if (isCpp) format = "cpp";
    else if (isC) format = "c";
    else if (isSql) format = "sql";
    else if (isTs) format = "ts";
    else format = "js";
  } else if (isPpt) {
    format = lower.includes(".ppt\b") ? "ppt" : "pptx";
    category = "presentation";
  } else if (isExcel) {
    format = lower.includes(".xls\b") ? "xls" : "xlsx";
    category = "spreadsheet";
  } else if (isCsv) {
    format = "csv";
    category = "spreadsheet";
  } else if (isPdf) {
    format = "pdf";
    category = "document";
  } else if (isTxt) {
    format = "txt";
    category = "document";
  } else if (isHtml) {
    format = "html";
    category = "document";
  } else if (isXml) {
    format = "xml";
    category = "data";
  } else if (isJson) {
    format = "json";
    category = "data";
  } else if (isSvg) {
    format = "svg";
    category = "data";
  } else if (lower.includes(".rtf")) {
    format = "rtf";
    category = "document";
  } else if (lower.includes(".doc\b")) {
    format = "doc";
    category = "document";
  } else {
    format = "docx";
    category = "document";
  }

  // 13. Cleanly Extract the Topic / Mind of the User
  let topic = clean;
  topic = topic
    .replace(/\[\s*Mode:\s*[^\]]+\]:?/gi, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/gi, "")
    .replace(/\b(using\s+(my|the)?\s*(uploaded\s+)?(pdf|document|file))\b/gi, "")
    .replace(/\b(please|can you|could you|i want to|i need to|i want|i need|give me a|give me)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce)\b/gi, "")
    .replace(/\b(a|an|the)\s+(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/gi, "")
    .replace(/\b(a|an|the)\s+(word doc|word document|docx|doc|document|assignment|project report|question bank|resume)\b/gi, "")
    .replace(/\b(a|an|the)\s+(excel sheet|excel|xlsx|spreadsheet|sheet|marks analysis|financial report|budget)\b/gi, "")
    .replace(/\b(a|an|the)\s+(pdf report|pdf document|pdf|csv file|csv|text file|txt|java program|java file|python script)\b/gi, "")
    .replace(/\b(ppt|pptx|powerpoint|presentation|slides|word|docx|excel|xlsx|spreadsheet|assignment|marks analysis)\b/gi, "")
    .replace(/\b(chey|cheyyi|cheyandi|cheyali|tayaru chey|kavali|ivvu|pettandi)\b/gi, "")
    .replace(/చేయి|చేయ్|చెయ్యి|చేయండి|తయారు చేయి|కావాలి|ఇవ్వు|పిపిటి|ప్రెజెంటేషన్/g, "")
    .replace(/\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/gi, "")
    .replace(/बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|पीपीटी|प्रेजेंटेशन/g, "")
    .replace(/\b(gurinchi|meeda|par|pe|ke liye|for|on|about|regarding)\b/gi, "")
    .replace(/[?!.,;:"']/g, " ")
    .trim();

  if (!topic || topic.length < 2) {
    topic = clean
      .replace(/\[\s*Mode:\s*[^\]]+\]:?/gi, "")
      .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
      .replace(/\b(create|generate|make|prepare|ppt|word|excel|assignment|chey|banao)\b/gi, "")
      .trim();
  }
  if (!topic) {
    topic = category === "presentation"
      ? "Artificial Intelligence & Future Technology"
      : category === "spreadsheet"
        ? "Financial Analysis & Performance Metrics"
        : category === "code"
          ? "Algorithm Implementation"
          : "Database Management Systems (DBMS)";
  }

  // Capitalize title words cleanly
  topic = topic
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 80);

  return {
    isDocumentRequest: true,
    format,
    topic,
    category,
    audience,
    requestedSlideCount,
    useUploadedAttachment,
    detectedLanguage,
    originalQuery: clean,
  };
}
