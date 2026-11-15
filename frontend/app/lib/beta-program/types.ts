/**
 * TATTVA AI - Phase 29 Controlled Beta Testing Program Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type BetaTesterStatus = "pending_approval" | "active" | "revoked" | "expired";
export type BetaTesterTier = "standard_beta" | "vip_tester" | "internal_team";

export interface BetaTesterAccount {
  id: string;
  userId: string;
  email: string;
  inviteCode: string;
  tier: BetaTesterTier;
  status: BetaTesterStatus;
  dailyRequestLimit: number;
  requestsUsedToday: number;
  lastRequestDate: string;
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
  approvedBy?: string;
}

export type BetaFeedbackCategory =
  | "bug_report"
  | "incorrect_ai_response"
  | "performance_issue"
  | "ui_ux_suggestion"
  | "missing_feature"
  | "feature_request";

export type BetaBugStatus =
  | "New"
  | "Under Review"
  | "Confirmed"
  | "In Progress"
  | "Fixed"
  | "Testing"
  | "Closed";

export type BetaBugSeverity = "Critical" | "High" | "Medium" | "Low";
export type BetaClientPlatform = "web" | "mobile_browser" | "android" | "desktop";

export interface BetaFeedbackRecord {
  id: string;
  category: BetaFeedbackCategory;
  description: string;
  appVersion: string;
  platform: BetaClientPlatform;
  severity: BetaBugSeverity;
  status: BetaBugStatus;
  submittedAt: string;
  testerId: string;
  adminNotes?: string;
  resolution?: string;
}

export interface BetaFeatureUsage {
  chatConversations: number;
  documentAnalysis: number;
  ragRetrievals: number;
  imageGenerations: number;
  audioVideoOperations: number;
  agentToolExecutions: number;
  evaluationLabRuns: number;
}

export interface BetaAnalyticsReport {
  timestamp: string;
  totalRegisteredTesters: number;
  activeTesters: number;
  revokedTesters: number;
  featureUsage: BetaFeatureUsage;
  applicationErrors: number;
  failedApiRequests: number;
  avgResponseLatencyMs: number;
  fileProcessingFailures: number;
  aiToolFailures: number;
  feedbackSubmissions: number;
  bugsByStatus: Record<BetaBugStatus, number>;
  bugsBySeverity: Record<BetaBugSeverity, number>;
}
