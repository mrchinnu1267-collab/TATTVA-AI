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
  inChatConversation?: boolean;
  forceDocument?: boolean;
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

  // 2. Comprehensive check for questions, explanations, inquiries, and research queries
  // (e.g., "What is India?", "Tell me about Amazon.", "Explain Transformer Architecture.",
  // "How does Artificial Intelligence work?", "What are the advantages of DBMS?", "What are its applications?", "Research quantum computing")
  const isQuestionOrInquiry =
    /\b(what (is|are|was|were|can|do|does|would|will)|who (is|are|was|were)|how (is|are|was|were|do|does|to|can|will)|why (is|are|was|were|do|does|did|can)|where (is|are|was|were)|when (is|are|was|were)|which (is|are|was|were))\b/i.test(lower) ||
    /\b(tell me (about|on|more)|give me (the )?(information|details|info) (about|on)|explain|describe|discuss|clarify|elaborate|walk me through|guide me through|teach me)\b/i.test(lower) ||
    /\b(advantages of|disadvantages of|benefits of|features of|applications of|use cases of|pros and cons of|difference between|compare|differentiate|overview of|summary of)\b/i.test(lower) ||
    /\b(can you (explain|tell me|describe|walk me through|clarify)|could you (explain|tell me|describe)|help me understand)\b/i.test(lower) ||
    /\b(research|deep research|investigate|search for|look up|find information about)\b/i.test(lower) ||
    (clean.endsWith("?") && !/\b(create|generate|make|build|prepare|export|download)\b/i.test(lower));

  // 3. Action keywords for explicit file creation
  const hasFileActionVerb =
    /\b(create|generate|make|build|prepare|design|draft|write|export|produce|give me|download|save|send me|deliver|convert|turn|transform|compile)\b/i.test(lower) ||
    /\b(chey|cheyyi|cheyandi|cheyali|tayaru|kavali|ivvu)\b/i.test(lower) ||
    /చేయి|చేయ్|చెయ్యి|చేయండి|తయారు|కావాలి|ఇవ్వు/i.test(clean) ||
    /\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/i.test(lower) ||
    /बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|बना/i.test(clean);

  // 4. Explicit File Format & Document Type Recognition
  const isPptExplicit =
    (hasFileActionVerb && /\b(ppt|pptx|powerpoint|presentation|slide deck|slides?|pitch deck|deck|keynote)\b/i.test(lower)) ||
    /\b(as a (ppt|pptx|powerpoint|presentation|slide deck)|in (ppt|pptx|powerpoint) format)\b/i.test(lower) ||
    /\b(convert|turn|transform|make|create|generate).*?\b(into|to|as)\s+(a\s+)?(ppt|pptx|powerpoint|presentation|slide deck)\b/i.test(lower) ||
    /\b\d+\s*[- ]*(slide|slides|sld)\b/i.test(lower) ||
    /పిపిటి|ప్రెజెంటేషన్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन/i.test(clean);

  const isExcelExplicit =
    (hasFileActionVerb && /\b(excel|xlsx|xls|spreadsheet|workbook|sheet|worksheet|csv|marks sheet|ledger|financial report|budget sheet)\b/i.test(lower)) ||
    /\b(as (an? )?(excel|xlsx|spreadsheet|workbook|csv)|in (excel|xlsx|csv) format)\b/i.test(lower) ||
    /\b(convert|turn|transform|make|create|generate).*?\b(into|to|as)\s+(an?\s+)?(excel|xlsx|spreadsheet|workbook|sheet|csv)\b/i.test(lower) ||
    /\b(excel sheet|spreadsheet)\s+(for|about|on|of)\b/i.test(lower) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్/i.test(clean) ||
    /एक्सेल|स्प्रेडशीट/i.test(clean);

  const isPdfExplicit =
    (hasFileActionVerb && /\b(pdf|pdf document|pdf report|pdf file)\b/i.test(lower)) ||
    /\b(as a pdf|in pdf format|as pdf)\b/i.test(lower) ||
    /\b(convert|turn|transform|export).*?\b(into|to|as)\s+(a\s+)?pdf\b/i.test(lower) ||
    /\bpdf\s+(on|about|for|regarding)\b/i.test(lower);

  const isDocxExplicit =
    (hasFileActionVerb && /\b(word doc|word document|docx|doc file|\.docx)\b/i.test(lower)) ||
    /\b(in docx format|as a docx|as a word doc|as docx)\b/i.test(lower) ||
    /\b(convert|turn|transform|export).*?\b(into|to|as)\s+(a\s+)?(docx|word doc|word document)\b/i.test(lower) ||
    (hasFileActionVerb && /\b(research report|project report|term paper|whitepaper|assignment|homework)\b/i.test(lower)) ||
    /\b(prepare|create|make|generate)\s+an?\s+assignment\b/i.test(lower);

  const isDataFileExplicit =
    (hasFileActionVerb && /\b(json file|xml file|text file|txt file|markdown file|\.json|\.xml|\.txt|\.md)\b/i.test(lower)) ||
    /\b(as a (json|xml|text|txt|markdown) file|in (json|xml|txt) format)\b/i.test(lower);

  const isCodeFileExplicit =
    (hasFileActionVerb && /\b(downloadable (python|java|c|cpp|js|ts|sql|code) file|(python|java|c|cpp|js|ts|sql) file|script file)\b/i.test(lower)) ||
    /\b(save as a file|save it as a file|save to file|as a code file|as a \.py file|as a \.js file|give me a downloadable .* file)\b/i.test(lower);

  const hasGenericFileDirective =
    /\b(make|create|generate|produce|build|export|save|download|give me|send me)\s+(a\s+|an\s+|the\s+)?(\w+\s+)?(file|document)\b/i.test(lower) ||
    /\b(as a file|save as a file|save it as a file|give me the file|downloadable file|in a file|download the file)\b/i.test(lower);

  const isExplicitFileRequest =
    isPptExplicit ||
    isExcelExplicit ||
    isPdfExplicit ||
    isDocxExplicit ||
    isDataFileExplicit ||
    isCodeFileExplicit ||
    hasGenericFileDirective;

  // 5. Slide Count Extraction
  let requestedSlideCount: number | undefined = undefined;
  const slideCountMatch = lower.match(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/i);
  if (slideCountMatch && slideCountMatch[1]) {
    const parsedCount = parseInt(slideCountMatch[1], 10);
    if (parsedCount >= 2 && parsedCount <= 30) {
      requestedSlideCount = parsedCount;
    }
  }

  // 6. Analyze Previous Conversation Context
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

  const words = clean.split(/\s+/).filter(Boolean);
  const isShortTopic = words.length >= 1 && words.length <= 6 && !hasFileActionVerb && !isExplicitFileRequest;

  // 7. Determine isDocumentRequest and Confidence
  let isDocumentRequest = false;
  let confidence = 0.5;

  if (options?.forceDocument) {
    // Explicitly requested document generation (e.g., from /api/generate-document or document studio UI)
    isDocumentRequest = true;
    confidence = 1.0;
  } else if (isExplicitFileRequest) {
    // Explicit user request for a downloadable file (PDF, PPT, DOCX, Excel, code file, research report document, etc.)
    isDocumentRequest = true;
    confidence = 0.98;
  } else {
    // Normal conversation, questions, inquiries, research queries, and single topic keywords
    // (e.g. "What is India?", "Tell me about Amazon.", "amazon", "Games", "How does Transformer Architecture work?",
    // "What are its advantages?", "Research the latest AI developments") are strictly answered conversationally in chat!
    isDocumentRequest = false;
    confidence = isQuestionOrInquiry ? 0.95 : 0.90;
  }

  // Ambiguity check
  let needsClarification = false;
  let clarificationQuestion: string | undefined;

  if (words.length === 1 && /^(it|this|that|file|doc|ppt)$/i.test(words[0]) && (!options?.history || options.history.length === 0)) {
    needsClarification = true;
    clarificationQuestion = "Could you please specify the topic or content you would like me to prepare?";
    confidence = 0.2;
  }

  // 8. Resolve Archetype & Format
  let archetype: DocumentArchetype = "research_report";
  let format: DocumentFormat = "docx";

  if (isPptExplicit || requestedSlideCount || (isShortTopic && contextFavorsPpt && !options?.inChatConversation)) {
    archetype = "presentation";
    format = "pptx";
  } else if (isExcelExplicit || (isShortTopic && contextFavorsSpreadsheet && !options?.inChatConversation)) {
    archetype = "spreadsheet";
    format = lower.includes("csv") ? "csv" : "xlsx";
  } else if (isPdfExplicit) {
    archetype = /\b(assignment|homework)\b/i.test(lower) ? "assignment" : "research_report";
    format = "pdf";
  } else if (isDocxExplicit) {
    archetype = /\b(assignment|homework)\b/i.test(lower) ? "assignment" : "research_report";
    format = "docx";
  } else if (isDataFileExplicit) {
    archetype = "data_file";
    format = lower.includes("xml") ? "xml" : "json";
  } else if (isCodeFileExplicit || lower.includes("program") || lower.includes("script") || lower.includes("code")) {
    archetype = "source_code";
    if (lower.includes(".py") || lower.includes("python")) format = "py";
    else if (lower.includes(".ts") || lower.includes("typescript")) format = "ts";
    else if (lower.includes(".java") || lower.includes("java")) format = "java";
    else if (lower.includes(".cpp") || lower.includes("c++") || lower.includes("cpp")) format = "cpp";
    else if (lower.includes(".c\b") || lower.includes(" c ") || lower.includes("c program")) format = "c";
    else if (lower.includes(".sql") || lower.includes("sql")) format = "sql";
    else if (lower.includes(".html") || lower.includes("html")) format = "html";
    else if (lower.includes(".css") || lower.includes("css")) format = "css";
    else format = "js";
  } else if (lower.includes(".txt") || lower.includes("text file")) {
    archetype = "general_document";
    format = "txt";
  } else if (lower.includes(".md") || lower.includes("markdown")) {
    archetype = "general_document";
    format = "md";
  } else if (/\b(assignment|homework|coursework)\b/i.test(lower) || (contextFavorsAcademic && !options?.inChatConversation)) {
    archetype = "assignment";
    format = "docx";
  } else if (/\b(notes|study notes|revision|cheat sheet)\b/i.test(lower)) {
    archetype = "study_notes";
    format = "docx";
  } else {
    archetype = "research_report";
    format = "docx";
  }

  // 9. Resolve Audience
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

  // 10. Clean Topic Extraction
  let topic = clean;
  topic = topic
    .replace(/^\[\s*Mode:[^\]]+\]:?\s*/i, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/gi, "")
    .replace(/\b(and save it as a file|and give me the file|save as a file|give me the file|as a file|downloadable file|in a file|as file|to file)\b/gi, "")
    .replace(/\b(now|then|also|so|please|can you|could you|i want to|i need to|i want|i need|give me a|give me)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce|convert|turn|transform|compile)\b/gi, "")
    .replace(/\b(that|this|the|my|our)\s+(research|investigation|findings|analysis|summary|discussion|topic)\b/gi, "")
    .replace(/\b(into|to|as)\s+(a\s+|an\s+)?(pdf|ppt|pptx|powerpoint|word|docx|excel|spreadsheet|file|document)\b/gi, "")
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

  // If topic is empty, a pronoun ("it", "this", "that", "same"), or generic reference ("this topic", "that research"):
  // inspect history for the substantive topic!
  const isPronounTopic =
    !topic ||
    /^(it|this|that|above|same|the same|them|its|now|so|topic|this topic|that topic|the topic|research|that research|this research)$/i.test(topic) ||
    /^(now\s+)?(it|this|that)$/i.test(topic) ||
    /\b(about|on|for|of)\s+(it|this|that|this topic|that research)\b/i.test(clean) ||
    topic.length < 2;

  if (isPronounTopic && options?.history && options.history.length > 0) {
    for (let i = options.history.length - 1; i >= 0; i--) {
      const msg = options.history[i];
      if (msg.role === "user") {
        const cleanedPrev = msg.content
          .replace(/^\[\s*Mode:[^\]]+\]:?\s*/i, "")
          .replace(/\b(what (is|are|was|were)|tell me about|explain|describe|how does|how do|how to|research|advantages of|applications of|benefits of|features of|use cases of|pros and cons of|can you explain|create|generate|make|prepare|convert)\b/gi, "")
          .replace(/\b(the latest|latest|recent|work|works|working|in detail|detail)\b/gi, "")
          .replace(/\b(a|an|the|about|on|for|its|it|this|that|now|more|so|also|please)\b/gi, " ")
          .replace(/[?!.,;:"']/g, " ")
          .trim();
        // Skip sub-aspect words or pronouns, looking for substantive subject
        const isSubAspectOrPronoun = /^(it|this|that|same|now|applications?|use\s*cases?|advantages?|disadvantages?|benefits?|features?|details?|examples?|more|help|overview|summary)$/i.test(cleanedPrev);
        if (cleanedPrev.length >= 3 && !isSubAspectOrPronoun) {
          topic = cleanedPrev;
          break;
        }
      }
    }
  }

  if (!topic || topic.length < 2 || /^(it|this|that|now\s+it)$/i.test(topic)) {
    topic = clean
      .replace(/\[\s*Mode:[^\]]+\]:?/gi, "")
      .replace(/\b(create|generate|make|prepare|ppt|word|excel|assignment|now|about|it|this|that)\b/gi, "")
      .trim();
  }

  if (!topic || topic.length < 2 || /^(it|this|that)$/i.test(topic)) {
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

