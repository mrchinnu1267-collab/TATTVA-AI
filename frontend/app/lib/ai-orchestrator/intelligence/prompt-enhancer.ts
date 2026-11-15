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

    // 7. Telugu-English Mixed Language & Indic Knowledge Handling
    if (analysis.detectedDialect === "telugu_english_mixed" || analysis.detectedDialect === "telugu") {
      parts.push(
        `MULTILINGUAL / TENGLISH INSTRUCTION:\n` +
        `- The user is communicating in Telugu / Telugu-English mixed dialect.\n` +
        `- Acknowledge and reply naturally with warm, culturally fluent Telugu or Tenglish, explaining technical concepts clearly.\n` +
        `- INDIC KNOWLEDGE PRECISION: For regional governance and state symbols post-2014/2018 Andhra Pradesh/Telangana bifurcation, ensure official post-bifurcation emblems are used (e.g. AP state bird is Rama Chiluka / Rose-ringed parakeet; Telangana is Palapitta / Indian Roller).`
      );
    } else if (analysis.detectedDialect === "hindi") {
      parts.push(
        `DEVANAGARI / HINDI INSTRUCTION:\n` +
        `- The user is communicating in Hindi.\n` +
        `- Respond in clear, formal Devanagari Hindi while preserving accurate mathematical, technical, and medical terminologies.`
      );
    }

    // 8. Mathematical Chain-of-Thought & Quantitative Precision
    if (analysis.primaryIntent === "mathematics" || analysis.secondaryIntents.includes("mathematics")) {
      parts.push(
        `MATHEMATICAL REASONING PROTOCOL:\n` +
        `- State the governing formula explicitly.\n` +
        `- Perform step-by-step intermediate substitution and arithmetic before declaring the final result.\n` +
        `- For set-theory calculations (e.g. n(A ∪ B) = n(A) + n(B) - n(A ∩ B)), verify intersection subtraction.\n` +
        `- For probability problems, calculate complementary probability P(E) = 1 - P(E') to prevent arithmetic slips.`
      );
    }

    // 9. Negative Constraint & Anti-Hallucination Guard
    if (analysis.constraints.length > 0) {
      parts.push(
        `NEGATIVE CONSTRAINT ENFORCEMENT:\n` +
        `- Strictly verify all negative rules (e.g. forbidden words, excluded keys, length caps).\n` +
        `- If structured JSON is requested, deliver pure valid JSON without introductory or conversational filler.`
      );
    }

    return parts.join("\n\n");
  }

  /**
   * Appends execution guidance onto a base system prompt
   */
  public enhanceSystemPrompt(baseSystemPrompt: string, analysis: AnalyzedPrompt): string {
    const guidance = this.buildExecutionGuidance(analysis);
    return `${baseSystemPrompt}\n\n=== TATTVA COGNITIVE EXECUTION GUIDANCE ===\n${guidance}`;
  }
}

export const promptEnhancer = PromptEnhancer.getInstance();
