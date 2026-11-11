/**
 * TATTVA AI - Unified Prompt Understanding Service (Phase L)
 * Handles natural language comprehension, semantic decomposition,
 * contradiction detection, and prompt optimization.
 */

import { parsePromptUnderstanding } from "../accuracy/prompt-understanding";
import { compileImagePrompt, detectPromptContradictions } from "../prompt-compiler";
import { StructuredGenerationSpec } from "../accuracy/types";

export interface PromptAnalysisResult {
  structuredSpec: StructuredGenerationSpec;
  contradictions: string[];
  optimizedPrompt: string;
  hasReferenceImage: boolean;
}

export class PromptUnderstandingService {
  /**
   * Decomposes user prompt into structured visual requirements, detects conflicting
   * instructions, and prepares optimized prompt representation.
   */
  public static understand(
    prompt: string,
    referenceImage?: string | null,
    style?: string
  ): PromptAnalysisResult {
    const trimmed = prompt.trim();
    const structuredSpec = parsePromptUnderstanding(trimmed, referenceImage || undefined);
    const contradictions = detectPromptContradictions(trimmed);
    const compiled = compileImagePrompt({
      prompt: trimmed,
      style: style as any,
      referenceImage: referenceImage || undefined,
    });

    return {
      structuredSpec,
      contradictions,
      optimizedPrompt: compiled.positive,
      hasReferenceImage: Boolean(referenceImage),
    };
  }

  /**
   * Performs semantic decomposition across visual dimensions.
   */
  public static analyzeSemantics(prompt: string) {
    return parsePromptUnderstanding(prompt);
  }

  /**
   * Optimizes prompt for specific downstream model architecture.
   */
  public static optimizeForProvider(
    prompt: string,
    provider: "gemini" | "huggingface" | "openai" | "local" | "auto",
    options?: { style?: string; referenceImage?: string }
  ): string {
    const compiled = compileImagePrompt({
      prompt,
      style: options?.style as any,
      referenceImage: options?.referenceImage,
      provider: provider as any,
    });
    return compiled.positive;
  }
}

