/**
 * TATTVA AI - GSM8K Mathematical Intelligence Types
 * Data schemas for mathematical evaluation, answer extraction, scoring, and fine-tuning.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type MathTopic =
  | "arithmetic"
  | "algebra"
  | "fractions"
  | "percentages"
  | "ratios"
  | "multi_step"
  | "geometry"
  | "general";

export interface Gsm8kQuestionItem {
  id: string;
  question: string;
  expectedAnswer: string;
  fullSolution: string;
  calculationSteps: string[];
  topic: MathTopic;
  difficulty?: "elementary" | "intermediate" | "advanced";
}

export interface Gsm8kEvalRequest {
  modelId: string;
  datasetId?: string; // defaults to "gsm8k-evaluation"
  questionCount?: number | "all"; // 5, 10, 25, 50, 100, or "all"
  seed?: number;
  temperature?: number;
  mockInference?: boolean; // For automated offline unit testing
}

export interface Gsm8kAnswerExtraction {
  rawResponse: string;
  extractedAnswer: string;
  normalizedNumericValue: number | null;
  explanation: string;
  isStructuredJson: boolean;
  extractionConfidence: "high" | "medium" | "low" | "none";
}

export interface Gsm8kQuestionResult {
  questionId: string;
  question: string;
  expectedAnswer: string;
  expectedNumericValue: number | null;
  aiRawResponse: string;
  aiExtractedAnswer: string;
  aiNumericValue: number | null;
  explanation: string;
  isCorrect: boolean;
  isInvalid: boolean;
  isFailed: boolean;
  errorMessage?: string;
  latencyMs: number;
  timestamp: string;
  topic: MathTopic;
  calculationSteps: string[];
}

export interface Gsm8kTopicMetrics {
  topic: MathTopic;
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  avgLatencyMs: number;
}

export interface Gsm8kEvalRunSummary {
  runId: string;
  modelId: string;
  datasetId: string;
  datasetVersion: string;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  invalidResponses: number;
  failedRequests: number;
  accuracy: number; // Correct / (Correct + Incorrect) * 100
  validCompletionRate: number; // (Total - Invalid - Failed) / Total * 100
  avgResponseTimeMs: number;
  totalDurationMs: number;
  startedAt: string;
  completedAt: string;
  status: "running" | "completed" | "cancelled" | "failed";
  topicBreakdown: Gsm8kTopicMetrics[];
  questionResults: Gsm8kQuestionResult[];
  recommendations: string[];
}

export interface Gsm8kModelComparisonRun {
  comparisonId: string;
  datasetId: string;
  questionCount: number;
  timestamp: string;
  models: Array<{
    modelId: string;
    modelName: string;
    provider: string;
    accuracy: number;
    correctAnswers: number;
    incorrectAnswers: number;
    invalidResponses: number;
    failedRequests: number;
    avgLatencyMs: number;
    topicAccuracies: Record<string, number>;
  }>;
  consensusScore: number;
  bestModelId: string;
  questions: Array<{
    id: string;
    question: string;
    expectedAnswer: string;
    modelAnswers: Record<string, { answer: string; isCorrect: boolean; latencyMs: number }>;
  }>;
}

export type FineTuningFormat = "alpaca" | "chatml" | "huggingface";

export interface Gsm8kSftSample {
  instruction?: string;
  input?: string;
  output?: string;
  messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  prompt?: string;
  completion?: string;
}

export interface Gsm8kFineTuningConfig {
  baseModel: string;
  datasetId: string; // Must be "gsm8k-train"
  format: FineTuningFormat;
  peftType: "lora" | "qlora" | "full";
  loraRank: number; // r
  loraAlpha: number;
  loraDropout: number;
  targetModules: string[];
  learningRate: number;
  batchSize: number;
  gradientAccumulationSteps: number;
  epochs: number;
  maxSeqLength: number;
  hardwareProfile: {
    targetGpu: string;
    minVramRequiredGB: number;
    quantizationBits: 4 | 8 | 16;
  };
}

export interface Gsm8kFineTuningReadinessReport {
  isReady: boolean;
  trainingSamplesCount: number;
  formatValidated: boolean;
  hardwareFeasible: boolean;
  warnings: string[];
  blockers: string[];
  estimatedTrainingTimeMinutes: number;
  generatedScriptSnippet: string;
}
