/**
 * TATTVA AI - MMMLU AI Evaluation System Types
 * OpenAI MMMLU (Hindi) Benchmark Evaluation System
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ModelProvider } from "../../ai-orchestrator/types";

export type OptionLetter = "A" | "B" | "C" | "D";

export interface MMMLURawRecord {
  unnamed?: string;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  answer: string;
  subject: string;
}

export interface MMMLUQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  /**
   * Stored ONLY server-side; NEVER sent to the AI model
   */
  answer: OptionLetter;
  subject: string;
}

export interface DatasetValidationReport {
  isValid: boolean;
  totalRows: number;
  validQuestions: number;
  invalidRows: number;
  missingQuestions: number;
  missingOptions: number;
  invalidAnswers: number;
  duplicateQuestions?: number;
  subjects: Array<{ name: string; count: number }>;
  errors: string[];
}

export interface AnswerDistribution {
  A: { count: number; percentage: number };
  B: { count: number; percentage: number };
  C: { count: number; percentage: number };
  D: { count: number; percentage: number };
}

export interface ValidationErrorRecord {
  rowIndex: number;
  questionPreview: string;
  errorType:
    | "missing_question"
    | "missing_option"
    | "invalid_answer"
    | "empty_subject"
    | "duplicate_question"
    | "malformed_row"
    | "unicode_encoding";
  message: string;
  field?: string;
  rawAnswer?: string;
}

export interface UnicodeIntegrityReport {
  passed: boolean;
  hasReplacementChar: boolean;
  hasNullBytes: boolean;
  nonAsciiDevanagariDetected: boolean;
  details: string[];
}

export interface DetailedDatasetValidationReport {
  datasetFile: string;
  datasetPath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  validatedAt: string;
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  totalSubjects: number;
  subjectsBreakdown: Record<string, number>;
  answerDistribution: AnswerDistribution;
  errors: ValidationErrorRecord[];
  warnings: string[];
  unicodeIntegrity: UnicodeIntegrityReport;
}

export interface EvaluationConfig {
  provider: ModelProvider;
  model: string;
  sampleSize: 10 | 25 | 50 | 100 | 500 | "all";
  subject?: string; // "all" or specific subject
  concurrency?: number; // 1 to 5, default 2
  seed?: number; // Optional random seed for reproducible sampling
  timeoutMs?: number; // Default 30000ms
  maxRetries?: number; // Default 2
}

export type EvaluationQuestionStatus =
  | "correct"
  | "incorrect"
  | "invalid_response"
  | "api_error"
  | "pending";

export interface QuestionEvaluationResult {
  questionId: number;
  question: string;
  subject: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  expectedAnswer: OptionLetter;
  aiAnswer: OptionLetter | "INVALID" | "ERROR";
  explanation?: string;
  rawResponse?: string;
  isCorrect: boolean;
  status: EvaluationQuestionStatus;
  latencyMs: number;
  error?: string;
}

export interface SubjectAccuracyMetric {
  subject: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  invalid: number;
  accuracy: number; // percentage (0-100)
}

export interface EvaluationRunSummary {
  id: string;
  datasetName: string;
  datasetVersion: string;
  language: string;
  provider: ModelProvider;
  model: string;
  createdAt: string; // ISO String
  completedAt?: string;
  durationMs: number;
  totalQuestions: number;
  attemptedQuestions: number;
  validAttempts: number; // Excludes API failures and invalid formats
  correctAnswers: number;
  incorrectAnswers: number;
  invalidResponses: number; // Model returned text without clean A/B/C/D
  failedRequests: number; // API timeouts, rate limits, 500s
  accuracy: number; // (correctAnswers / validAttempts) * 100
  rawAccuracy: number; // (correctAnswers / totalQuestions) * 100
  subjectAccuracy: Record<string, SubjectAccuracyMetric>;
  selectedQuestionIds: number[];
  seed?: number;
  results: QuestionEvaluationResult[];
}

export interface EvaluationLiveProgress {
  runId: string;
  status: "idle" | "running" | "completed" | "stopped" | "failed";
  currentIndex: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  invalidCount: number;
  failedCount: number;
  currentModel: string;
  currentSubject?: string;
  elapsedMs: number;
  latestResult?: QuestionEvaluationResult;
}
