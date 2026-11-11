/**
 * TATTVA AI - Correction Intelligence Engine (Phase N)
 * Analyzes unsuccessful and successful correction attempts to determine error correctability,
 * capable providers, and futile-attempt abort conditions, enforcing strict cost and retry limits.
 */

import {
  FailureProblemCategory,
  CorrectionCapabilityRule,
} from "./types";

export class CorrectionIntelligenceEngine {
  private rules: Map<FailureProblemCategory, CorrectionCapabilityRule> = new Map();

  constructor() {
    this.seedCapabilityRules();
  }

  /**
   * Evaluates whether a detected failure is surgically correctable, futile, or requires regeneration.
   */
  public evaluateCorrectionViability(params: {
    problemCategory: FailureProblemCategory;
    currentAttemptCount: number;
    totalCostIncurredUSD: number;
    failedRequirement: string;
    hasBoundingBox: boolean;
  }): {
    isViable: boolean;
    recommendedStrategy: "inpainting" | "regeneration" | "prompt_reweight" | "outpainting" | "abort_futile";
    rationale: string;
    maxRetriesAllowed: number;
    costLimitUSD: number;
  } {
    const { problemCategory, currentAttemptCount, totalCostIncurredUSD, hasBoundingBox } = params;
    const rule = this.rules.get(problemCategory) || this.getDefaultRule(problemCategory);

    // 1. Guardrail: Max retries exceeded
    if (currentAttemptCount >= rule.maxRetriesAllowed) {
      return {
        isViable: false,
        recommendedStrategy: "abort_futile",
        rationale: `Exceeded maximum allowable correction attempts (${rule.maxRetriesAllowed}) for ${problemCategory}. Halting further retries to prevent generation thrashing.`,
        maxRetriesAllowed: rule.maxRetriesAllowed,
        costLimitUSD: rule.costLimitUSD,
      };
    }

    // 2. Guardrail: Cost limit exceeded
    if (totalCostIncurredUSD >= rule.costLimitUSD) {
      return {
        isViable: false,
        recommendedStrategy: "abort_futile",
        rationale: `Cost limit ($${rule.costLimitUSD}) reached for correction. Total spend: $${totalCostIncurredUSD.toFixed(4)}.`,
        maxRetriesAllowed: rule.maxRetriesAllowed,
        costLimitUSD: rule.costLimitUSD,
      };
    }

    // 3. Problem Category Correctability Evaluation
    if (!rule.isSurgicallyCorrectable) {
      // Global composition collapses or complex multi-entity crowd failures cannot be solved with inpainting
      return {
        isViable: true,
        recommendedStrategy: "regeneration",
        rationale: `${problemCategory} alters global scene structure. Targeted localized inpainting is futile; full regeneration with revised prompt decomposition is required.`,
        maxRetriesAllowed: 1, // Only allow 1 full regeneration retry
        costLimitUSD: rule.costLimitUSD,
      };
    }

    // If localized inpainting is recommended but no bounding box is available and prompt is spatial
    if (rule.recommendedStrategy === "inpainting" && !hasBoundingBox) {
      return {
        isViable: true,
        recommendedStrategy: "prompt_reweight",
        rationale: `Surgical inpainting requested for ${problemCategory}, but no localized coordinates available. Falling back to targeted prompt re-weighting.`,
        maxRetriesAllowed: rule.maxRetriesAllowed,
        costLimitUSD: rule.costLimitUSD,
      };
    }

    return {
      isViable: true,
      recommendedStrategy: rule.recommendedStrategy,
      rationale: `Correction viable using ${rule.recommendedStrategy}. Historical success rate: ${rule.averageSuccessRate}% on ${problemCategory}.`,
      maxRetriesAllowed: rule.maxRetriesAllowed,
      costLimitUSD: rule.costLimitUSD,
    };
  }

  /**
   * Returns the capability rule for a given problem category.
   */
  public getRule(category: FailureProblemCategory): CorrectionCapabilityRule {
    return this.rules.get(category) || this.getDefaultRule(category);
  }

  /**
   * Updates capability telemetry following a live correction outcome.
   */
  public recordCorrectionOutcome(params: {
    category: FailureProblemCategory;
    success: boolean;
    unmaskedPreservationPercent: number;
  }): void {
    const existing = this.rules.get(params.category);
    if (!existing) return;

    // Moving average of success rate
    const weight = 0.05;
    const outcome = params.success ? 100 : 0;
    existing.averageSuccessRate = Number(
      ((existing.averageSuccessRate * (1 - weight)) + (outcome * weight)).toFixed(1)
    );
    this.rules.set(params.category, existing);
  }

  private getDefaultRule(category: FailureProblemCategory): CorrectionCapabilityRule {
    return {
      problemCategory: category,
      isSurgicallyCorrectable: true,
      recommendedStrategy: "inpainting",
      capableProviders: ["pollinations", "gemini", "huggingface"],
      averageSuccessRate: 75.0,
      unwantedChangeRisk: "low",
      maxRetriesAllowed: 2,
      costLimitUSD: 0.015,
    };
  }

  private seedCapabilityRules(): void {
    const capabilityRules: CorrectionCapabilityRule[] = [
      {
        problemCategory: "incorrect_text",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 88.5,
        unwantedChangeRisk: "low",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.010,
      },
      {
        problemCategory: "incorrect_colors",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "huggingface"],
        averageSuccessRate: 85.0,
        unwantedChangeRisk: "low",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.008,
      },
      {
        problemCategory: "incorrect_materials",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 81.2,
        unwantedChangeRisk: "low",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.010,
      },
      {
        problemCategory: "missing_objects",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 79.4,
        unwantedChangeRisk: "medium",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.012,
      },
      {
        problemCategory: "extra_objects",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "huggingface"],
        averageSuccessRate: 91.0,
        unwantedChangeRisk: "low",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.008,
      },
      {
        problemCategory: "wrong_positioning",
        isSurgicallyCorrectable: false,
        recommendedStrategy: "regeneration",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 64.0,
        unwantedChangeRisk: "high",
        maxRetriesAllowed: 1,
        costLimitUSD: 0.020,
      },
      {
        problemCategory: "composition_mismatches",
        isSurgicallyCorrectable: false,
        recommendedStrategy: "regeneration",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 58.5,
        unwantedChangeRisk: "high",
        maxRetriesAllowed: 1,
        costLimitUSD: 0.025,
      },
      {
        problemCategory: "reference_inconsistencies",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 76.5,
        unwantedChangeRisk: "medium",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.018,
      },
      {
        problemCategory: "incorrect_object_counts",
        isSurgicallyCorrectable: true, // If delta is 1-2 items, can add/remove with inpainting
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 78.0,
        unwantedChangeRisk: "medium",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.012,
      },
      {
        problemCategory: "incorrect_backgrounds",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "outpainting",
        capableProviders: ["pollinations", "huggingface"],
        averageSuccessRate: 83.0,
        unwantedChangeRisk: "medium",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.015,
      },
      {
        problemCategory: "incorrect_attributes",
        isSurgicallyCorrectable: true,
        recommendedStrategy: "inpainting",
        capableProviders: ["pollinations", "gemini"],
        averageSuccessRate: 84.5,
        unwantedChangeRisk: "low",
        maxRetriesAllowed: 2,
        costLimitUSD: 0.010,
      },
    ];

    capabilityRules.forEach((r) => this.rules.set(r.problemCategory, r));
  }
}

export const correctionIntelligence = new CorrectionIntelligenceEngine();

