/**
 * TATTVA AI - Performance Baseline Evaluation Types
 * Phase 14 Architecture: 12-Category Comprehensive Foundation Model Benchmarking
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ModelProvider } from "../../ai-orchestrator/types";

export type BaselineCategory =
  | "general_knowledge"
  | "logical_reasoning"
  | "mathematical_reasoning"
  | "instruction_following"
  | "prompt_understanding"
  | "conversational_capability"
  | "coding"
  | "context_retention"
  | "multilingual_understanding"
  | "tool_usage"
  | "document_understanding"
  | "retrieval_accuracy";

export interface BaselineQuestion {
  id: string;
  category: BaselineCategory;
  prompt: string;
  context?: string;
  conversationHistory?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  expectedAnswer?: string;
  evaluationRubric: {
    requiredKeywords?: string[];
    negativeKeywords?: string[];
    exactMatch?: string;
    regexMatch?: string;
    minResponseLength?: number;
    maxResponseLength?: number;
    requiresToolCall?: boolean;
    expectedToolName?: string;
    requiresCitation?: boolean;
    hallucinationRiskCheck?: (response: string) => boolean;
  };
  weight: number;
}

export interface CategoryEvaluationScore {
  category: BaselineCategory;
  totalQuestions: number;
  passedQuestions: number;
  partialQuestions: number;
  failedQuestions: number;
  scorePercentage: number;
  averageLatencyMs: number;
  hallucinationRatePercentage: number;
  notes: string;
}

export interface BaselineModelResult {
  modelId: string;
  provider: ModelProvider;
  evaluatedAt: string;
  totalDurationMs: number;
  overallScore: number;
  overallAccuracy: number;
  averageLatencyMs: number;
  totalCostEstimateUsd: number;
  categoryScores: Record<BaselineCategory, CategoryEvaluationScore>;
  detailedResults: Array<{
    questionId: string;
    category: BaselineCategory;
    prompt: string;
    response: string;
    score: number; // 0-100
    isPass: boolean;
    isHallucination: boolean;
    latencyMs: number;
    feedback: string;
  }>;
}

export interface BaselineComparisonReport {
  id: string;
  title: string;
  createdAt: string;
  totalQuestionsEvaluated: number;
  models: BaselineModelResult[];
  categoryRankings: Record<BaselineCategory, Array<{ modelId: string; score: number }>>;
  summaryStrengthsAndWeaknesses: Record<
    string,
    { strengths: string[]; weaknesses: string[]; recommendation: string }
  >;
}
