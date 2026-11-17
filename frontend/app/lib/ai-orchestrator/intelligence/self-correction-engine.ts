/**
 * TATTVA AI - Self-Correction and Answer Quality Engine
 * Pre-flight evaluation against 8 mandatory quality gates,
 * bounded self-correction loop, and honest verification reporting.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TaskIntent } from "../types";

export interface QualityGateResult {
  gate: string;
  passed: boolean;
  score: number; // 0 to 100
  details?: string;
}

export interface QualityEvaluationReport {
  overallScore: number; // 0 to 100
  isValid: boolean;
  needsCorrection: boolean;
  issues: string[];
  gateResults: QualityGateResult[];
}

export class SelfCorrectionEngine {
  private static instance: SelfCorrectionEngine;

  private constructor() {}

  public static getInstance(): SelfCorrectionEngine {
    if (!SelfCorrectionEngine.instance) {
      SelfCorrectionEngine.instance = new SelfCorrectionEngine();
    }
    return SelfCorrectionEngine.instance;
  }

  /**
   * Evaluates response against the 8 mandatory Quality Assurance Gates
   */
  public evaluateQuality(
    prompt: string,
    response: string,
    intent: TaskIntent,
    options?: {
      expectedLanguage?: string;
      constraints?: string[];
    }
  ): QualityEvaluationReport {
    const p = prompt.trim();
    const r = response.trim();
    const lowerP = p.toLowerCase();
    const lowerR = r.toLowerCase();

    const gateResults: QualityGateResult[] = [];
    const issues: string[] = [];

    // Gate 1: Question Understanding
    const understandsIntent = r.length > 20 && !r.includes("I cannot understand what you are asking");
    gateResults.push({
      gate: "Question Understanding",
      passed: understandsIntent,
      score: understandsIntent ? 100 : 30,
      details: understandsIntent ? "Prompt intent recognized" : "Failed to comprehend question",
    });
    if (!understandsIntent) issues.push("The response did not comprehend the question.");

    // Gate 2: Task Addressal
    let addressesTask = true;
    if (intent === "coding" && !r.includes("```") && !r.includes("function") && !r.includes("def ") && !r.includes("class ")) {
      // If code was explicitly requested but no code provided
      if (/\b(write|code|implement|function|create|script)\b/i.test(lowerP)) {
        addressesTask = false;
        issues.push("Requested code implementation was missing.");
      }
    }
    gateResults.push({
      gate: "Task Addressal",
      passed: addressesTask,
      score: addressesTask ? 100 : 40,
    });

    // Gate 3: Logical Consistency
    let logicallyConsistent = true;
    if (r.includes("not possible") && r.includes("here is the complete working solution")) {
      logicallyConsistent = false;
      issues.push("Response contains contradictory statements.");
    }
    gateResults.push({
      gate: "Logical Consistency",
      passed: logicallyConsistent,
      score: logicallyConsistent ? 100 : 50,
    });

    // Gate 4: Unsupported / Fabricated Claims Guard
    let groundedClaims = true;
    if (r.includes("I just ran this on my internal GPU server") || r.includes("I connected to your local database")) {
      groundedClaims = false;
      issues.push("Unverified computational claims detected.");
    }
    gateResults.push({
      gate: "Unsupported Claims Guard",
      passed: groundedClaims,
      score: groundedClaims ? 100 : 50,
    });

    // Gate 5: Completeness & Truncation Check
    let isComplete = true;
    // Check unclosed code blocks
    const codeBlockCount = (r.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      isComplete = false;
      issues.push("Unclosed code block detected; response was truncated.");
    }
    // Check dangling sentence ending with unfinished punctuation
    if (/[,\:\(\[\{]\s*$/.test(r) && r.length > 100) {
      isComplete = false;
      issues.push("Response ends abruptly mid-clause.");
    }
    gateResults.push({
      gate: "Completeness Check",
      passed: isComplete,
      score: isComplete ? 100 : 40,
    });

    // Gate 6: Language / Script Compliance
    let languageRespected = true;
    const requestedTelugu = /తెలుగు|telugu/i.test(lowerP);
    const requestedHindi = /हिंदी|hindi/i.test(lowerP);

    if (requestedTelugu && !/[\u0C00-\u0C7F]/.test(r) && !/tenglish/i.test(lowerP)) {
      languageRespected = false;
      issues.push("Requested Telugu script was not used.");
    }
    if (requestedHindi && !/[\u0900-\u097F]/.test(r)) {
      languageRespected = false;
      issues.push("Requested Hindi Devanagari script was not used.");
    }
    gateResults.push({
      gate: "Language Compliance",
      passed: languageRespected,
      score: languageRespected ? 100 : 40,
    });

    // Gate 7: Syntax Plausibility for Code
    let syntaxPlausible = true;
    if (r.includes("```")) {
      const codeBlocks = [...r.matchAll(/```(?:[a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g)].map((m) => m[1]);
      for (const block of codeBlocks) {
        // Simple balance checks for curly braces and parentheses
        const openBraces = (block.match(/\{/g) || []).length;
        const closeBraces = (block.match(/\}/g) || []).length;
        const openParens = (block.match(/\(/g) || []).length;
        const closeParens = (block.match(/\)/g) || []).length;

        if (Math.abs(openBraces - closeBraces) > 3 || Math.abs(openParens - closeParens) > 3) {
          syntaxPlausible = false;
          issues.push("Code snippet has severely unbalanced brackets or parentheses.");
          break;
        }
      }
    }
    gateResults.push({
      gate: "Syntax Plausibility",
      passed: syntaxPlausible,
      score: syntaxPlausible ? 100 : 60,
    });

    // Gate 8: Constraint Preservation
    let constraintsPreserved = true;
    if (options?.constraints && options.constraints.length > 0) {
      for (const c of options.constraints) {
        const lowerC = c.toLowerCase();
        if (lowerC.includes("no emoji") && /[\u{1F300}-\u{1F9FF}]/u.test(r)) {
          constraintsPreserved = false;
          issues.push(`Constraint violated: emojis were used.`);
        }
      }
    }
    gateResults.push({
      gate: "Constraint Preservation",
      passed: constraintsPreserved,
      score: constraintsPreserved ? 100 : 50,
    });

    // Compute overall score
    const totalScore = gateResults.reduce((sum, g) => sum + g.score, 0);
    const overallScore = Math.round(totalScore / gateResults.length);
    const hasCriticalGateFailure = gateResults.some((g) => !g.passed);
    const needsCorrection = issues.length > 0 && (hasCriticalGateFailure || overallScore < 85);

    return {
      overallScore,
      isValid: issues.length === 0,
      needsCorrection,
      issues,
      gateResults,
    };
  }

  /**
   * Formulates a targeted self-correction instruction prompt
   */
  public buildCorrectionDirective(issues: string[]): string {
    return (
      `\n\n[MANDATORY QUALITY SELF-CORRECTION DIRECTIVE]:\n` +
      `Your previous generation did not pass pre-flight quality validation due to:\n` +
      issues.map((iss, i) => `${i + 1}. ${iss}`).join("\n") +
      `\n\nPlease re-evaluate the original user objective and regenerate a complete, corrected response that directly resolves all listed issues without any truncation.`
    );
  }
}

export const selfCorrectionEngine = SelfCorrectionEngine.getInstance();
