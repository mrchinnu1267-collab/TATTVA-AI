/**
 * TATTVA AI - Production Optimization & Reliability Engineering Types (Phase K)
 * Core interfaces for Circuit Breakers, Background Job Queues, Cost Tracking,
 * Spending Limits, Input Sanitization, and Latency Percentiles.
 */

import { ImageProviderId, ImageQuality, AspectRatio } from "../types";

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ProviderHealthRecord {
  providerId: ImageProviderId;
  circuitState: CircuitBreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastFailureReason?: string;
  cooldownUntil: number;
  isQuotaExhausted: boolean;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  recentLatenciesMs: number[];
}

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type JobStage =
  | "queued"
  | "prompt_understanding"
  | "routing_and_selection"
  | "generating"
  | "independent_evaluation"
  | "targeted_correction"
  | "storage_upload"
  | "completed";

export interface ImageJob {
  id: string;
  userId?: string;
  workspaceId?: string;
  prompt: string;
  promptHash: string;
  referenceImage?: string;
  quality: ImageQuality;
  aspectRatio: AspectRatio;
  status: JobStatus;
  progressPercent: number; // 0 to 100
  currentStage: JobStage;
  resultImage?: string;
  error?: string;
  attempts: number;
  maxRetries: number;
  providerUsed?: ImageProviderId;
  modelUsed?: string;
  totalCostUsd: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  latencyMs?: number;
}

export interface CostRecord {
  requestId: string;
  workspaceId: string;
  providerId: ImageProviderId;
  modelId: string;
  generationCostUsd: number;
  evaluationCostUsd: number;
  correctionCostUsd: number;
  storageCostUsd: number;
  totalCostUsd: number;
  success: boolean;
  timestamp: string;
}

export interface SpendingLimitConfig {
  workspaceId: string;
  dailySpendingLimitUsd: number;
  monthlySpendingLimitUsd: number;
  currentDailySpendUsd: number;
  currentMonthlySpendUsd: number;
  hardStopEnabled: boolean;
  warnAtPercent: number; // e.g. 80%
}

export interface LatencyMetrics {
  count: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
}

export interface ReliabilityDashboardMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  overallSuccessRate: number; // 0 - 100
  averageLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  averageCostPerSuccessUsd: number;
  totalSpendUsd: number;
  activeQueueLength: number;
  providerHealth: Record<ImageProviderId, ProviderHealthRecord>;
  recentJobs: ImageJob[];
  recentCosts: CostRecord[];
  spendingLimit: SpendingLimitConfig;
}

