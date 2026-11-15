/**
 * TATTVA AI - Continuous Learning & Improvement Engine Types (Phase 20)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type FeedbackSignalType = "thumbs_up" | "thumbs_down" | "rating" | "correction";

export type FailureCategoryType =
  | "wrong_intent"
  | "missed_constraint"
  | "hallucination"
  | "bad_tool_call"
  | "format_error"
  | "language_error";

export interface UserFeedbackEntry {
  feedbackId: string;
  signal: FeedbackSignalType;
  ratingScore?: number; // 1 - 5
  rawPrompt: string;
  modelResponse: string;
  userCorrection?: string;
  category?: FailureCategoryType;
  scrubbedPrompt: string; // PII-scrubbed
  scrubbedCorrection?: string;
  isAnonymized: boolean;
  createdAt: number;
}

export interface FailureCluster {
  clusterId: string;
  category: FailureCategoryType;
  occurrenceCount: number;
  exemplarPrompts: string[];
  inferredRootCause: string;
  recommendedAction: string;
  impactScore: number; // 1 - 100
}

export interface ImprovementProposal {
  proposalId: string;
  title: string;
  targetComponent: "prompt" | "routing" | "training_data" | "tool_schema";
  category: FailureCategoryType;
  description: string;
  proposedChanges: string;
  status: "pending_review" | "approved" | "rejected";
  regressionScore?: {
    baselineScore: number;
    proposedScore: number;
    passedRegressionCheck: boolean;
  };
  humanReviewer?: string;
  reviewComment?: string;
  createdAt: number;
  reviewedAt?: number;
}
