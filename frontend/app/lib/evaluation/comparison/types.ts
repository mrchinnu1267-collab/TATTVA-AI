/**
 * TATTVA AI - Advanced Model Comparison System Types
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ModelProvider } from "../../ai-orchestrator/types";
import { EvaluationRunSummary, QuestionEvaluationResult, SubjectAccuracyMetric } from "../mmmlu/types";

export interface ModelComparisonTarget {
  provider: ModelProvider;
  model: string;
}

export interface ModelComparisonConfig {
  comparisonName: string;
  datasetId?: string; // e.g. "mmmlu-hi-in-sample", "telugu-reasoning-indic"
  datasetName?: string;
  sampleSize: number;
  subject?: string;
  seed: number; // Identical seed strictly required for fair side-by-side benchmarking
  concurrency?: number;
  targets: ModelComparisonTarget[];
}

export interface ModelComparisonModelScore {
  provider: ModelProvider;
  model: string;
  runId: string;
  accuracy: number;
  rawAccuracy: number;
  averageResponseTimeMs: number;
  totalDurationMs: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  invalidResponses: number;
  failedRequests: number;
  subjectAccuracy: Record<string, SubjectAccuracyMetric>;
  consistencyScore: number; // 0-100% agreement with consensus
}

export interface QuestionComparisonDelta {
  questionId: number | string;
  question: string;
  subject: string;
  expectedAnswer?: string;
  modelAnswers: Record<string, {
    aiAnswer: string;
    isCorrect: boolean;
    latencyMs: number;
    explanation?: string;
    status: string;
  }>;
  consensusAnswer?: string;
  unanimousAgreement: boolean;
}

export interface ModelComparisonReport {
  id: string;
  title: string;
  createdAt: string;
  completedAt?: string;
  datasetName: string;
  datasetVersion: string;
  language: string;
  sampleSize: number;
  seed: number;
  fairBenchmarkConditionMet: boolean;
  models: ModelComparisonModelScore[];
  questionDeltas: QuestionComparisonDelta[];
  winnerModel?: {
    model: string;
    provider: ModelProvider;
    accuracy: number;
    avgLatencyMs: number;
    reason: string;
  };
}
