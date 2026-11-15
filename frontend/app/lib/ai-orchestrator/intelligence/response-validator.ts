/**
 * TATTVA AI - Post-Generation Response Validator & Quality Guard
 * Evaluates generated responses against extracted requirements, constraints, and format expectations
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { AnalyzedPrompt, ValidationResult } from "./schema";

export class ResponseValidator {
  private static instance: ResponseValidator;

  public static getInstance(): ResponseValidator {
    if (!ResponseValidator.instance) {
      ResponseValidator.instance = new ResponseValidator();
    }
    return ResponseValidator.instance;
  }

  public validate(responseContent: string, analysis: AnalyzedPrompt): ValidationResult {
    const raw = responseContent || "";
    const lower = raw.toLowerCase();
    const missing: string[] = [];

    // 1. Check for placeholder text if zero placeholders required
    if (analysis.expectedOutput.requiresZeroPlaceholders) {
      if (
        /\/\/\s*todo\b/i.test(raw) ||
        /#\s*todo\b/i.test(raw) ||
        /\[fill\s*in\]/i.test(raw) ||
        /\/\*\s*add logic here\s*\*\//i.test(raw) ||
        /\.\.\.\s*rest of code/i.test(raw)
      ) {
        missing.push("Contains truncated code or unfinished TODO placeholders.");
      }
    }

    // 2. Check for requested format compliance
    let matchesRequestedFormat = true;
    if (analysis.expectedOutput.format === "code") {
      if (!raw.includes("```") && !raw.includes("function") && !raw.includes("const ") && !raw.includes("def ")) {
        matchesRequestedFormat = false;
        missing.push("Expected runnable code block but received plain text narrative.");
      }
    } else if (analysis.expectedOutput.format === "table") {
      if (!raw.includes("|") && !raw.includes("---")) {
        matchesRequestedFormat = false;
        missing.push("Expected comparison table layout with markdown pipes.");
      }
    } else if (analysis.expectedOutput.format === "json") {
      if (!raw.includes("{") || !raw.includes("}")) {
        matchesRequestedFormat = false;
        missing.push("Expected structured JSON output format.");
      } else {
        // Validate JSON parseability
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            JSON.parse(jsonMatch[0]);
          } else {
            matchesRequestedFormat = false;
            missing.push("Malformed JSON syntax in response.");
          }
        } catch {
          matchesRequestedFormat = false;
          missing.push("JSON payload failed strict parse validation.");
        }
      }
    }

    // 2b. Check negative constraints & forbidden words
    if (analysis.constraints && analysis.constraints.length > 0) {
      for (const c of analysis.constraints) {
        const forbiddenMatch = c.match(/do not use (?:the word )?['"]?([a-zA-Z0-9_-]+)['"]?/i);
        if (forbiddenMatch) {
          const forbiddenWord = forbiddenMatch[1].toLowerCase();
          const wordRegex = new RegExp(`\\b${forbiddenWord}\\b`, "i");
          if (wordRegex.test(raw)) {
            missing.push(`Negative constraint violation: Output contains forbidden word '${forbiddenWord}'.`);
          }
        }
      }
    }

    // 2c. Check tool execution integrity: prevent presenting failed actions as completed
    if (
      /\b(tool execution failed|error executing tool|internal server error|failed to fetch)\b/i.test(raw) &&
      /\b(successfully completed|operation succeeded|task completed)\b/i.test(raw)
    ) {
      missing.push("Contradictory state: presents failed tool action as successful.");
    }

    // 3. Check for mandatory entities mentioned
    for (const tech of analysis.entities.slice(0, 3)) {
      if (!lower.includes(tech.toLowerCase())) {
        missing.push(`Core requested entity '${tech}' appears to be missing or unaddressed.`);
      }
    }

    // 4. Check for length constraints
    if (analysis.expectedOutput.length === "concise" && raw.length > 1500) {
      missing.push("Response exceeded requested concise length boundary.");
    }

    // 5. Score computation
    const hasHardViolation = missing.some(
      (m) => m.includes("Negative constraint") || m.includes("Contradictory state")
    );
    const deduction = missing.length * 18 + (hasHardViolation ? 40 : 0);
    const score = Math.max(0, 100 - deduction);
    const isValid = !hasHardViolation && score >= 70 && matchesRequestedFormat;

    let correctionGuidance: string | undefined = undefined;
    if (!isValid) {
      correctionGuidance = `Please address these missing requirements:\n${missing.map((m) => `- ${m}`).join("\n")}`;
    }

    return {
      isValid,
      answersActualQuestion: score >= 60,
      satisfiesRequirements: missing.length === 0,
      preservesConstraints: missing.filter((m) => m.includes("boundary") || m.includes("TODO") || m.includes("constraint") || m.includes("forbidden")).length === 0,
      usesCorrectContext: true,
      matchesRequestedFormat,
      hasUnsupportedAssumptions: false,
      score,
      missingRequirements: missing,
      correctionGuidance,
    };
  }
}

export const responseValidator = ResponseValidator.getInstance();
