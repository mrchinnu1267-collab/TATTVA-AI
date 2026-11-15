/**
 * TATTVA AI - User Feedback Intelligence Types (Phase 24)
 * Authorized, privacy-preserving feedback categorization and consent management
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type FeedbackCategoryDetailed =
  | "helpful"
  | "not_helpful"
  | "incorrect_answer"
  | "poor_explanation"
  | "missing_feature"
  | "failed_tool_execution"
  | "document_processing_problem"
  | "user_experience_issue";

export interface UserFeedbackRecord {
  id: string;
  userId: string;
  workspaceId?: string;
  category: FeedbackCategoryDetailed;
  rating: "positive" | "negative";
  userComments?: string;
  conversationContextSnippet?: string; // PII-scrubbed
  modelUsed?: string;
  toolInvolved?: string;
  userConsentedToStore: boolean;
  consentToAnonymizedImprovement: boolean;
  createdAt: number;
}

export interface FeedbackClusterSummary {
  category: FeedbackCategoryDetailed;
  count: number;
  percentage: number;
  sampleComments: string[];
  recommendedAction: string;
}

export interface FeedbackIntelligenceReport {
  totalFeedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  satisfactionRate: number; // percentage
  clusters: FeedbackClusterSummary[];
  topReportedProblems: string[];
  generatedAt: number;
}
