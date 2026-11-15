/**
 * TATTVA AI - Robust Mathematical Answer Extractor & Normalizer
 * Extracts numerical answers from structured JSON, LaTeX, and natural language.
 * Enforces rigorous anti-hallucination verification without false-positive substring matching.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { Gsm8kAnswerExtraction } from "./types";

export class MathAnswerExtractor {
  private static instance: MathAnswerExtractor;

  public static getInstance(): MathAnswerExtractor {
    if (!MathAnswerExtractor.instance) {
      MathAnswerExtractor.instance = new MathAnswerExtractor();
    }
    return MathAnswerExtractor.instance;
  }

  /**
   * Normalizes a raw string or number into a standard float/integer
   */
  public normalizeNumericValue(raw: string | number | null | undefined): number | null {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "number") return isNaN(raw) ? null : raw;

    let str = String(raw).trim();

    // Strip currency symbols, percent signs, and quotes
    str = str.replace(/[$€£¥₹%,"'\s]/g, "");

    // Handle fractional strings like "1/2" or "3/4"
    if (/^-?\d+\/\d+$/.test(str)) {
      const [num, den] = str.split("/").map(Number);
      return den !== 0 ? num / den : null;
    }

    const val = parseFloat(str);
    return isNaN(val) ? null : val;
  }

  /**
   * Extracts numerical answer from AI response
   */
  public extractAnswer(rawResponse: string): Gsm8kAnswerExtraction {
    if (!rawResponse || typeof rawResponse !== "string") {
      return {
        rawResponse: "",
        extractedAnswer: "",
        normalizedNumericValue: null,
        explanation: "",
        isStructuredJson: false,
        extractionConfidence: "none",
      };
    }

    const trimmed = rawResponse.trim();

    // 1. Check for JSON structure (e.g. {"answer": "18", "explanation": "..."})
    try {
      let jsonStr = trimmed;
      // Strip markdown code fences if wrapped in ```json ... ```
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      if (jsonStr.startsWith("{") && jsonStr.endsWith("}")) {
        const parsed = JSON.parse(jsonStr);
        if (parsed.answer !== undefined) {
          const ansStr = String(parsed.answer).trim();
          const num = this.normalizeNumericValue(ansStr);
          return {
            rawResponse: trimmed,
            extractedAnswer: ansStr,
            normalizedNumericValue: num,
            explanation: parsed.explanation || "",
            isStructuredJson: true,
            extractionConfidence: num !== null ? "high" : "medium",
          };
        }
      }
    } catch {
      // Continue to regex patterns
    }

    // 2. Check for canonical GSM8K delimiter: #### <number>
    const hashMatch = trimmed.match(/####\s*(-?[\d,]+(?:\.\d+)?)/);
    if (hashMatch) {
      const ansStr = hashMatch[1].replace(/,/g, "");
      const num = this.normalizeNumericValue(ansStr);
      return {
        rawResponse: trimmed,
        extractedAnswer: ansStr,
        normalizedNumericValue: num,
        explanation: trimmed.replace(/####[\s\S]*$/, "").trim(),
        isStructuredJson: false,
        extractionConfidence: "high",
      };
    }

    // 3. Check for LaTeX boxed notation: \boxed{<number>}
    const boxedMatch = trimmed.match(/\\boxed\{([^{}]+)\}/);
    if (boxedMatch) {
      const inside = boxedMatch[1].trim();
      const num = this.normalizeNumericValue(inside);
      if (num !== null) {
        return {
          rawResponse: trimmed,
          extractedAnswer: inside,
          normalizedNumericValue: num,
          explanation: trimmed,
          isStructuredJson: false,
          extractionConfidence: "high",
        };
      }
    }

    // 4. Check for explicit final answer phrases:
    // e.g. "Final Answer: 18", "The answer is 18", "The final answer is: 18"
    const phrasePatterns = [
      /(?:final\s+answer|the\s+answer\s+is|therefore,?\s*(?:the\s+answer\s+is)?|total\s*(?:is|=|:))\s*[:=]?\s*[$]?\s*(-?[\d,]+(?:\.\d+)?)/i,
      /(?:equals|amounts\s+to|comes\s+to)\s*[$]?\s*(-?[\d,]+(?:\.\d+)?)\.?$/im,
    ];

    for (const pattern of phrasePatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const ansStr = match[1].replace(/,/g, "");
        const num = this.normalizeNumericValue(ansStr);
        if (num !== null) {
          return {
            rawResponse: trimmed,
            extractedAnswer: ansStr,
            normalizedNumericValue: num,
            explanation: trimmed,
            isStructuredJson: false,
            extractionConfidence: "medium",
          };
        }
      }
    }

    // 5. Fallback: Extract the last isolated number in the text
    const allNumbers = [...trimmed.matchAll(/(?:^|\s)[$]?(-?[\d,]+(?:\.\d+)?)(?:\s|$|\.)/g)];
    if (allNumbers.length > 0) {
      const lastMatch = allNumbers[allNumbers.length - 1];
      const ansStr = lastMatch[1].replace(/,/g, "");
      const num = this.normalizeNumericValue(ansStr);
      if (num !== null) {
        return {
          rawResponse: trimmed,
          extractedAnswer: ansStr,
          normalizedNumericValue: num,
          explanation: trimmed,
          isStructuredJson: false,
          extractionConfidence: "low",
        };
      }
    }

    return {
      rawResponse: trimmed,
      extractedAnswer: "",
      normalizedNumericValue: null,
      explanation: trimmed,
      isStructuredJson: false,
      extractionConfidence: "none",
    };
  }

  /**
   * Compares the expected answer and AI extracted answer using numerical tolerance
   * Precision epsilon: 1e-4
   */
  public compareAnswers(
    expectedRaw: string,
    aiRawResponse: string
  ): {
    isCorrect: boolean;
    isInvalid: boolean;
    expectedNumericValue: number | null;
    aiNumericValue: number | null;
    extractedAnswer: string;
    explanation: string;
  } {
    const expectedNum = this.normalizeNumericValue(expectedRaw);
    const extraction = this.extractAnswer(aiRawResponse);
    const aiNum = extraction.normalizedNumericValue;

    if (expectedNum === null || aiNum === null) {
      return {
        isCorrect: false,
        isInvalid: aiNum === null, // If AI provided no parseable number, it's invalid
        expectedNumericValue: expectedNum,
        aiNumericValue: aiNum,
        extractedAnswer: extraction.extractedAnswer,
        explanation: extraction.explanation,
      };
    }

    // Floating-point / integer comparison with epsilon tolerance
    const epsilon = 1e-4;
    const diff = Math.abs(expectedNum - aiNum);
    const isCorrect = diff < epsilon;

    return {
      isCorrect,
      isInvalid: false,
      expectedNumericValue: expectedNum,
      aiNumericValue: aiNum,
      extractedAnswer: extraction.extractedAnswer,
      explanation: extraction.explanation,
    };
  }
}

export const mathAnswerExtractor = MathAnswerExtractor.getInstance();
