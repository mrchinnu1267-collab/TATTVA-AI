/**
 * TATTVA AI - Intelligent User Intent Understanding & Document Archetype Engine
 * Analyzes natural language instructions (including conversational speech, typos, incomplete sentences,
 * multi-step instructions, and multi-turn context) and determines:
 * - Document Archetype (presentation, assignment, research_report, resume, poster, project_documentation,
 *   chart_diagram, study_notes, spreadsheet, source_code, data_file, general_document)
 * - File Format (DOCX, PPTX, XLSX, PDF, CSV, TXT, MD, JSON, Source Code)
 * - Audience, tone, formatting requirements, and predicted next needs
 * - Contextual revisions (e.g., "Make it more professional", "Use previous file as reference",
 *   "Don't remove any content", "Convert this into PDF", "Change only first page", "Recreate like reference",
 *   "Add more images", "Keep file size below 10 MB")
 * - Confidence scoring and ambiguity detection
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { isForbiddenTopic } from "./content-validator";

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
  | "resume"
  | "poster"
  | "project_documentation"
  | "chart_diagram"
  | "study_notes"
  | "spreadsheet"
  | "source_code"
  | "data_file"
  | "general_document";

export type DocumentAudience = "academic" | "business" | "technical" | "financial" | "general";

export interface RevisionDirectives {
  targetSlide?: number;
  targetSection?: number | string;
  depth?: "technical" | "academic" | "business" | "general";
  makeMoreTechnical?: boolean;
  makeMoreProfessional?: boolean;
  addExamplesAndDiagrams?: boolean;
  addMoreImages?: boolean;
  targetAudience?: DocumentAudience;
  specificCorrection?: string;
  removeIrrelevantContent?: boolean;
  preserveAllContent?: boolean;
  preserveDesign?: boolean;
  referenceDocName?: string;
  referenceDocText?: string;
  useReference?: boolean;
  recreateLikeReference?: boolean;
  changeOnlyFirstPage?: boolean;
  maxSizeBytes?: number;
  previousTopic?: string;
  previousFormat?: DocumentFormat;
  previousArchetype?: DocumentArchetype;
  previousDoc?: any;
}

export interface DocumentIntentResult {
  isDocumentRequest: boolean;
  isRevision?: boolean;
  revisionDirectives?: RevisionDirectives;
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
  history?: Array<{
    role: "user" | "assistant" | string;
    content: string;
    generatedDocument?: any;
    attachments?: Array<{ name: string; type: string; url?: string; size?: number; data?: string }>;
  }>;
  preferences?: Record<string, any>;
  hasAttachments?: boolean;
  inChatConversation?: boolean;
  forceDocument?: boolean;
  previousDocument?: any;
}

/**
 * Fuzzy text normalizer that handles typos, misspellings, colloquial phrasing,
 * and variant document format keywords.
 */
export function normalizeQueryForIntent(raw: string): string {
  let s = (raw || "").toLowerCase();

  // 1. Common verb typos
  s = s.replace(/\b(cretae|creat|creste|craete|creeate|crate)\b/g, "create");
  s = s.replace(/\b(generte|generat|genrate|gnereate|genarate)\b/g, "generate");
  s = s.replace(/\b(mak|mkae|mke|maek)\b/g, "make");
  s = s.replace(/\b(prepar|prepaer|prepate|preapre)\b/g, "prepare");
  s = s.replace(/\b(bulid|biuld|buidl)\b/g, "build");
  s = s.replace(/\b(wrte|wite|writ)\b/g, "write");
  s = s.replace(/\b(drft|draf)\b/g, "draft");
  s = s.replace(/\b(dwonload|downlod|donwload|dowload)\b/g, "download");
  s = s.replace(/\b(cnvert|conver|convet|trnasform|trasnform)\b/g, "convert");
  s = s.replace(/\b(desgn|desing)\b/g, "design");

  // 2. Format & document type typos
  s = s.replace(/\b(presenation|persentation|presntation|presentaion|presenetation|presentaton)\b/g, "presentation");
  s = s.replace(/\b(powerpnt|powerpiont|powerpointt|powepoint|pwrpoint)\b/g, "powerpoint");
  s = s.replace(/\b(ptt|pptxx)\b/g, "pptx");
  s = s.replace(/\b(slids|slid|slieds)\b/g, "slides");
  s = s.replace(/\b(pfd|pdff)\b/g, "pdf");
  s = s.replace(/\b(doxc|docc|dcox|wordd|worddoc)\b/g, "docx");
  s = s.replace(/\b(excl|excle|exsel|excell|wrkbook|wrksheet)\b/g, "excel");
  s = s.replace(/\b(spreadshhet|spreadhsheet|spreadheet|spredsheet|spredsheat)\b/g, "spreadsheet");
  s = s.replace(/\b(csvv)\b/g, "csv");
  s = s.replace(/\b(makdown|makrdown|markdwn)\b/g, "markdown");
  s = s.replace(/\b(txtt|textfile)\b/g, "txt");
  s = s.replace(/\b(reprt|reprot|repots)\b/g, "report");
  s = s.replace(/\b(asignment|assignmnt|asignmnt|assigment|courswork)\b/g, "assignment");
  s = s.replace(/\b(resum|resumee|curiculum vitae)\b/g, "resume");
  s = s.replace(/\b(posster|flyrr|flier)\b/g, "poster");
  s = s.replace(/\b(documntation|documenation)\b/g, "documentation");
  s = s.replace(/\b(diagrm|flowchrt|chrt|diagramm)\b/g, "diagram");

  return s;
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
  const norm = normalizeQueryForIntent(clean);

  // 1. Language Detection
  const hasTelugu = /[\u0C00-\u0C7F]/.test(clean);
  const hasHindi = /[\u0900-\u097F]/.test(clean);
  const detectedLanguage = hasTelugu ? "te" : hasHindi ? "hi" : "en";

  // 2. Pure Conversational Question or Inquiries Check
  const isQuestionOrInquiry =
    /\b(what (is|are|was|were|can|do|does|would|will)|who (is|are|was|were)|how (is|are|was|were|do|does|to|can|will)|why (is|are|was|were|do|does|did|can)|where (is|are|was|were)|when (is|are|was|were)|which (is|are|was|were))\b/i.test(norm) ||
    /\b(tell me (about|on|more)|give me (the )?(information|details|info) (about|on)|explain|describe|discuss|clarify|elaborate|walk me through|guide me through|teach me)\b/i.test(norm) ||
    /\b(advantages of|disadvantages of|benefits of|features of|applications of|use cases of|pros and cons of|difference between|compare|differentiate|overview of|summary of)\b/i.test(norm) ||
    /\b(can you (explain|tell me|describe|walk me through|clarify)|could you (explain|tell me|describe)|help me understand)\b/i.test(norm) ||
    /\b(research|deep research|investigate|search for|look up|find information about)\b/i.test(norm) ||
    (clean.endsWith("?") && !/\b(create|generate|make|build|prepare|export|download|ppt|pptx|pdf|docx|excel|sheet|file)\b/i.test(norm));

  // 3. Action Verbs for File Creation
  const hasFileActionVerb =
    /\b(create|generate|make|build|prepare|design|draft|write|export|produce|give me|download|save|send me|deliver|convert|turn|transform|compile)\b/i.test(norm) ||
    /\b(chey|cheyyi|cheyandi|cheyali|tayaru|kavali|ivvu)\b/i.test(norm) ||
    /చేయి|చేయ్|చెయ్యి|చేయండి|తయారు|కావాలి|ఇవ్వు/i.test(clean) ||
    /\b(banao|banaiye|banado|chahiye|dijiye|karo|bana)\b/i.test(norm) ||
    /बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|बना/i.test(clean);

  // 4. Slide Count Extraction
  let requestedSlideCount: number | undefined = undefined;
  const slideCountMatch = norm.match(/\b(\d{1,2})\s*[- ]*(slide|slides|sld)\b/i);
  if (slideCountMatch && slideCountMatch[1]) {
    const parsedCount = parseInt(slideCountMatch[1], 10);
    if (parsedCount >= 2 && parsedCount <= 40) {
      requestedSlideCount = parsedCount;
    }
  }

  // 5. Explicit Archetype & Format Matchers
  // A. PowerPoint Presentation
  const isPptExplicit =
    Boolean(requestedSlideCount) ||
    /\b(ppt|pptx|powerpoint|presentation|slide deck|slides?|pitch deck|deck|keynote)\b/i.test(norm) ||
    /\b(as a (ppt|pptx|powerpoint|presentation|slide deck)|in (ppt|pptx|powerpoint) format)\b/i.test(norm) ||
    /\b(convert|turn|transform|make|create|generate).*?\b(into|to|as)\s+(a\s+)?(ppt|pptx|powerpoint|presentation|slide deck)\b/i.test(norm) ||
    /\b(presentation|slides|deck)\s+(on|about|for|regarding|of)\b/i.test(norm) ||
    /పిపిటి|ప్రెజెంటేషన్/i.test(clean) ||
    /पीपीटी|प्रेजेंटेशन/i.test(clean);

  // B. Excel / Spreadsheet / CSV
  const isExcelExplicit =
    /\b(excel|xlsx|xls|spreadsheet|workbook|sheet|worksheet|csv|marks sheet|ledger|financial report|budget sheet|budget|expense tracker|balance sheet|inventory list|payroll sheet)\b/i.test(norm) ||
    /\b(as (an? )?(excel|xlsx|spreadsheet|workbook|csv)|in (excel|xlsx|csv) format)\b/i.test(norm) ||
    /\b(convert|turn|transform|make|create|generate).*?\b(into|to|as)\s+(an?\s+)?(excel|xlsx|spreadsheet|workbook|sheet|csv)\b/i.test(norm) ||
    /\b(excel sheet|spreadsheet|csv file|table)\s+(for|about|on|of|tracking)\b/i.test(norm) ||
    /ఎక్సెల్|స్ప్రెడ్‌షీట్/i.test(clean) ||
    /एक्सेल|स्प्रेडशीट/i.test(clean);

  // C. PDF Document
  const isPdfExplicit =
    /\b(pdf|pdf document|pdf report|pdf file)\b/i.test(norm) ||
    /\b(as a pdf|in pdf format|as pdf)\b/i.test(norm) ||
    /\b(convert|turn|transform|export).*?\b(into|to|as)\s+(a\s+)?pdf\b/i.test(norm) ||
    /\bpdf\s+(on|about|for|regarding)\b/i.test(norm);

  // D. Word Document (DOCX)
  const isDocxExplicit =
    /\b(word doc|word document|docx|doc file|\.docx|ms word)\b/i.test(norm) ||
    /\b(in docx format|as a docx|as a word doc|as docx)\b/i.test(norm) ||
    /\b(convert|turn|transform|export).*?\b(into|to|as)\s+(a\s+)?(docx|word doc|word document)\b/i.test(norm) ||
    /\b(word document|docx)\s+(on|about|for|regarding)\b/i.test(norm);

  // E. Resume / CV
  const isResumeExplicit =
    /\b(resume|cv|curriculum vitae|bio-data|biodata)\b/i.test(norm) ||
    /\b(create|draft|generate|make|build|write)\s+a?\s*(resume|cv|curriculum vitae)\b/i.test(norm) ||
    /\b(resume|cv)\s+(for|of)\b/i.test(norm);

  // F. Poster / Flyer
  const isPosterExplicit =
    /\b(poster|flyer|event poster|scientific poster|infographic poster|banner)\b/i.test(norm) ||
    /\b(create|design|make|generate)\s+a?\s*(poster|flyer|banner)\b/i.test(norm) ||
    /\bposter\s+(for|about|on)\b/i.test(norm);

  // G. Project Documentation
  const isProjectDocExplicit =
    /\b(project documentation|software documentation|system architecture document|system design document|design doc|srs document|software requirement specification|tech spec|technical specification)\b/i.test(norm) ||
    /\b(write|create|prepare|generate)\s+(project|software|system)\s+documentation\b/i.test(norm) ||
    /\bproject documentation\s+(for|about|on)\b/i.test(norm);

  // H. Flowcharts & Diagrams
  const isChartDiagramExplicit =
    /\b(flowchart|architecture diagram|process diagram|workflow diagram|system diagram|data flow diagram|dfd)\b/i.test(norm) ||
    /\b(draw|create|generate|make)\s+(a\s+)?(flowchart|diagram|architecture diagram|workflow)\b/i.test(norm);

  // I. Academic Assignment
  const isAssignmentExplicit =
    /\b(assignment|homework|coursework|lab report|term paper)\b/i.test(norm) ||
    /\b(prepare|create|make|generate|write)\s+an?\s*(assignment|homework|coursework)\b/i.test(norm) ||
    /\bassignment\s+(on|about|for|regarding)\b/i.test(norm);

  // J. Research / Technical Report
  const isReportExplicit =
    /\b(research report|project report|technical report|whitepaper|market analysis report|audit report)\b/i.test(norm) ||
    /\b(prepare|create|make|generate|write|draft)\s+a?\s*(research report|project report|technical report|report)\b/i.test(norm) ||
    /\breport\s+(on|about|for|regarding)\b/i.test(norm);

  // K. Data Files (JSON, XML, Text, Markdown)
  const isDataFileExplicit =
    /\b(json file|xml file|text file|txt file|markdown file|\.json|\.xml|\.txt|\.md)\b/i.test(norm) ||
    /\b(as a (json|xml|text|txt|markdown) file|in (json|xml|txt|markdown) format)\b/i.test(norm) ||
    /\b(json|xml|markdown)\s+(dataset|data|file)\b/i.test(norm);

  // L. Source Code Files
  const isCodeFileExplicit =
    /\b(downloadable (python|java|c|cpp|js|ts|sql|code) file|(python|java|c|cpp|js|ts|sql) file|script file)\b/i.test(norm) ||
    /\b(save as a file|save it as a file|save to file|as a code file|as a \.py file|as a \.js file|give me a downloadable .* file)\b/i.test(norm) ||
    /\b(python script|python program|java program|c program|sql script)\s+(for|to|that)\b/i.test(norm);

  // Generic File Directives
  const hasGenericFileDirective =
    /\b(make|create|generate|produce|build|export|save|download|give me|send me|draft|write)\s+(a\s+|an\s+|the\s+)?(\w+\s+)?(file|document)\b/i.test(norm) ||
    /\b(as a file|save as a file|save it as a file|give me the file|downloadable file|in a file|download the file)\b/i.test(norm);

  const isExplicitFileRequest =
    isPptExplicit ||
    isExcelExplicit ||
    isPdfExplicit ||
    isDocxExplicit ||
    isResumeExplicit ||
    isPosterExplicit ||
    isProjectDocExplicit ||
    isChartDiagramExplicit ||
    isAssignmentExplicit ||
    isReportExplicit ||
    isDataFileExplicit ||
    isCodeFileExplicit ||
    hasGenericFileDirective;

  // 6. Multi-Turn Conversation Context & Revision Tracking
  const priorDocEntry = (options?.history || [])
    .slice()
    .reverse()
    .find((h) =>
      Boolean(
        h.generatedDocument ||
        (h.attachments && h.attachments.length > 0) ||
        /\bYour (presentation|document|PDF|spreadsheet|file|program file) on (.+?) is ready\b/i.test(h.content) ||
        /\b(presentation|document|pdf|pptx|docx|xlsx) (is ready|was generated)\b/i.test(h.content)
      )
    );

  const priorDoc = priorDocEntry?.generatedDocument || options?.previousDocument;
  const hasPriorDoc = Boolean(priorDoc || priorDocEntry);

  // Conversational Revisions and Enhancements
  const isMakeMoreProfessional = /\b(make it more professional|more professional|professional tone|polish it|business style|executive style)\b/i.test(norm);
  const isUsePreviousReference = /\b(use the (previous|last|prior|attached|uploaded) (file|document|reference)|as a reference|reference the previous file|based on the previous file|reference the attached file)\b/i.test(norm);
  const isDontRemoveContent = /\b(don'?t remove (any )?content|do not remove (any )?content|keep all content|preserve all content|without removing anything)\b/i.test(norm);
  const isConvertToPdf = /\b(convert (this|it)? (into|to|as) pdf|make it a? pdf|turn (this|it)? into pdf)\b/i.test(norm);
  const isChangeFirstPage = /\b(change only (the )?(first page|page 1|slide 1|first slide)|update only (the )?(first page|page 1|slide 1))\b/i.test(norm);
  const isRecreateLikeReference = /\b(recreate (it )?(like|as) the reference|re-create (it )?(like|as) the reference|match the reference)\b/i.test(norm);
  const isAddMoreImages = /\b(add more (images|diagrams|illustrations|visuals)|include more (images|diagrams)|more visuals)\b/i.test(norm);
  const isLimitFileSize = /\b(below|under|less than|max|maximum)\s*10\s*mb\b/i.test(norm);

  const isGeneralRevisionPhrase =
    /\b(the content is (incorrect|wrong|useless|bad|generic|irrelevant|incomplete|poor)|not what i wanted|fix the content|use more relevant|make it more technical|add more technical|remove irrelevant|remove generic|cut filler|no filler|change only slide \d+|make it suitable for|add examples|add diagrams|preserve the existing design|recreate|regenerate|redo|rewrite|revise|revision|correct the content|update the file|recreate the file|regenerate the file|redo the document|revise this file|re-create)\b/i.test(norm) ||
    /\b(change (the )?(topic|content|slides?)|update (slide \d+|the slide|the presentation|the document))\b/i.test(norm) ||
    /\b(use the (uploaded|attached) (reference|file|document))\b/i.test(norm);

  const isRevisionRequest =
    hasPriorDoc &&
    (isMakeMoreProfessional ||
      isUsePreviousReference ||
      isDontRemoveContent ||
      isConvertToPdf ||
      isChangeFirstPage ||
      isRecreateLikeReference ||
      isAddMoreImages ||
      isLimitFileSize ||
      isGeneralRevisionPhrase);

  let isRevision = false;
  let revisionDirectives: RevisionDirectives | undefined = undefined;

  if (isRevisionRequest) {
    let targetSlide: number | undefined = undefined;
    const slideMatch =
      norm.match(/\b(?:slide|slide number|slide no\.?)\s*(\d{1,2})\b/i) ||
      norm.match(/\bchange only slide\s*(\d{1,2})\b/i);
    if (slideMatch && slideMatch[1]) {
      targetSlide = parseInt(slideMatch[1], 10);
    } else if (isChangeFirstPage) {
      targetSlide = 1;
    }

    const makeMoreTechnical = /\b(more technical|relevant technical|deep technical|in-depth technical)\b/i.test(norm);
    const addExamplesAndDiagrams = isAddMoreImages || /\b(examples?|diagrams?|illustrations?|worked examples?)\b/i.test(norm);
    const removeIrrelevantContent = /\b(remove irrelevant|remove generic|cut filler|no filler)\b/i.test(norm);
    const preserveDesign = /\b(preserve (the )?existing design|keep (the )?design|keep (the )?layout)\b/i.test(norm);

    let targetAudience: DocumentAudience | undefined = undefined;
    if (isMakeMoreProfessional || /\b(executive|business|pitch|client|corporate)\b/i.test(norm)) {
      targetAudience = "business";
    } else if (/\b(college|university|academic|assignment|homework)\b/i.test(norm)) {
      targetAudience = "academic";
    } else if (/\b(technical|engineers?|developers?|architecture)\b/i.test(norm)) {
      targetAudience = "technical";
    }

    // Extract previous topic
    let prevTopic = priorDoc?.topic || priorDoc?.title;
    if (!prevTopic && priorDocEntry?.content) {
      const matchTopic = priorDocEntry.content.match(/\bYour (?:presentation|document|PDF|spreadsheet|file|program file) on (.+?) is ready\b/i);
      if (matchTopic && matchTopic[1]) {
        prevTopic = matchTopic[1].trim();
      }
    }

    // Extract previous format
    let prevFormat: DocumentFormat = "docx";
    if (priorDoc?.format) {
      prevFormat = priorDoc.format as DocumentFormat;
    } else if (priorDocEntry) {
      const lowerEntry = priorDocEntry.content.toLowerCase();
      if (lowerEntry.includes("presentation") || lowerEntry.includes("pptx")) prevFormat = "pptx";
      else if (lowerEntry.includes("spreadsheet") || lowerEntry.includes("xlsx")) prevFormat = "xlsx";
      else if (lowerEntry.includes("pdf")) prevFormat = "pdf";
      else if (lowerEntry.includes("document") || lowerEntry.includes("docx")) prevFormat = "docx";
    }

    const depth: "technical" | "academic" | "business" | "general" | undefined = makeMoreTechnical
      ? "technical"
      : targetAudience === "academic"
      ? "academic"
      : targetAudience === "business"
      ? "business"
      : undefined;

    revisionDirectives = {
      targetSlide,
      targetSection: isChangeFirstPage ? 1 : undefined,
      depth,
      makeMoreTechnical,
      makeMoreProfessional: isMakeMoreProfessional,
      addExamplesAndDiagrams,
      addMoreImages: isAddMoreImages,
      targetAudience,
      removeIrrelevantContent,
      preserveAllContent: isDontRemoveContent,
      preserveDesign,
      useReference: isUsePreviousReference || isRecreateLikeReference,
      recreateLikeReference: isRecreateLikeReference,
      changeOnlyFirstPage: isChangeFirstPage,
      maxSizeBytes: isLimitFileSize ? 10 * 1024 * 1024 : undefined,
      specificCorrection: clean,
      previousTopic: prevTopic,
      previousFormat: prevFormat,
      previousArchetype: priorDoc?.archetype || (prevFormat === "pptx" ? "presentation" : prevFormat === "xlsx" ? "spreadsheet" : "research_report"),
      previousDoc: priorDoc,
    };
  } else if (isLimitFileSize || isMakeMoreProfessional || isDontRemoveContent || isAddMoreImages) {
    revisionDirectives = {
      maxSizeBytes: isLimitFileSize ? 10 * 1024 * 1024 : undefined,
      makeMoreProfessional: isMakeMoreProfessional,
      preserveAllContent: isDontRemoveContent,
      addMoreImages: isAddMoreImages,
      addExamplesAndDiagrams: isAddMoreImages,
      targetAudience: isMakeMoreProfessional ? "business" : undefined,
    };
  }

  // 7. Context Resolution from Earlier Conversation or Attachment
  let contextualTopicCandidate: string | undefined = undefined;
  if (options?.history && options.history.length > 0) {
    for (let i = options.history.length - 1; i >= 0; i--) {
      const msg = options.history[i];
      if (msg.attachments && msg.attachments.length > 0) {
        const attName = msg.attachments[0].name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
        if (attName && !isForbiddenTopic(attName)) {
          contextualTopicCandidate = attName;
          break;
        }
      }
      if (msg.role === "user") {
        const cleanedPrev = msg.content
          .replace(/^\[\s*Mode:[^\]]+\]:?\s*/i, "")
          .replace(/\b(what (is|are|was|were)|tell me about|explain|describe|how does|how do|how to|research|advantages of|applications of|benefits of|features of|use cases of|pros and cons of|can you explain|create|generate|make|prepare|convert)\b/gi, "")
          .replace(/\b(the latest|latest|recent|work|works|working|in detail|detail)\b/gi, "")
          .replace(/\b(a|an|the|about|on|for|its|it|this|that|now|more|so|also|please)\b/gi, " ")
          .replace(/[?!.,;:"']/g, " ")
          .trim();
        const isSubAspectOrPronoun = /^(it|this|that|same|now|as ppt|matter|applications?|use\s*cases?|advantages?|disadvantages?|benefits?|features?|details?|examples?|more|help|overview|summary)$/i.test(cleanedPrev);
        if (cleanedPrev.length >= 3 && !isSubAspectOrPronoun && !isForbiddenTopic(cleanedPrev)) {
          contextualTopicCandidate = cleanedPrev;
          break;
        }
      }
    }
  }

  // 8. Determine isDocumentRequest and Confidence
  let isDocumentRequest = false;
  let confidence = 0.5;

  if (options?.forceDocument) {
    isDocumentRequest = true;
    confidence = 1.0;
  } else if (isRevisionRequest) {
    isDocumentRequest = true;
    isRevision = true;
    confidence = 0.99;
  } else if (isExplicitFileRequest) {
    isDocumentRequest = true;
    confidence = 0.98;
  } else {
    isDocumentRequest = false;
    confidence = isQuestionOrInquiry ? 0.95 : 0.90;
  }

  // 9. Ambiguity / Clarification Detection
  let needsClarification = false;
  let clarificationQuestion: string | undefined;

  const words = clean.split(/\s+/).filter(Boolean);
  const isBareFileCommand =
    words.length <= 4 &&
    /\b(create|make|generate|build|download)\s+(a\s+|an\s+|the\s+)?(file|document|doc|pdf|ppt|presentation|sheet|data)$/i.test(norm);
  const isBarePronounCommand =
    words.length <= 3 &&
    /\b(generate|create|make|build)\s+(it|this|that)$/i.test(norm);

  if ((isBareFileCommand || isBarePronounCommand) && !contextualTopicCandidate && (!options?.history || options.history.length === 0)) {
    needsClarification = true;
    clarificationQuestion = "What specific topic or subject would you like me to prepare the document on, and do you have a preferred format (such as PDF, Word, PowerPoint, or Excel)?";
    confidence = 0.2;
  }

  // 10. Resolve Archetype & Format
  let archetype: DocumentArchetype = "research_report";
  let format: DocumentFormat = "docx";

  if (isRevisionRequest) {
    if (isConvertToPdf) {
      format = "pdf";
      archetype = revisionDirectives?.previousArchetype || "research_report";
    } else if (isPptExplicit) {
      archetype = "presentation";
      format = "pptx";
    } else if (isExcelExplicit) {
      archetype = "spreadsheet";
      format = norm.includes("csv") ? "csv" : "xlsx";
    } else if (isPdfExplicit) {
      archetype = revisionDirectives?.targetAudience === "academic" ? "assignment" : "research_report";
      format = "pdf";
    } else if (isDocxExplicit) {
      archetype = revisionDirectives?.targetAudience === "academic" ? "assignment" : "research_report";
      format = "docx";
    } else {
      format = revisionDirectives?.previousFormat || "docx";
      archetype = revisionDirectives?.previousArchetype || (format === "pptx" ? "presentation" : format === "xlsx" ? "spreadsheet" : "research_report");
      if (revisionDirectives?.targetAudience === "academic") {
        archetype = "assignment";
      }
    }
  } else if (isPptExplicit || requestedSlideCount) {
    archetype = "presentation";
    format = "pptx";
  } else if (isExcelExplicit) {
    archetype = "spreadsheet";
    format = norm.includes("csv") ? "csv" : "xlsx";
  } else if (isResumeExplicit) {
    archetype = "resume";
    format = isPdfExplicit ? "pdf" : "docx";
  } else if (isPosterExplicit) {
    archetype = "poster";
    format = isPdfExplicit ? "pdf" : "pptx";
  } else if (isProjectDocExplicit) {
    archetype = "project_documentation";
    format = isPdfExplicit ? "pdf" : "docx";
  } else if (isChartDiagramExplicit) {
    archetype = "chart_diagram";
    format = isPptExplicit ? "pptx" : isPdfExplicit ? "pdf" : "docx";
  } else if (isPdfExplicit) {
    archetype = isAssignmentExplicit ? "assignment" : "research_report";
    format = "pdf";
  } else if (isDocxExplicit) {
    archetype = isAssignmentExplicit ? "assignment" : "research_report";
    format = "docx";
  } else if (isAssignmentExplicit) {
    archetype = "assignment";
    format = isPdfExplicit ? "pdf" : "docx";
  } else if (isReportExplicit) {
    archetype = "research_report";
    format = isPdfExplicit ? "pdf" : "docx";
  } else if (norm.includes(".txt") || norm.includes("text file") || /\b(as a txt|as txt|in txt format|\.txt|txt file)\b/i.test(norm)) {
    archetype = "general_document";
    format = "txt";
  } else if (norm.includes(".md") || norm.includes("markdown") || /\b(as markdown|as a md file|\.md|markdown file)\b/i.test(norm)) {
    archetype = "general_document";
    format = "md";
  } else if (isDataFileExplicit) {
    archetype = "data_file";
    format = norm.includes("xml") ? "xml" : "json";
  } else if (isCodeFileExplicit || norm.includes("program") || norm.includes("script") || norm.includes("code")) {
    archetype = "source_code";
    if (norm.includes(".py") || norm.includes("python")) format = "py";
    else if (norm.includes(".ts") || norm.includes("typescript")) format = "ts";
    else if (norm.includes(".java") || norm.includes("java")) format = "java";
    else if (norm.includes(".cpp") || norm.includes("c++") || norm.includes("cpp")) format = "cpp";
    else if (norm.includes(".c\b") || norm.includes(" c ") || norm.includes("c program")) format = "c";
    else if (norm.includes(".sql") || norm.includes("sql")) format = "sql";
    else if (norm.includes(".html") || norm.includes("html")) format = "html";
    else if (norm.includes(".css") || norm.includes("css")) format = "css";
    else format = "js";
  } else {
    archetype = "research_report";
    format = "docx";
  }

  // 11. Resolve Audience
  let audience: DocumentAudience = "general";
  if (archetype === "assignment" || archetype === "study_notes" || /\b(student|exam|university|college|academic)\b/i.test(norm)) {
    audience = "academic";
  } else if (archetype === "spreadsheet" || /\b(financial|revenue|budget|profit|cost|ebitda)\b/i.test(norm)) {
    audience = "financial";
  } else if (archetype === "source_code" || archetype === "project_documentation" || archetype === "chart_diagram" || /\b(technical|architecture|algorithm|engineer)\b/i.test(norm)) {
    audience = "technical";
  } else if (archetype === "resume" || isMakeMoreProfessional || /\b(business|executive|client|stakeholder|proposal|pitch)\b/i.test(norm)) {
    audience = "business";
  }

  // 12. Clean Topic Extraction
  let topic = clean;
  topic = topic
    .replace(/^\[\s*Mode:[^\]]+\]:?\s*/i, "")
    .replace(/^[-_\s]*(mode|web_search|fact_retrieval|deep_research|research)[-_\s]*/gi, "")
    .replace(/\b(with|having|consisting of|containing|in|of|around|about)?\s*(\d{1,2})\s*[- ]*(slide|slides|sld|pages?|sections?)\b/gi, "")
    .replace(/\b(and save it as a file|and give me the file|save as a file|give me the file|as a file|downloadable file|in a file|as file|to file)\b/gi, "")
    .replace(/\b(gather|collect|compile|summarize)\s+(the\s+)?(slide\s*wise|slidewise|slide-wise|slide\s*by\s*slide|slides?|information|content|points|matter)\s*(up\s*to|upto)?\b/gi, "")
    .replace(/\b(gather|collect|compile|summarize)\b/gi, "")
    .replace(/\b(slide\s*wise|slidewise|slide-wise|up\s*to|upto|slide\s*by\s*slide)\b/gi, "")
    .replace(/\b(now|then|also|so|please|can you|could you|i want to|i need to|i want|i need|give me a|give me|give)\b/gi, "")
    .replace(/\b(create|generate|make|build|prepare|design|draft|write|export|produce|convert|turn|transform|compile)\b/gi, "")
    .replace(/\b(that|this|the|my|our)\s+(research|investigation|findings|analysis|summary|discussion|topic)\b/gi, "")
    .replace(/\b(into|to|as)\s+(a\s+|an\s+)?(pdf|ppt|pptx|powerpoint|word|docx|excel|spreadsheet|file|document)\b/gi, "")
    .replace(/\b(as\s+a\s+ppt|as\s+ppt|as\s+pptx|as\s+pdf|as\s+docx|as\s+excel|of\s+matter|matter)\b/gi, "")
    .replace(/\b(a|an|the)\s+(ppt|pptx|powerpoint|presentation|slides|deck|slide deck)\b/gi, "")
    .replace(/\b(a|an|the)\s+(word doc|word document|docx|doc|document|assignment|project report|research paper|notes)\b/gi, "")
    .replace(/\b(a|an|the)\s+(excel sheet|excel workbook|excel|xlsx|spreadsheet|sheet|budget|csv file|csv|pdf report|pdf document|pdf)\b/gi, "")
    .replace(/\b(a|an|the)\s+(json file|json data|json|xml file|xml document|xml|text file|txt file|txt|markdown file|md file|markdown)\b/gi, "")
    .replace(/\b(a|an|the)\s+(python program|python script|python file|python|java program|java file|java|cpp program|cpp file|cpp|c program|c file|sql script|sql file|sql)\b/gi, "")
    .replace(/\b(ppt|pptx|powerpoint|presentation|slides|word|docx|excel|xlsx|spreadsheet|workbook|assignment|pdf|csv|json|xml|markdown)\b/gi, "")
    .replace(/\b(containing|sample|workbook for|sheet for|data for)\b/gi, "")
    .replace(/\b(and\s+)?keep\s+(the\s+)?file\s*size\s+(below|under|less than|max|maximum)\s*10\s*mb\b/gi, "")
    .replace(/\b(make\s+it\s+)?(more\s+)?(professional|technical|academic|formal)\b/gi, "")
    .replace(/\b(use\s+the\s+)?(previous|last|prior)\s+file\s+(as\s+a\s+reference|reference)?\b/gi, "")
    .replace(/\b(don'?t|do\s+not)\s+remove\s+(any\s+)?content\b/gi, "")
    .replace(/\b(change|update)\s+only\s+(the\s+)?(first\s+page|page\s+1|slide\s+1|first\s+slide)\b/gi, "")
    .replace(/\b(recreate|match)\s+(it\s+)?(like|as)\s+the\s+reference\b/gi, "")
    .replace(/\b(add\s+)?more\s+(images|diagrams|visuals)\b/gi, "")
    .replace(/\b(chey|cheyyi|cheyandi|cheyali|tayaru chey|kavali|ivvu|banao|banaiye|karo)\b/gi, "")
    .replace(/చేయి|చేయ్|చెయ్యి|చేయండి|తయారు చేయి|కావాలి|ఇవ్వు|పిపిటి|ప్రెజెంటేషన్/g, "")
    .replace(/बनाओ|बनाइए|बना दो|चाहिए|दीजिए|तैयार करो|पीपीटी|प्रेजेंटेशन/g, "")
    .replace(/\b(on|about|regarding|for|with|meeda|gurinchi|par|pe)\b/gi, " ")
    .replace(/[?!.,;:"']/g, " ")
    .trim();

  // Strip trailing or leading prepositions
  topic = topic
    .replace(/\b(wise|upto|up to)\s+/gi, "")
    .replace(/\s+\b(wise|upto|up to)\b/gi, "")
    .replace(/\b(with|on|about|for|of|in|to|at|by|from)\s*$/gi, "")
    .replace(/^\s*\b(with|on|about|for|of|in|to|at|by|from)\b/gi, "")
    .trim();

  if (/^ai$/i.test(topic)) {
    topic = "Artificial Intelligence";
  }

  const isGenericFillerTopic =
    !topic ||
    isForbiddenTopic(topic) ||
    /^(it|this|that|above|same|the same|them|its|now|so|topic|this topic|that topic|the topic|research|that research|this research|as ppt|as a ppt|matter|of matter|slides? as|8 slides as|slides? of matter|slides?|presentation|document|file|report)$/i.test(topic) ||
    /^(now\s+)?(it|this|that)$/i.test(topic) ||
    /^(make\s+it\s+)?(more\s+)?(professional|technical|formal|better|academic)$/i.test(topic) ||
    /\b(about|on|for|of)\s+(it|this|that|this topic|that research|matter)\b/i.test(clean) ||
    topic.length < 2;

  if (isGenericFillerTopic && contextualTopicCandidate) {
    topic = contextualTopicCandidate;
  }

  if (isRevisionRequest && (!topic || topic.length < 3 || isForbiddenTopic(topic) || isGenericFillerTopic)) {
    if (revisionDirectives?.previousTopic) {
      topic = revisionDirectives.previousTopic;
    }
  }

  // Strip predicate clauses
  if (topic && /\b(?:is|are|was|were|refers to|defined as|consists of|deals with|meaning|means)\b/i.test(topic)) {
    const parts = topic.split(/\b(?:is|are|was|were|refers to|defined as|consists of|deals with|meaning|means)\b/i);
    if (parts[0] && parts[0].trim().length >= 2) {
      topic = parts[0].trim();
    }
  }

  if (topic) {
    topic = topic.replace(/\b(gather|collect|compile|summarize|slide wise|slidewise|slide-wise|up to|upto|slide by slide|of matter|matter)\b/gi, "").trim();
  }

  // Check if topic is still empty or forbidden
  if (!topic || topic.length < 2 || isForbiddenTopic(topic)) {
    needsClarification = true;
    clarificationQuestion = `What specific topic or subject would you like me to prepare the ${format.toUpperCase()} on?`;
    topic = "Document";
  } else {
    const ACRONYMS = new Set([
      "AI", "ML", "API", "UI", "UX", "PPT", "PDF", "SQL", "DBMS", "OS",
      "LLM", "NLP", "CPU", "GPU", "RAM", "HTTP", "REST", "JSON", "HTML",
      "CSS", "AWS", "GCP", "SDK", "OOP", "IOT", "CRM", "SRS", "PRD"
    ]);

    topic = topic.replace(/\b(with|on|about|for|of|in|to|at|by|from)\s*$/gi, "").trim();

    topic = topic
      .split(/\s+/)
      .map((w) => {
        const upper = w.toUpperCase();
        if (ACRONYMS.has(upper)) return upper;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ")
      .slice(0, 80);
  }

  // 13. Depth & Length Configuration
  const isComprehensive = /\b(comprehensive|detailed|in-depth|complete|full|exhaustive|deep dive)\b/i.test(norm);
  const isBrief = /\b(brief|short|quick|concise|summary|overview)\b/i.test(norm);
  const depth: "brief" | "standard" | "comprehensive" = isBrief
    ? "brief"
    : (isComprehensive || revisionDirectives?.makeMoreTechnical || revisionDirectives?.makeMoreProfessional)
    ? "comprehensive"
    : "standard";

  const slideCount = requestedSlideCount || (depth === "brief" ? 6 : depth === "comprehensive" ? 12 : 8);
  const sectionCount = depth === "brief" ? 4 : depth === "comprehensive" ? 8 : 6;

  // 14. Formatting Requirements & Predicted Next Needs
  const formattingRequirements: string[] = [];
  if (archetype === "presentation") {
    formattingRequirements.push("16:9 widescreen layout", "Bullet points with visual suggestions", "Speaker notes");
  } else if (archetype === "spreadsheet") {
    formattingRequirements.push("Styled header rows", "Calculated formulas (SUM/AVERAGE)", "Alternating zebra rows");
  } else if (archetype === "resume") {
    formattingRequirements.push("Clean ATS-compliant typography", "Quantitative metric achievements", "Reverse chronological experience");
  } else if (archetype === "poster") {
    formattingRequirements.push("High-contrast visual hierarchy", "Callout statistics and highlights", "Compact structured pillars");
  } else if (archetype === "project_documentation") {
    formattingRequirements.push("Document control metadata", "System topology architecture", "Interface specifications & security controls");
  } else if (archetype === "chart_diagram") {
    formattingRequirements.push("System component topology", "Mermaid / ASCII visual flow", "Data flow sequence table");
  } else {
    formattingRequirements.push("Executive summary", "Structured numbered sections", "Data comparison table", "Verifiable references");
  }

  const predictedNextNeeds: string[] = [];
  if (archetype === "presentation") {
    predictedNextNeeds.push("Speaker script / presentation notes", "Executive handout document");
  } else if (archetype === "resume") {
    predictedNextNeeds.push("Tailored cover letter", "Interview preparation talking points");
  } else if (archetype === "project_documentation") {
    predictedNextNeeds.push("API endpoint reference", "Production deployment checklist");
  } else if (archetype === "assignment") {
    predictedNextNeeds.push("Bibliography / IEEE citations check", "Key concept revision flashcards");
  } else {
    predictedNextNeeds.push("Methodology deep dive", "Slide deck summary for presentation");
  }

  return {
    isDocumentRequest,
    isRevision,
    revisionDirectives,
    confidence,
    needsClarification,
    clarificationQuestion,
    topic,
    archetype,
    format,
    audience: revisionDirectives?.targetAudience || audience,
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
