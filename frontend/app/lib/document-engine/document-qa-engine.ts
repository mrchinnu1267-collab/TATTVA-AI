/**
 * TATTVA AI - Grounded Document Question-Answering Engine
 * Answers user questions strictly based on document passages with exact paragraph citations.
 * Zero synthetic hallucination guarantee.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface DocumentPassage {
  id: string;
  documentName: string;
  sectionTitle: string;
  passageIndex: number;
  text: string;
}

export interface DocumentQAResponse {
  question: string;
  answer: string;
  isAnswerFound: boolean;
  confidenceScore: number;
  citations: Array<{
    documentName: string;
    sectionTitle: string;
    passageIndex: number;
    quote: string;
  }>;
  groundedExcerpts: string[];
}

/**
 * Splits document content into searchable passages preserving section context
 */
export function chunkDocumentIntoPassages(
  text: string,
  documentName: string = "document"
): DocumentPassage[] {
  const passages: DocumentPassage[] = [];
  const lines = text.split("\n");

  let currentSection = "General Context";
  let currentBuffer: string[] = [];
  let passageCounter = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(?:#{1,4}\s+|[0-9]+\.\s+[A-Z])/.test(trimmed)) {
      if (currentBuffer.length > 0) {
        passages.push({
          id: `${documentName}_p${passageCounter++}`,
          documentName,
          sectionTitle: currentSection,
          passageIndex: passageCounter - 1,
          text: currentBuffer.join(" "),
        });
        currentBuffer = [];
      }
      currentSection = trimmed.replace(/^#+\s*/, "").replace(/^[0-9]+\.\s*/, "");
      continue;
    }

    if (trimmed.startsWith("[Slide ")) {
      if (currentBuffer.length > 0) {
        passages.push({
          id: `${documentName}_p${passageCounter++}`,
          documentName,
          sectionTitle: currentSection,
          passageIndex: passageCounter - 1,
          text: currentBuffer.join(" "),
        });
        currentBuffer = [];
      }
      currentSection = trimmed.slice(0, 30);
      currentBuffer.push(trimmed);
      continue;
    }

    if (trimmed.length > 0) {
      currentBuffer.push(trimmed);
      if (currentBuffer.join(" ").length > 500) {
        passages.push({
          id: `${documentName}_p${passageCounter++}`,
          documentName,
          sectionTitle: currentSection,
          passageIndex: passageCounter - 1,
          text: currentBuffer.join(" "),
        });
        currentBuffer = [];
      }
    }
  }

  if (currentBuffer.length > 0) {
    passages.push({
      id: `${documentName}_p${passageCounter++}`,
      documentName,
      sectionTitle: currentSection,
      passageIndex: passageCounter - 1,
      text: currentBuffer.join(" "),
    });
  }

  return passages;
}

/**
 * Answers questions by retrieving top passages and synthesizing an answer strictly grounded in citations
 */
export function answerQuestionFromDocuments(
  question: string,
  documents: Array<{ name: string; content: string }>
): DocumentQAResponse {
  const allPassages: DocumentPassage[] = [];
  for (const doc of documents) {
    allPassages.push(...chunkDocumentIntoPassages(doc.content, doc.name));
  }

  if (allPassages.length === 0) {
    return {
      question,
      answer: "No readable passages could be extracted from the provided document(s).",
      isAnswerFound: false,
      confidenceScore: 0,
      citations: [],
      groundedExcerpts: [],
    };
  }

  // Tokenize question keywords
  const qTokens = question
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["what", "when", "where", "which", "how", "the", "and", "for", "with", "does"].includes(w));

  // Score each passage by token overlap and exact phrase match
  const scoredPassages = allPassages.map((p) => {
    const pLower = p.text.toLowerCase();
    let score = 0;

    for (const token of qTokens) {
      if (pLower.includes(token)) {
        score += 2;
      }
    }

    // Exact match bonus for query fragments
    if (question.length > 8 && pLower.includes(question.toLowerCase())) {
      score += 10;
    }

    return { passage: p, score };
  });

  scoredPassages.sort((a, b) => b.score - a.score);
  const topMatches = scoredPassages.filter((sp) => sp.score > 0).slice(0, 3);

  if (topMatches.length === 0) {
    return {
      question,
      answer: `The provided document(s) do not contain information directly addressing "${question}". No speculative assumptions were made.`,
      isAnswerFound: false,
      confidenceScore: 0.1,
      citations: [],
      groundedExcerpts: [],
    };
  }

  const citations = topMatches.map((tm) => ({
    documentName: tm.passage.documentName,
    sectionTitle: tm.passage.sectionTitle,
    passageIndex: tm.passage.passageIndex,
    quote: tm.passage.text.slice(0, 180) + "...",
  }));

  const groundedExcerpts = topMatches.map((tm) => tm.passage.text);

  // Formulate grounded answer
  const primaryPassage = topMatches[0].passage;
  const answer =
    `Based on **${primaryPassage.documentName}** (Section: *${primaryPassage.sectionTitle}*):\n\n` +
    `${primaryPassage.text}\n\n` +
    `*(Verified from document passage [${primaryPassage.passageIndex}])*`;

  return {
    question,
    answer,
    isAnswerFound: true,
    confidenceScore: Math.min(0.95, 0.6 + topMatches[0].score * 0.05),
    citations,
    groundedExcerpts,
  };
}
