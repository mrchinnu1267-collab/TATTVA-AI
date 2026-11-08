/**
 * TATTVA AI - Intent Recognition & Task Classification Engine
 * Analyzes conversational goals, classifies complex tasks, and routes processing pipelines
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { GoogleGenAI } from "@google/genai";
import { TaskIntent, IntentClassificationResult } from "./types";

const INTENT_PATTERNS: Array<{ intent: TaskIntent; patterns: RegExp[] }> = [
  {
    intent: "image_editing",
    patterns: [
      /edit (this|the) image/i,
      /modify (this|the) picture/i,
      /change (the|his|her|its) (background|color|face|clothes|shirt|hair)/i,
      /remove (the|that) from (the|this) (photo|image)/i,
      /add .* to (the|this) (photo|image)/i,
      /make (it|the image|her|him) (look like|wear|brighter|darker)/i,
    ],
  },
  {
    intent: "image_generation",
    patterns: [
      /\b(generate|create|draw|paint|render)\b.*\b(ai image|illustration|digital art|drawing|avatar|logo)\b/i,
      /\b(draw|paint|sketch|illustrate)\b\s+(me\s+)?(a|an|the)\b/i,
      /\bgenerate\s+(an?\s+)?image\b/i,
    ],
  },
  {
    intent: "web_research",
    patterns: [
      /\b(search|look up|google|browse|find)\b.*(web|internet|latest news|current price|today|recent|2025|2026)/i,
      /what is the latest|who won.*yesterday|stock price of|current market/i,
      /find articles about|research on/i,
    ],
  },
  {
    intent: "agent_task",
    patterns: [
      /analyse (my|the)?\s*github\s*repo/i,
      /inspect repository/i,
      /find security (problems|issues|vulnerabilities) in/i,
      /multi-step|run an audit on|scan codebase/i,
      /do a comprehensive research on .* and create a (report|document)/i,
    ],
  },
  {
    intent: "coding",
    patterns: [
      /\b(code|script|function|class|program|algorithm|refactor|debug|fix this error|syntax error|typescript|javascript|python|java|c\+\+|html|css|sql|react|next\.js)\b/i,
      /```[\s\S]*```/,
      /write a (script|program|component|api|backend|query)/i,
    ],
  },
  {
    intent: "mathematics",
    patterns: [
      /\b(calculate|solve equation|integral|derivative|algebra|arithmetic|formula|matrix|standard deviation|eigenvalue|theorem|proof)\b/i,
      /[0-9]+\s*[\+\-\*\/\^]\s*[0-9]+/,
      /evaluate \(/i,
    ],
  },
  {
    intent: "data_analysis",
    patterns: [
      /\b(analyze data|statistics|dataset|mean|median|csv|tabular|correlation|trend analysis|metrics)\b/i,
      /summarize the numbers/i,
    ],
  },
  {
    intent: "document_analysis",
    patterns: [
      /\b(analyze|summarize|extract|read|transcribe|explain|solve|understand)\b.*(handwriting|handwritten|notes?|paper|document|pdf|docx|file|contract|report|spreadsheet|sheet|whiteboard|prescription|diagram|formula|scan)/i,
      /what does this (file|image|note|handwriting|paper|document) (say|mean|show|solve)/i,
      /\b(handwriting|handwritten|cursive|hand written|whiteboard|prescription)\b/i,
      /transcribe (this|the) (handwriting|note|image|text)/i,
      /solve (this|the|these) (question|problem|equation|math|exercise) in (the|this) (file|image|note|paper)/i,
    ],
  },
  {
    intent: "translation",
    patterns: [
      /\b(translate|convert to (telugu|hindi|spanish|french|german|tamil|kannada))\b/i,
      /how do you say .* in (hindi|telugu|french|spanish)/i,
    ],
  },
  {
    intent: "summarization",
    patterns: [
      /\b(summarize|give me a summary|tldr|bullet points of|condense)\b/i,
    ],
  },
];

export async function classifyIntent(
  userPrompt: string,
  hasAttachedImage: boolean = false,
  hasAttachedFile: boolean = false,
  apiKey?: string
): Promise<IntentClassificationResult> {
  const cleanPrompt = userPrompt.trim();

  // 1. Fast Heuristic Rule Engine
  let primaryIntent: TaskIntent = "general_chat";
  let complexityScore = 2;
  const secondaryIntents: TaskIntent[] = [];
  const suggestedTools: string[] = [];

  // Check attached contexts
  if (hasAttachedImage) {
    if (/edit|change|remove|add|replace|modify|fix/i.test(cleanPrompt)) {
      primaryIntent = "image_editing";
      complexityScore = 6;
      suggestedTools.push("image_editor");
    } else {
      primaryIntent = "document_analysis";
      complexityScore = 5;
    }
  }

  // Scan patterns
  for (const group of INTENT_PATTERNS) {
    if (group.patterns.some((p) => p.test(cleanPrompt))) {
      if (primaryIntent === "general_chat") {
        primaryIntent = group.intent;
      } else if (!secondaryIntents.includes(group.intent)) {
        secondaryIntents.push(group.intent);
      }
    }
  }

  // Determine Complexity & Tool requirements
  if (primaryIntent === "agent_task") {
    complexityScore = 9;
    suggestedTools.push("github_inspector", "web_search", "code_runner");
  } else if (primaryIntent === "coding") {
    complexityScore = 7;
    suggestedTools.push("code_runner");
  } else if (primaryIntent === "mathematics") {
    complexityScore = 6;
    suggestedTools.push("data_calculator", "code_runner");
  } else if (primaryIntent === "web_research") {
    complexityScore = 6;
    suggestedTools.push("web_search");
  } else if (primaryIntent === "data_analysis") {
    complexityScore = 6;
    suggestedTools.push("data_calculator", "document_processor");
  } else if (primaryIntent === "document_analysis") {
    complexityScore = 8;
    suggestedTools.push("document_processor", "data_calculator");
  }

  // If a file or image is attached and the user asks to explain/solve or prompt is short, classify as document_analysis
  if ((hasAttachedFile || hasAttachedImage) && (primaryIntent === "general_chat" || !cleanPrompt || cleanPrompt.length < 15)) {
    if (
      !cleanPrompt ||
      /explain|solve|solution|analyze|read|what is this|transcribe|help|answer|calculate|formula|check/i.test(cleanPrompt)
    ) {
      primaryIntent = "document_analysis";
      complexityScore = 8;
      suggestedTools.push("document_processor", "data_calculator");
    }
  }

  // Multilingual check
  const isNonAscii = /[^\x00-\x7F]/.test(cleanPrompt);
  const detectedLanguage = isNonAscii ? "multilingual" : "en";

  // 2. High-Precision AI Intent Classification if API key is present
  if (apiKey && cleanPrompt.length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const promptClassification = `Classify this user request into ONE primary intent:
[general_chat, reasoning, coding, mathematics, web_research, document_analysis, image_generation, image_editing, data_analysis, translation, summarization, agent_task]

User Prompt: "${cleanPrompt.slice(0, 500)}"
Has Attached Image: ${hasAttachedImage}
Has Attached File: ${hasAttachedFile}

Respond ONLY with valid JSON:
{
  "primaryIntent": string,
  "confidence": number,
  "complexityScore": number,
  "requiresTools": boolean,
  "suggestedTools": string[],
  "diffusionPrompt": string
}`;

      const res = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [{ text: promptClassification }],
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });

      const parsed = JSON.parse(res.text || "{}");
      if (parsed.primaryIntent) {
        return {
          primaryIntent: parsed.primaryIntent as TaskIntent,
          confidence: Number(parsed.confidence) || 0.95,
          secondaryIntents,
          complexityScore: Number(parsed.complexityScore) || complexityScore,
          requiresTools: Boolean(parsed.requiresTools) || suggestedTools.length > 0,
          suggestedTools: Array.isArray(parsed.suggestedTools) ? parsed.suggestedTools : suggestedTools,
          detectedLanguage,
          isMultilingual: isNonAscii,
          diffusionPrompt: parsed.diffusionPrompt || cleanPrompt,
        };
      }
    } catch {
      // Heuristic fallback works reliably
    }
  }

  return {
    primaryIntent,
    confidence: 0.88,
    secondaryIntents,
    complexityScore,
    requiresTools: suggestedTools.length > 0,
    suggestedTools,
    detectedLanguage,
    isMultilingual: isNonAscii,
    diffusionPrompt: cleanPrompt,
  };
}

