/**
 * TATTVA AI - AI Performance Analysis & Improvement System Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type FailurePatternCategory =
  | "subject_knowledge_gap"
  | "instruction_misunderstanding"
  | "answer_formatting_malformed"
  | "reasoning_mistake"
  | "language_code_switching_degradation"
  | "context_loss"
  | "tool_selection_error";

export interface FailureCluster {
  category: FailurePatternCategory;
  count: number;
  percentageOfErrors: number;
  impactScore: "low" | "medium" | "high" | "critical";
  affectedSubjects: string[];
  exampleQuestionIds: Array<number | string>;
  description: string;
}

export type RecommendationStatus = "pending_review" | "approved" | "rejected" | "implemented";

export interface ImprovementRecommendation {
  id: string;
  category: FailurePatternCategory;
  title: string;
  description: string;
  actionableStep: string;
  suggestedPatchArea: "system_instruction" | "prompt_formatting" | "model_routing" | "parser_heuristics" | "rag_retrieval";
  supportingEvidence: {
    runId: string;
    model: string;
    errorCount: number;
    sampleErrors: Array<{ question: string; expected: string; actual: string }>;
  };
  humanApprovalStatus: RecommendationStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  implementedAt?: string;
  regressionBaselineScore?: number;
  postImplementationScore?: number;
}

export interface PerformanceAnalysisReport {
  id: string;
  runId: string;
  model: string;
  provider: string;
  createdAt: string;
  totalErrors: number;
  clusters: FailureCluster[];
  recommendations: ImprovementRecommendation[];
}
