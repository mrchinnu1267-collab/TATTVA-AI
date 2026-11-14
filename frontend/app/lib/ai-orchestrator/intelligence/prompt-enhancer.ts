/**
 * TATTVA AI - Contextual Prompt Enhancement Engine
 * Enriches prompts with resolved references, explicit constraints, and domain requirements
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { AnalyzedPrompt } from "./schema";

export class PromptEnhancer {
  private static instance: PromptEnhancer;

  public static getInstance(): PromptEnhancer {
    if (!PromptEnhancer.instance) {
      PromptEnhancer.instance = new PromptEnhancer();
    }
    return PromptEnhancer.instance;
  }

  /**
   * Generates tailored system guidance grounded in prompt analysis
   */
  public buildExecutionGuidance(analysis: AnalyzedPrompt): string {
    const parts: string[] = [];

    // 1. Objective Focus
    parts.push(`USER PRIMARY OBJECTIVE:\n${analysis.userObjective}`);

    // 2. Context References & Anaphora
    if (analysis.contextReferences.hasAnaphora && analysis.contextReferences.resolvedMeaning) {
      parts.push(`CONTEXTUAL REFERENCE RESOLUTION:\n${analysis.contextReferences.resolvedMeaning}`);
    }

    // 3. Explicit Constraints & Instructions
    if (analysis.constraints.length > 0) {
      parts.push(`MANDATORY USER CONSTRAINTS:\n${analysis.constraints.map((c) => `- ${c}`).join("\n")}`);
    }

    // 4. Expected Output Specification
    const out = analysis.expectedOutput;
    parts.push(
      `EXPECTED OUTPUT SPECIFICATION:\n` +
      `- Format: ${out.format}\n` +
      `- Length/Detail: ${out.length}\n` +
      `- Language Target: ${out.language}\n` +
      `- Zero Placeholders Required: ${out.requiresZeroPlaceholders}`
    );

    // 5. Implicit Requirements
    if (analysis.implicitRequirements.length > 0) {
      parts.push(
        `TECHNICAL PREREQUISITES & IMPLICIT REQUIREMENTS:\n${analysis.implicitRequirements.map((r) => `- ${r}`).join("\n")}`
      );
    }

    // 6. Subtask Plan Execution (if complex)
    if (analysis.taskDecomposition?.isMultiStep && analysis.taskDecomposition.subtasks.length > 0) {
      parts.push(
        `STRUCTURED EXECUTION ROADMAP:\n${analysis.taskDecomposition.subtasks
          .map((s) => `${s.stepNumber}. ${s.title}: ${s.description}`)
          .join("\n")}`
      );
    }

    // 7. Telugu-English Mixed Language Handling
    if (analysis.detectedDialect === "telugu_english_mixed" || analysis.detectedDialect === "telugu") {
      parts.push(
        `MULTILINGUAL / TENGLISH INSTRUCTION:\n` +
        `- The user is communicating in Telugu / Telugu-English mixed dialect.\n` +
        `- Acknowledge and reply naturally with warm, culturally fluent Telugu or Tenglish, explaining technical concepts clearly.`
      );
    }

    return parts.join("\n\n");
  }
}

export const promptEnhancer = PromptEnhancer.getInstance();
