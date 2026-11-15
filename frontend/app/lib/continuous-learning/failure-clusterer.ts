/**
 * TATTVA AI - Failure Clustering & Root Cause Analyzer (Phase 20)
 * Aggregates failure logs into taxonomy clusters to identify systemic flaws
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { UserFeedbackEntry, FailureCluster, FailureCategoryType } from "./types";

export class FailureClusterer {
  private static instance: FailureClusterer;

  public static getInstance(): FailureClusterer {
    if (!FailureClusterer.instance) {
      FailureClusterer.instance = new FailureClusterer();
    }
    return FailureClusterer.instance;
  }

  /**
   * Clusters negative feedback into systemic failure patterns
   */
  public clusterFailures(entries: UserFeedbackEntry[]): FailureCluster[] {
    const categoryMap = new Map<FailureCategoryType, UserFeedbackEntry[]>();

    for (const entry of entries) {
      if (!entry.category) continue;
      const group = categoryMap.get(entry.category) || [];
      group.push(entry);
      categoryMap.set(entry.category, group);
    }

    const clusters: FailureCluster[] = [];

    const rootCauseMap: Record<FailureCategoryType, { cause: string; action: string }> = {
      missed_constraint: {
        cause: "Negative constraints weakened during long context generation",
        action: "Inject explicit negative assertion guardrails in prompt enhancer",
      },
      wrong_intent: {
        cause: "Intent classification ambiguity between informational inquiry and code generation",
        action: "Refine regex and semantic pattern classifier in PromptAnalyzer",
      },
      hallucination: {
        cause: "Low-confidence factual extrapolation without grounded retrieval verification",
        action: "Enforce RAG citation check and lower hallucination threshold",
      },
      bad_tool_call: {
        cause: "Tool schema parameter validation mismatch or missing required properties",
        action: "Update JSON Schema definitions in ToolRegistry and add retry validation",
      },
      format_error: {
        cause: "Model generated markdown commentary around strict JSON payloads",
        action: "Enforce strict JSON mode regex extractor in ResponseValidator",
      },
      language_error: {
        cause: "Indic dialect phonetic drift in mixed-language (Tenglish/Hinglish) prompts",
        action: "Add Indic script grounding tokens and culturally tuned system instructions",
      },
    };

    for (const [cat, items] of categoryMap.entries()) {
      const info = rootCauseMap[cat];
      clusters.push({
        clusterId: `cluster_${cat}_${Date.now()}`,
        category: cat,
        occurrenceCount: items.length,
        exemplarPrompts: items.slice(0, 3).map((i) => i.scrubbedPrompt),
        inferredRootCause: info.cause,
        recommendedAction: info.action,
        impactScore: Math.min(100, items.length * 20),
      });
    }

    return clusters.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
  }
}

export const failureClusterer = FailureClusterer.getInstance();
