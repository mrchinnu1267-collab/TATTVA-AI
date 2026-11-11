/**
 * TATTVA AI - Cost Intelligence & Spending Limits Engine (Phase K)
 * Tracks granular costs across providers, models, evaluation passes, and corrections.
 * Enforces workspace spending budgets, limits, and upfront estimation before paid jobs.
 */

import { CostRecord, SpendingLimitConfig } from "./types";
import { ImageProviderId, ImageQuality } from "../types";

const costHistory: CostRecord[] = [];

// Workspace budget configurations
const spendingLimits = new Map<string, SpendingLimitConfig>();

// Default workspace configuration
function getDefaultLimitConfig(workspaceId: string): SpendingLimitConfig {
  return {
    workspaceId,
    dailySpendingLimitUsd: 10.0, // $10/day default
    monthlySpendingLimitUsd: 100.0, // $100/month default
    currentDailySpendUsd: 0.0,
    currentMonthlySpendUsd: 0.0,
    hardStopEnabled: true,
    warnAtPercent: 80,
  };
}

/**
 * Estimates generation cost upfront based on provider, resolution, and quality tier.
 */
export function estimateGenerationCost(params: {
  provider: ImageProviderId;
  quality?: ImageQuality;
  isMultiStage?: boolean;
}): {
  estimatedCostUsd: number;
  breakdown: {
    generationCostUsd: number;
    evaluationCostUsd: number;
    potentialCorrectionCostUsd: number;
  };
} {
  let baseGenerationCost = 0.0;

  switch (params.provider) {
    case "openai":
      baseGenerationCost = 0.04;
      break;
    case "gemini":
      baseGenerationCost = 0.02;
      break;
    case "huggingface":
      baseGenerationCost = 0.003;
      break;
    case "pollinations":
    case "local":
    default:
      baseGenerationCost = 0.0;
      break;
  }

  // Quality multiplier
  if (params.quality === "max") {
    baseGenerationCost *= 1.5;
  }

  const evaluationCostUsd = params.isMultiStage ? 0.005 : 0.0;
  const potentialCorrectionCostUsd = params.isMultiStage ? 0.008 : 0.0;

  const total = Number(
    (baseGenerationCost + evaluationCostUsd + potentialCorrectionCostUsd).toFixed(4)
  );

  return {
    estimatedCostUsd: total,
    breakdown: {
      generationCostUsd: baseGenerationCost,
      evaluationCostUsd,
      potentialCorrectionCostUsd,
    },
  };
}

/**
 * Checks whether a workspace is authorized to incur the given estimated cost.
 */
export function verifySpendingAuthorization(
  workspaceId: string,
  estimatedCostUsd: number
): {
  authorized: boolean;
  reason?: string;
  isWarning?: boolean;
} {
  let config = spendingLimits.get(workspaceId);
  if (!config) {
    config = getDefaultLimitConfig(workspaceId);
    spendingLimits.set(workspaceId, config);
  }

  const projectedDaily = config.currentDailySpendUsd + estimatedCostUsd;
  const projectedMonthly = config.currentMonthlySpendUsd + estimatedCostUsd;

  // Check Daily Hard Stop
  if (config.hardStopEnabled && projectedDaily > config.dailySpendingLimitUsd) {
    return {
      authorized: false,
      reason: `Workspace spending limit exceeded: daily limit is $${config.dailySpendingLimitUsd.toFixed(2)}, projected spend is $${projectedDaily.toFixed(2)}.`,
    };
  }

  // Check Monthly Hard Stop
  if (config.hardStopEnabled && projectedMonthly > config.monthlySpendingLimitUsd) {
    return {
      authorized: false,
      reason: `Workspace spending limit exceeded: monthly limit is $${config.monthlySpendingLimitUsd.toFixed(2)}, projected spend is $${projectedMonthly.toFixed(2)}.`,
    };
  }

  // Check Warning Threshold
  const dailyWarn = config.dailySpendingLimitUsd * (config.warnAtPercent / 100);
  if (projectedDaily >= dailyWarn) {
    return {
      authorized: true,
      isWarning: true,
      reason: `Approaching daily spending limit: ${((projectedDaily / config.dailySpendingLimitUsd) * 100).toFixed(0)}% used.`,
    };
  }

  return { authorized: true };
}

/**
 * Records a detailed cost entry and updates workspace spend.
 */
export function recordCostEntry(entry: {
  requestId: string;
  workspaceId?: string;
  providerId: ImageProviderId;
  modelId: string;
  generationCostUsd: number;
  evaluationCostUsd?: number;
  correctionCostUsd?: number;
  storageCostUsd?: number;
  success: boolean;
}): CostRecord {
  const wsId = entry.workspaceId || "default";
  const evalCost = entry.evaluationCostUsd || 0.0;
  const corrCost = entry.correctionCostUsd || 0.0;
  const storCost = entry.storageCostUsd || 0.0001;
  const total = Number((entry.generationCostUsd + evalCost + corrCost + storCost).toFixed(4));

  const record: CostRecord = {
    requestId: entry.requestId,
    workspaceId: wsId,
    providerId: entry.providerId,
    modelId: entry.modelId,
    generationCostUsd: entry.generationCostUsd,
    evaluationCostUsd: evalCost,
    correctionCostUsd: corrCost,
    storageCostUsd: storCost,
    totalCostUsd: total,
    success: entry.success,
    timestamp: new Date().toISOString(),
  };

  costHistory.push(record);

  // Update workspace spending totals
  let config = spendingLimits.get(wsId);
  if (!config) {
    config = getDefaultLimitConfig(wsId);
    spendingLimits.set(wsId, config);
  }

  config.currentDailySpendUsd = Number((config.currentDailySpendUsd + total).toFixed(4));
  config.currentMonthlySpendUsd = Number((config.currentMonthlySpendUsd + total).toFixed(4));

  return record;
}

/**
 * Returns spending config and current totals for a workspace.
 */
export function getWorkspaceSpending(workspaceId: string = "default"): SpendingLimitConfig {
  let config = spendingLimits.get(workspaceId);
  if (!config) {
    config = getDefaultLimitConfig(workspaceId);
    spendingLimits.set(workspaceId, config);
  }
  return { ...config };
}

/**
 * Updates spending limit configuration for a workspace.
 */
export function updateWorkspaceSpendingLimit(
  workspaceId: string,
  updates: Partial<SpendingLimitConfig>
): SpendingLimitConfig {
  let config = spendingLimits.get(workspaceId);
  if (!config) {
    config = getDefaultLimitConfig(workspaceId);
  }

  const updated: SpendingLimitConfig = {
    ...config,
    ...updates,
    workspaceId,
  };

  spendingLimits.set(workspaceId, updated);
  return updated;
}

/**
 * Retrieves recent cost entries.
 */
export function getCostHistory(limit: number = 50): CostRecord[] {
  return costHistory.slice(-limit);
}

/**
 * Resets cost tracking state (for tests).
 */
export function resetCostTracker(): void {
  costHistory.length = 0;
  spendingLimits.clear();
}

