/**
 * TATTVA AI - Multilingual File & Presentation Intent Recognizer
 * Understands user intent in English, Telugu, Hindi, Tamil, and other languages
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface DocumentGenerationIntent {
  isDocumentRequest: boolean;
  format: "pptx" | "docx" | "xlsx" | "pdf" | "csv" | "txt" | "json";
  topic: string;
  detectedLanguage: string;
  originalQuery: string;
}

/**
 * Detects if a user is asking to create, generate, or make a presentation or file.
 * Handles English, Telugu, Hindi, and transliterated queries.
 */
export function detectDocumentGenerationIntent(query: string): DocumentGenerationIntent {
  if (!query || typeof query !== "string") {
    return {
      isDocumentRequest: false,
      format: "pptx",
      topic: "",
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

  // 2. Format Keywords
  const isPpt =
    /\b(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/i.test(lower) ||
    /పిపిటి|ప్రెజెంటేషన్|స్లైడ్స్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन|स्लाइड्स/i.test(clean);

  const isWord =
    /\b(word|docx|doc|document|essay|article|writeup)\b/i.test(lower) ||
    /వర్డ్|డాక్యుమెంట్/i.test(clean) ||
    /वर्ड|डॉक्यूमेंट/i.test(clean);

  const isExcel =
    /\b(excel|xlsx|xls|spreadsheet|sheet|budget|tracker|ledger)\b/i.test(lower) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్/i.test(clean) ||
    /एक्सेल|स्प्रेडशीट/i.test(clean);

  const isPdf =
    /\b(pdf|whitepaper|formal report)\b/i.test(lower) ||
    /పిడిఎఫ్/i.test(clean) ||
    /पीडीएफ/i.test(clean);

  const isCsv =
    /\b(csv|comma separated|tabular data)\b/i.test(lower) ||
    /సిఎస్వి/i.test(clean) ||
    /सीएसवी/i.test(clean);

  // 3. Action Verbs Across Languages
  const hasActionVerb =
    // English
    /\b(create|generate|make|build|prepare|design|draft|write|export|produce|give me|i need|can you (make|create|generate))\b/i.test(lower) ||
    // Telugu (Native & Transliterated: chey, cheyyi, cheyandi, tayaru chey, kavali, ivvu)
    /\b(chey|cheyyi|cheyandi|cheyali|tayaru|kavali|ivvu|pettandi)\b/i.test(lower) ||
    /చేయి|చేయ్|చెయ్యి|చేయండి|తయారు|కావాలి|ఇవ్వు/i.test(clean) ||
    // Hindi (Native & Transliterated: banao, banaiye, banado, chahiye, dijiye, tayar karo)
    /\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/i.test(lower) ||
    /बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|बना/i.test(clean);

  // Quick matches: e.g. "create a ppt on solar energy", "ppt on solar energy", "solar energy ppt"
  const isDirectPptQuery =
    (isPpt && (hasActionVerb || /\b(on|about|for|gurinchi|meeda|par|pe|ke liye)\b/i.test(lower))) ||
    /^(create|make|generate)\s+a?\s*ppt\b/i.test(lower);

  const isDirectDocQuery =
    (isWord || isExcel || isPdf || isCsv) && (hasActionVerb || /\b(on|about|for|gurinchi|meeda|par|pe|ke liye)\b/i.test(lower));

  const isDocumentRequest = isDirectPptQuery || isDirectDocQuery;

  if (!isDocumentRequest) {
    return {
      isDocumentRequest: false,
      format: "pptx",
      topic: "",
      detectedLanguage,
      originalQuery: clean,
    };
  }

  // 4. Determine Format
  let format: "pptx" | "docx" | "xlsx" | "pdf" | "csv" = "pptx";
  if (isPpt) format = "pptx";
  else if (isExcel) format = "xlsx";
  else if (isWord) format = "docx";
  else if (isPdf) format = "pdf";
  else if (isCsv) format = "csv";

  // 5. Cleanly Extract the Topic / Mind of the User
  let topic = clean;
  // Remove action phrases and format words in English, Telugu, Hindi
  topic = topic
    .replace(/\b(please|can you|could you|i want to|i need to|i want|i need|give me a|give me)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce)\b/gi, "")
    .replace(/\b(a|an|the)\s+(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/gi, "")
    .replace(/\b(a|an|the)\s+(word doc|word document|docx|doc|document)\b/gi, "")
    .replace(/\b(a|an|the)\s+(excel sheet|excel|xlsx|spreadsheet|sheet)\b/gi, "")
    .replace(/\b(a|an|the)\s+(pdf report|pdf document|pdf)\b/gi, "")
    .replace(/\b(a|an|the)\s+(csv file|csv)\b/gi, "")
    .replace(/\b(ppt|pptx|powerpoint|presentation|slides|word|docx|excel|xlsx|spreadsheet|pdf|csv)\b/gi, "")
    .replace(/\b(chey|cheyyi|cheyandi|cheyali|tayaru chey|kavali|ivvu|pettandi)\b/gi, "")
    .replace(/చేయి|చేయ్|చెయ్యి|చేయండి|తయారు చేయి|కావాలి|ఇవ్వు|పిపిటి|ప్రెజెంటేషన్/g, "")
    .replace(/\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/gi, "")
    .replace(/बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|पीपीटी|प्रेजेंटेशन/g, "")
    .replace(/\b(gurinchi|meeda|par|pe|ke liye|for|on|about|regarding)\b/gi, "")
    .replace(/[?!.,;:"']/g, " ")
    .trim();

  // If topic became empty or too short, fallback to meaningful slice of query
  if (!topic || topic.length < 2) {
    topic = clean
      .replace(/\b(create|generate|make|ppt|powerpoint|presentation|chey|banao)\b/gi, "")
      .trim();
  }
  if (!topic) {
    topic = "Overview and Strategic Insights";
  }

  // Capitalize topic words
  topic = topic
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 80);

  return {
    isDocumentRequest: true,
    format,
    topic,
    detectedLanguage,
    originalQuery: clean,
  };
}

