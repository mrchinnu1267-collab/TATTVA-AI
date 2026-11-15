/**
 * TATTVA AI - Improvement Recommendation Generator (Phase 20)
 * Translates failure clusters into actionable code, prompt, or routing proposals
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { FailureCluster, ImprovementProposal } from "./types";

export class RecommendationGenerator {
  private static instance: RecommendationGenerator;

  public static getInstance(): RecommendationGenerator {
    if (!RecommendationGenerator.instance) {
      RecommendationGenerator.instance = new RecommendationGenerator();
    }
    return RecommendationGenerator.instance;
  }

  /**
   * Generates actionable improvement proposals from failure clusters
   */
  public generateProposals(clusters: FailureCluster[]): ImprovementProposal[] {
    const proposals: ImprovementProposal[] = [];

    for (const cluster of clusters) {
      const proposalId = `prop_${cluster.category}_${Date.now()}`;
      let targetComponent: ImprovementProposal["targetComponent"] = "prompt";
      let title = "";
      let description = cluster.inferredRootCause;
      let proposedChanges = "";

      switch (cluster.category) {
        case "missed_constraint":
          targetComponent = "prompt";
          title = "Harden Negative Constraint Guardrails in Prompt Enhancer";
          proposedChanges = `Update prompt-enhancer.ts:\n+ Append 'CRITICAL CONSTRAINT: You MUST NEVER violate negative rules.' to system guidance.`;
          break;
        case "wrong_intent":
          targetComponent = "routing";
          title = "Tune Multi-Intent Pattern Weights in Prompt Analyzer";
          proposedChanges = `Update prompt-analyzer.ts:\n+ Increase priority of troubleshooting and comparison intent regex matchers.`;
          break;
        case "hallucination":
          targetComponent = "prompt";
          title = "Lower Anti-Hallucination Confidence Threshold in RAG";
          proposedChanges = `Update rag-engine.ts:\n+ Require minimum 60% confidenceScore before returning ungrounded factual assertions.`;
          break;
        case "bad_tool_call":
          targetComponent = "tool_schema";
          title = "Harden Parameter Validation in Tool Registry";
          proposedChanges = `Update tool-registry.ts:\n+ Validate required parameters before tool invocation; auto-retry on schema violation.`;
          break;
        case "format_error":
          targetComponent = "prompt";
          title = "Enforce Raw JSON Format Extraction in Response Validator";
          proposedChanges = `Update response-validator.ts:\n+ Strip markdown fence preambles when json format is explicitly requested.`;
          break;
        case "language_error":
          targetComponent = "training_data";
          title = "Curate 500 New Indic (Telugu/Hindi) Instruction Examples";
          proposedChanges = `Update dataset-curator.ts:\n+ Generate high-scoring bilingual ChatML pairs for SFT pipeline.`;
          break;
      }

      proposals.push({
        proposalId,
        title,
        targetComponent,
        category: cluster.category,
        description,
        proposedChanges,
        status: "pending_review",
        createdAt: Date.now(),
      });
    }

    return proposals;
  }
}

export const recommendationGenerator = RecommendationGenerator.getInstance();
