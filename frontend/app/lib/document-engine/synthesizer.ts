/**
 * TATTVA AI - Intelligent Document Synthesizer & Generator
 * Takes user intent, crafts concise professional content, and compiles genuine binary documents
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { GoogleGenAI } from "@google/genai";
import { DocumentGenerationIntent } from "./intent";
import { buildDocument, BuildDocumentOptions } from "./index";

export interface GeneratedFilePayload {
  success: boolean;
  filename: string;
  dataUri: string;
  mimeType: string;
  format: string;
  sizeBytes: number;
  title: string;
  summaryMessage: string;
  error?: string;
}

/**
 * Generate a complete, binary document from user prompt and intent
 */
export async function synthesizeDocument(
  intent: DocumentGenerationIntent,
  apiKey?: string
): Promise<GeneratedFilePayload> {
  const { format, topic, detectedLanguage } = intent;
  const safeTitle = topic.slice(0, 60);
  const fileBasename = safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40) || "tattva_document";
  const filename = `${fileBasename}.${format}`;

  let documentOptions: BuildDocumentOptions = {
    format,
    title: safeTitle,
    filename,
  };

  let aiSummary = "";

  // 1. Attempt AI-Powered Structured Synthesis via Gemini
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptInstruction = `You are TATTVA AI's Document Architect.
Generate structured content for a ${format.toUpperCase()} file on the topic: "${safeTitle}".

CRITICAL REQUIREMENTS:
- Understand the user's mind and what they want directly.
- DO NOT generate Python code, scripts, or instructions on how to use libraries.
- Keep the content concise, punchy, and highly informative (avoid overwhelming fluff).
${detectedLanguage === "te" ? "- Formulate slide titles and bullet points in clean Telugu or English with Telugu context." : ""}
${detectedLanguage === "hi" ? "- Formulate slide titles and bullet points in clean Hindi or English with Hindi context." : ""}

Respond strictly with valid JSON conforming to this format based on "${format}":
${
  format === "pptx"
    ? `{
  "title": "${safeTitle}",
  "subtitle": "Comprehensive Overview & Analysis",
  "slides": [
    { "title": "Introduction & Core Concept", "bullets": ["...", "..."] },
    { "title": "Key Principles & Architecture", "bullets": ["...", "..."] },
    { "title": "Practical Applications & Impact", "bullets": ["...", "..."] },
    { "title": "Challenges & Opportunities", "bullets": ["...", "..."] },
    { "title": "Conclusion & Strategic Outlook", "bullets": ["...", "..."] }
  ],
  "summary": "Brief 1-sentence friendly confirmation message"
}`
    : format === "xlsx"
      ? `{
  "title": "${safeTitle}",
  "sheets": [
    {
      "title": "Data Overview",
      "rows": [
        ["Category", "Metric", "Target", "Status"],
        ["Item 1", "Value A", "Target A", "On Track"],
        ["Item 2", "Value B", "Target B", "Completed"]
      ]
    }
  ],
  "summary": "Brief 1-sentence friendly confirmation message"
}`
      : `{
  "title": "${safeTitle}",
  "subtitle": "Strategic Executive Brief",
  "sections": [
    { "heading": "Executive Summary", "content": "..." },
    { "heading": "Key Analysis", "bullets": ["...", "..."] },
    { "heading": "Strategic Recommendations", "content": "..." }
  ],
  "summary": "Brief 1-sentence friendly confirmation message"
}`
}`;

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: promptInstruction }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
          maxOutputTokens: 2000,
        },
      });

      const responseText = res.text || "";
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}");

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
        if (parsed.title) documentOptions.title = parsed.title;
        if (parsed.subtitle) documentOptions.subtitle = parsed.subtitle;
        if (parsed.slides) documentOptions.slides = parsed.slides;
        if (parsed.sections) documentOptions.sections = parsed.sections;
        if (parsed.sheets) documentOptions.sheets = parsed.sheets;
        if (parsed.rows) documentOptions.data = parsed.rows;
        if (parsed.summary) aiSummary = parsed.summary;
      }
    } catch (e) {
      console.warn("[TATTVA Document Synthesizer] AI synthesis fallback triggered:", e);
    }
  }

  // 2. Default High-Quality Template if AI output was empty
  if (format === "pptx" && (!documentOptions.slides || documentOptions.slides.length === 0)) {
    documentOptions.slides = [
      {
        title: "Executive Summary",
        bullets: [
          `Key perspectives and high-level framework for ${safeTitle}.`,
          "Designed for immediate decision-making and practical presentation.",
        ],
      },
      {
        title: "Core Mechanics & Key Drivers",
        bullets: [
          "Primary components driving modern developments.",
          "Technological and structural considerations.",
          "Scalability, performance, and efficiency optimizations.",
        ],
      },
      {
        title: "Strategic Impact & Applications",
        bullets: [
          "Real-world enterprise and community implementation scenarios.",
          "Measurable ROI and strategic value proposition.",
          "Operational excellence and risk mitigation.",
        ],
      },
      {
        title: "Future Roadmap & Recommendations",
        bullets: [
          "Near-term actionable milestones.",
          "Emerging trends and ongoing innovations.",
          "Concluding evaluation and next steps.",
        ],
      },
    ];
  } else if (format === "xlsx" && (!documentOptions.sheets || documentOptions.sheets.length === 0)) {
    documentOptions.sheets = [
      {
        title: "Overview",
        rows: [
          ["Item / Factor", "Baseline Metric", "Current Target", "Performance", "Notes"],
          [`${safeTitle} - Phase 1`, "100", "125", "Exceeded", "Complete"],
          [`${safeTitle} - Phase 2`, "85", "110", "On Track", "Active"],
          [`${safeTitle} - Phase 3`, "40", "75", "Initiating", "Scheduled"],
        ],
      },
    ];
  } else if (format === "docx" && (!documentOptions.sections || documentOptions.sections.length === 0)) {
    documentOptions.sections = [
      {
        heading: "1. Executive Summary",
        content: `This document provides a concise, high-impact overview of ${safeTitle}. It synthesizes the foundational concepts, operative considerations, and strategic outlook into an actionable report.`,
      },
      {
        heading: "2. Key Insights & Observations",
        bullets: [
          `Primary drivers governing ${safeTitle} in modern ecosystems.`,
          "Structured methodologies for robust execution and quality assurance.",
          "Best practices for scalability and long-term viability.",
        ],
      },
      {
        heading: "3. Strategic Recommendations",
        content: `Organizations adopting strategies around ${safeTitle} should prioritize agile validation, measurable outcomes, and continuous refinement.`,
      },
    ];
  }

  // 3. Compile Binary Document via Master Document Engine
  const compiled = await buildDocument(documentOptions);

  // 4. Craft User-Friendly Confirmation Message in Matching Language
  let summary = aiSummary;
  if (!summary) {
    if (detectedLanguage === "te") {
      summary = `నేను మీ కోసం **${safeTitle}** పై ${format.toUpperCase()} ఫైల్‌ను విజయవంతంగా తయారు చేసాను. మీరు క్రింద ఉన్న బటన్ క్లిక్ చేసి వెంటనే డౌన్‌లోడ్ చేసుకోవచ్చు.`;
    } else if (detectedLanguage === "hi") {
      summary = `मैंने आपके लिए **${safeTitle}** पर ${format.toUpperCase()} फाइल तैयार कर दी है। आप नीचे दिए गए बटन से इसे तुरंत डाउनलोड कर सकते हैं।`;
    } else {
      const typeLabel =
        format === "pptx"
          ? "PowerPoint Presentation"
          : format === "docx"
            ? "Word Document"
            : format === "xlsx"
              ? "Excel Spreadsheet"
              : format === "pdf"
                ? "PDF Document"
                : "file";
      summary = `I have generated your **${typeLabel}** on **${safeTitle}**. It is compiled in standard format and ready to download below.`;
    }
  }

  return {
    success: compiled.success,
    filename: compiled.filename,
    dataUri: compiled.dataUri,
    mimeType: compiled.mimeType,
    format: compiled.format,
    sizeBytes: compiled.sizeBytes,
    title: safeTitle,
    summaryMessage: summary,
    error: compiled.error,
  };
}

