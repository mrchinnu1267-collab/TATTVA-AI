/**
 * TATTVA AI - Conversational & Multilingual Evaluation System Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ModelProvider } from "../../ai-orchestrator/types";

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ConversationalTestCase {
  id: string;
  category: "context_retention" | "code_switching" | "tool_selection" | "topic_shift" | "translation" | "grammar";
  language: "en-US" | "hi-IN" | "te-IN" | "multilingual";
  prompt: string;
  conversationHistory?: ConversationTurn[];
  expectedBehavior: string;
  evaluationCriteria: string[];
  rubric: {
    factualAccuracyWeight: number; // 0-1
    contextRetentionWeight: number; // 0-1
    languagePurityWeight: number; // 0-1
  };
}

export interface ConversationEvalResult {
  testCaseId: string;
  category: string;
  language: string;
  prompt: string;
  aiResponse: string;
  score: number; // 0 - 100
  criteriaPassed: string[];
  criteriaFailed: string[];
  latencyMs: number;
  status: "pass" | "partial" | "fail" | "api_error";
  evaluatorNotes: string;
}

export interface ConversationalEvaluationSummary {
  id: string;
  runId: string;
  provider: ModelProvider;
  model: string;
  language: string;
  createdAt: string;
  totalCases: number;
  passedCases: number;
  partialCases: number;
  failedCases: number;
  overallScore: number; // 0 - 100
  categoryScores: Record<string, { total: number; averageScore: number }>;
  results: ConversationEvalResult[];
}
