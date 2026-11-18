/**
 * TATTVA AI - Multilingual Conversational Intelligence Engine
 * Native Indic Script & Romanized Code-Mixing (Telugu, Tenglish, Hindi, Hinglish, English)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type SupportedLanguage = "en" | "te" | "te-en" | "hi" | "hi-en";

export interface MultilingualAnalysis {
  detectedLanguage: SupportedLanguage;
  script: "latin" | "telugu" | "devanagari" | "mixed";
  isCodeMixed: boolean;
  transliteratedTokens: string[];
  cleanNormalizedText: string;
  responseLanguageDirective: string;
  preservesContextCrossLanguage: boolean;
}

const TELUGU_SCRIPT_REGEX = /[\u0C00-\u0C7F]/;
const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;

// Common colloquial Romanized Telugu (Tenglish) functional words
const TENGLISH_MARKERS = [
  /\b(naku|neeku|maaku|meeku|atani|aame|dini|deeni|idi|adi|evi|ivi)\b/i,
  /\b(ardham|artham|kaledu|kavali|vaddu|undhi|undi|ledu|cheppu|cheppandi|cheppava)\b/i,
  /\b(ela|enduku|ekkada|epudu|eppudu|evaru|emiti|enti|cheyyali|chesanu|cheyacha|cheyadaniki)\b/i,
  /\b(bagundi|baguntunda|baga|chala|konchem|tvaraga|ippudu|malli|marala|kuda|antha|aindi)\b/i,
  /\b(chesara|cheyali|cheyyandi|cheyandi|vastondi|ravatledu|chudu|chudandi|chudava|lo)\b/i,
];

// Common colloquial Romanized Hindi (Hinglish) functional words
const HINGLISH_MARKERS = [
  /\b(mujhe|tujhe|humein|aapko|iska|uska|yeh|woh|kya|kyun|kaise|mein)\b/i,
  /\b(samajh|samjhaiye|aaya|nahi|aara|raha|chahiye|matlab|batao|bataiye|karo|karein)\b/i,
  /\b(kahan|kab|kaun|bohot|bahut|thoda|jaldi|abhi|phir|bhi|sab|baar)\b/i,
  /\b(karoge|karna|chal|raha|hoga|hogi|achha|accha|theek|sahi|jata|hai|hain)\b/i,
  /\b(shukriya|dhanyavaad|bhai|yaar|dost|madad|madat)\b/i,
];

// Common informal chat typos and abbreviations
const SLANG_NORMALIZATION_MAP: Record<string, string> = {
  pls: "please",
  plz: "please",
  thx: "thanks",
  ty: "thank you",
  idk: "i do not know",
  wbu: "what about you",
  hbu: "how about you",
  bc: "because",
  bcoz: "because",
  cuz: "because",
  u: "you",
  ur: "your",
  r: "are",
  y: "why",
  k: "okay",
  ok: "okay",
  tmrw: "tomorrow",
  asap: "as soon as possible",
  btw: "by the way",
  rn: "right now",
  tbh: "to be honest",
  imo: "in my opinion",
  fyi: "for your information",
};

export class MultilingualConversationalEngine {
  private static instance: MultilingualConversationalEngine;

  public static getInstance(): MultilingualConversationalEngine {
    if (!MultilingualConversationalEngine.instance) {
      MultilingualConversationalEngine.instance = new MultilingualConversationalEngine();
    }
    return MultilingualConversationalEngine.instance;
  }

  /**
   * Analyzes linguistic dialect, script, and code-mixing in user prompt
   */
  public analyzeLanguage(
    rawText: string,
    historyTurns: Array<{ role: string; content: string }> = []
  ): MultilingualAnalysis {
    const clean = rawText.trim();
    const hasTelugu = TELUGU_SCRIPT_REGEX.test(clean);
    const hasDevanagari = DEVANAGARI_SCRIPT_REGEX.test(clean);
    const hasLatin = /[a-zA-Z]/.test(clean);

    let script: "latin" | "telugu" | "devanagari" | "mixed" = "latin";
    if (hasTelugu && hasLatin) script = "mixed";
    else if (hasDevanagari && hasLatin) script = "mixed";
    else if (hasTelugu) script = "telugu";
    else if (hasDevanagari) script = "devanagari";

    // Normalize informal typos & slang tokens
    const tokens = clean.split(/\s+/);
    const normalizedTokens = tokens.map((t) => {
      const lower = t.toLowerCase().replace(/[^a-z]/g, "");
      return SLANG_NORMALIZATION_MAP[lower] || t;
    });
    const cleanNormalizedText = normalizedTokens.join(" ");

    // Check Romanized Indic (Tenglish vs Hinglish vs English)
    let isTenglish = false;
    let isHinglish = false;

    if (hasLatin && !hasTelugu && !hasDevanagari) {
      let tenglishCount = 0;
      for (const pattern of TENGLISH_MARKERS) {
        if (pattern.test(clean)) tenglishCount++;
      }
      if (tenglishCount >= 1) isTenglish = true;

      let hinglishCount = 0;
      for (const pattern of HINGLISH_MARKERS) {
        if (pattern.test(clean)) hinglishCount++;
      }
      if (hinglishCount >= 1) isHinglish = true;
    }

    let detectedLanguage: SupportedLanguage = "en";
    let isCodeMixed = false;

    if (hasTelugu) {
      detectedLanguage = hasLatin ? "te-en" : "te";
      isCodeMixed = hasLatin;
    } else if (hasDevanagari) {
      detectedLanguage = hasLatin ? "hi-en" : "hi";
      isCodeMixed = hasLatin;
    } else if (isTenglish) {
      detectedLanguage = "te-en";
      isCodeMixed = true;
    } else if (isHinglish) {
      detectedLanguage = "hi-en";
      isCodeMixed = true;
    }

    // Context Cross-Language check: Did user switch languages compared to previous turns?
    const lastUserTurn = [...historyTurns].reverse().find((t) => t.role === "user")?.content || "";
    const prevHadTelugu = TELUGU_SCRIPT_REGEX.test(lastUserTurn);
    const prevHadHindi = DEVANAGARI_SCRIPT_REGEX.test(lastUserTurn);
    const preservesContextCrossLanguage =
      (hasTelugu && !prevHadTelugu) ||
      (hasDevanagari && !prevHadHindi) ||
      (isTenglish && !prevHadTelugu) ||
      (isHinglish && !prevHadHindi);

    const responseLanguageDirective = this.buildLanguageDirective(detectedLanguage, script);

    return {
      detectedLanguage,
      script,
      isCodeMixed,
      transliteratedTokens: tokens,
      cleanNormalizedText,
      responseLanguageDirective,
      preservesContextCrossLanguage,
    };
  }

  private buildLanguageDirective(
    lang: SupportedLanguage,
    script: "latin" | "telugu" | "devanagari" | "mixed"
  ): string {
    switch (lang) {
      case "te":
        return "LANGUAGE DIRECTIVE: The user is writing in fluent Telugu script (తెలుగు). Reply in high-quality, grammatically correct, natural Telugu script with respectful warmth. Retain standard English programming identifiers inside code blocks.";
      case "te-en":
        return "LANGUAGE DIRECTIVE: The user is communicating in natural Telugu-English (Tenglish / Romanized Telugu). Reply in friendly, conversational Tenglish (mixed Telugu-English) or clean Telugu script matching their register. Explain technical concepts warmly and intuitively.";
      case "hi":
        return "LANGUAGE DIRECTIVE: The user is writing in Hindi Devanagari (हिन्दी). Reply in clear, respectful, grammatically sound Hindi. Keep code and technical variable names in English.";
      case "hi-en":
        return "LANGUAGE DIRECTIVE: The user is communicating in conversational Hindi-English (Hinglish). Reply in natural, conversational Hinglish (clear Romanized Hindi mixed with English technical terms).";
      default:
        return "LANGUAGE DIRECTIVE: Communicate in natural, clear, professional English. Be friendly, approachable, and context-aware.";
    }
  }
}

export const multilingualConversationalEngine = MultilingualConversationalEngine.getInstance();
