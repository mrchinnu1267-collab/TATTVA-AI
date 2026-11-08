/**
 * TATTVA AI - Intelligent Multilingual File & Document Intent Recognizer
 * Automatically selects genuine Microsoft Office (.docx, .xlsx, .pptx) and standard formats
 * Supports English, Telugu, Hindi, Tamil, and transliterated queries
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type DocumentFormat = "docx" | "xlsx" | "pptx" | "pdf" | "csv" | "txt" | "html" | "json" | "rtf" | "doc" | "xls" | "ppt" | "xml";

export interface DocumentGenerationIntent {
  isDocumentRequest: boolean;
  format: DocumentFormat;
  topic: string;
  category: "presentation" | "document" | "spreadsheet" | "data";
  detectedLanguage: string;
  originalQuery: string;
}

/**
 * Intelligent file-type classifier:
 * - "Create an assignment about DBMS" -> DOCX
 * - "Prepare a project report" -> DOCX
 * - "Create a question bank" -> DOCX
 * - "Create a resume" -> DOCX
 * - "Create a presentation about AI" -> PPTX
 * - "Prepare student marks analysis" -> XLSX
 * - "Create a financial report / budget" -> XLSX
 */
export function detectDocumentGenerationIntent(query: string): DocumentGenerationIntent {
  if (!query || typeof query !== "string") {
    return {
      isDocumentRequest: false,
      format: "docx",
      topic: "",
      category: "document",
      detectedLanguage: "en",
      originalQuery: "",
    };
  }

  const clean = query.trim();
  const lower = clean.toLowerCase();

  // 1. Language Detection
  const hasTelugu = /[\u0C00-\u0C7F]/.test(clean);
  const hasHindi = /[\u0900-\u097F]/.test(clean);
  const detectedLanguage = hasTelugu ? "te" : hasHindi ? "hi" : "en";

  // 2. Action Verbs Across Languages
  const hasActionVerb =
    // English
    /\b(create|generate|make|build|prepare|design|draft|write|export|produce|give me|i need|can you (make|create|generate)|develop)\b/i.test(lower) ||
    // Telugu
    /\b(chey|cheyyi|cheyandi|cheyali|tayaru|kavali|ivvu|pettandi)\b/i.test(lower) ||
    /చేయి|చేయ్|చెయ్యి|చేయండి|తయారు|కావాలి|ఇవ్వు/i.test(clean) ||
    // Hindi
    /\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/i.test(lower) ||
    /बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|बना/i.test(clean);

  // 3. Format Specific Keywords & Contextual Heuristics

  // Presentation (PPTX / PPT)
  const isPpt =
    /\b(ppt|pptx|powerpoint|presentation|slides|slide deck|pitch deck|deck|seminar slides|keynote)\b/i.test(lower) ||
    /\b(slides? on|slides? about|presentation on|presentation about)\b/i.test(lower) ||
    /పిపిటి|ప్రెజెంటేషన్|స్లైడ్స్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन|स्लाइड्स/i.test(clean);

  // Spreadsheet (XLSX / XLS / CSV)
  const isExcel =
    /\b(excel|xlsx|xls|spreadsheet|sheet|marks analysis|student marks|student score|grade sheet|report card)\b/i.test(lower) ||
    /\b(financial report|balance sheet|profit and loss|p&l|budget|expense|payroll|cash flow|sales forecast|financial model|ledger|tracker)\b/i.test(lower) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్|బడ్జెట్/i.test(clean) ||
    /एक्सेल|स्प्रेडशीट|बजट/i.test(clean);

  const isCsv = /\b(csv|comma separated|delimited)\b/i.test(lower);

  // Document (DOCX / DOC / RTF)
  const isWord =
    /\b(word|docx|doc|rtf|assignment|project report|report|question bank|question paper|exam paper|resume|cv|curriculum vitae|thesis|dissertation|essay|article|whitepaper|case study|study guide|syllabus)\b/i.test(lower) ||
    /\b(assignment on|assignment about|report on|report about|notes on|notes about)\b/i.test(lower) ||
    /వర్డ్|డాక్యుమెంట్|అసైన్‌మెంట్|రిపోర్ట్/i.test(clean) ||
    /वर्ड|डॉक्यूमेंट|असाइनमेंट|रिपोर्ट/i.test(clean);

  // PDF
  const isPdf = /\b(pdf|pdf format|portable document)\b/i.test(lower);

  // Other formats
  const isTxt = /\b(txt|text file|plain text)\b/i.test(lower);
  const isHtml = /\b(html|html file|webpage)\b/i.test(lower);
  const isXml = /\b(xml|xml file)\b/i.test(lower);
  const isJson = /\b(json|json data)\b/i.test(lower);

  // Contextual Trigger
  const isContextualRequest =
    isPpt ||
    isExcel ||
    isWord ||
    isPdf ||
    isCsv ||
    isTxt ||
    isHtml ||
    isXml ||
    isJson;

  const isDocumentRequest =
    (isContextualRequest && (hasActionVerb || /\b(on|about|for|gurinchi|meeda|par|pe|ke liye)\b/i.test(lower))) ||
    /^(create|make|generate|prepare)\s+a?\s*(ppt|document|file|assignment|presentation|spreadsheet|sheet|report)\b/i.test(lower);

  if (!isDocumentRequest) {
    return {
      isDocumentRequest: false,
      format: "docx",
      topic: "",
      category: "document",
      detectedLanguage,
      originalQuery: clean,
    };
  }

  // 4. Resolve exact format & category
  let format: DocumentFormat = "docx";
  let category: "presentation" | "document" | "spreadsheet" | "data" = "document";

  if (isPpt) {
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
  } else if (lower.includes(".rtf")) {
    format = "rtf";
    category = "document";
  } else if (lower.includes(".doc\b")) {
    format = "doc";
    category = "document";
  } else {
    // Default document format is genuine DOCX
    format = "docx";
    category = "document";
  }

  // 5. Cleanly Extract the Topic / Mind of the User
  let topic = clean;
  topic = topic
    .replace(/\[\s*Mode:\s*[^\]]+\]:?/gi, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/\b(please|can you|could you|i want to|i need to|i want|i need|give me a|give me)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce)\b/gi, "")
    .replace(/\b(a|an|the)\s+(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/gi, "")
    .replace(/\b(a|an|the)\s+(word doc|word document|docx|doc|document|assignment|project report|question bank|resume)\b/gi, "")
    .replace(/\b(a|an|the)\s+(excel sheet|excel|xlsx|spreadsheet|sheet|marks analysis|financial report|budget)\b/gi, "")
    .replace(/\b(a|an|the)\s+(pdf report|pdf document|pdf|csv file|csv|text file|txt)\b/gi, "")
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
      .replace(/\b(create|generate|make|prepare|ppt|word|excel|assignment|chey|banao)\b/gi, "")
      .trim();
  }
  if (!topic) {
    topic = category === "presentation"
      ? "Artificial Intelligence & Future Technology"
      : category === "spreadsheet"
        ? "Financial Analysis & Performance Metrics"
        : "Database Management Systems (DBMS)";
  }

  // Capitalize title words
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
    detectedLanguage,
    originalQuery: clean,
  };
}
