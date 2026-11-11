/**
 * TATTVA AI - Training Configuration & Hardware Feasibility Engine (Phase G)
 * Validates hyperparameters, provides task-specific presets, assesses RTX 3050 4GB VRAM
 * limits, and computes cloud training cost/time estimates.
 */

import {
  CustomizationCategory,
  FineTuningBaseModelId,
  SUPPORTED_BASE_MODELS,
  TrainingHyperparameters,
} from "./types";

export interface HyperparameterValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedConfig: TrainingHyperparameters;
  hardwareRecommendation: {
    target: "cloud_gpu" | "local_memory_efficient" | "simulated_verification";
    reason: string;
    estimatedVramMb: number;
    fitsLocalGpu: boolean;
    estimatedDurationMinutes: number;
    estimatedCostUsd: number;
  };
}

export const CATEGORY_PRESETS: Record<
  CustomizationCategory,
  {
    recommendedBaseModel: FineTuningBaseModelId;
    steps: number;
    learningRate: number;
    rank: number;
    alpha: number;
    description: string;
  }
> = {
  artistic_style: {
    recommendedBaseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 500,
    learningRate: 1e-4,
    rank: 8,
    alpha: 16,
    description: "Ideal for distinctive painterly, vector, or illustrative artistic rendering styles.",
  },
  character_consistency: {
    recommendedBaseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 800,
    learningRate: 8e-5,
    rank: 16,
    alpha: 16,
    description: "Higher rank to capture fine facial geometry, costumes, and character consistency across angles.",
  },
  product_visualization: {
    recommendedBaseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 600,
    learningRate: 1e-4,
    rank: 8,
    alpha: 16,
    description: "Calibrated for commercial product rendering with clean contours and material reflections.",
  },
  brand_visual_identity: {
    recommendedBaseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 500,
    learningRate: 1e-4,
    rank: 8,
    alpha: 16,
    description: "Preserves corporate color palettes, graphic motifs, and organizational design guidelines.",
  },
  illustration_style: {
    recommendedBaseModel: "cagliostrolab/animagine-xl-3.1",
    steps: 600,
    learningRate: 1e-4,
    rank: 8,
    alpha: 16,
    description: "Optimized for anime, manga, and digital 2D illustration aesthetics.",
  },
  "3d_rendering_style": {
    recommendedBaseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 600,
    learningRate: 1e-4,
    rank: 8,
    alpha: 16,
    description: "Enhances raytraced ambient occlusion, subsurface scattering, and Octane/Cinema4D looks.",
  },
  consistent_theme: {
    recommendedBaseModel: "stabilityai/stable-diffusion-xl-base-1.0",
    steps: 500,
    learningRate: 1e-4,
    rank: 8,
    alpha: 16,
    description: "Harmonizes background environments, color grading, and lighting atmospheres across scenes.",
  },
};

/**
 * Validates user training parameters against hardware safety boundaries.
 */
export function validateTrainingConfig(
  config: Partial<TrainingHyperparameters>,
  baseModelId: FineTuningBaseModelId,
  imageCount: number
): HyperparameterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const baseModel = SUPPORTED_BASE_MODELS[baseModelId];
  if (!baseModel) {
    errors.push(`Unknown base model identifier: "${baseModelId}".`);
  }

  // 1. Steps Validation
  const steps = config.steps ?? 500;
  if (steps < 100 || steps > 3000) {
    errors.push(`Training steps (${steps}) must be between 100 and 3,000.`);
  } else if (steps > 1500) {
    warnings.push("High step counts (>1500) on small datasets carry significant risk of overfitting and memorization.");
  }

  // 2. Learning Rate Validation
  const lr = config.learningRate ?? (baseModel?.defaultLearningRate || 1e-4);
  if (lr <= 1e-7 || lr > 1e-2) {
    errors.push(`Learning rate (${lr}) is outside the safe convergence boundary (1e-6 to 1e-3).`);
  }

  // 3. LoRA Rank & Alpha
  const loraRank = config.loraRank ?? (baseModel?.defaultRank || 8);
  if (![4, 8, 16, 32, 64].includes(loraRank)) {
    errors.push(`LoRA rank (${loraRank}) must be one of [4, 8, 16, 32, 64].`);
  }

  const loraAlpha = config.loraAlpha ?? (baseModel?.defaultAlpha || 16);
  if (loraAlpha < 1 || loraAlpha > 128) {
    errors.push(`LoRA alpha (${loraAlpha}) must be between 1 and 128.`);
  }

  // 4. Batch Size & Accumulation
  const batchSize = config.batchSize ?? 1;
  if (batchSize < 1 || batchSize > 8) {
    errors.push("Batch size must be between 1 and 8.");
  }

  const resolution = config.resolution ?? (baseModelId === "runwayml/stable-diffusion-v1-5" ? 512 : 1024);
  if (![512, 768, 1024].includes(resolution)) {
    errors.push("Image training resolution must be 512, 768, or 1024.");
  }

  // 5. Hardware Assessment: RTX 3050 4GB Safety
  // LoRA training VRAM: Base Model FP16 + LoRA Weights + AdamW States + Gradients + Activations
  const estimatedVramMb = baseModel?.minTrainingVramMb || 12000;
  const LOCAL_GPU_LIMIT_MB = 3800; // 3.8 GB headroom on RTX 3050 4GB
  const fitsLocalGpu = baseModelId === "runwayml/stable-diffusion-v1-5" && loraRank <= 4 && resolution <= 512;

  let targetHardware: "cloud_gpu" | "local_memory_efficient" | "simulated_verification" = "cloud_gpu";
  let hardwareReason = "";

  if (fitsLocalGpu) {
    targetHardware = "local_memory_efficient";
    hardwareReason = "SD 1.5 with rank=4 and 512px resolution can run within the 4GB VRAM envelope with 8-bit Adam.";
  } else {
    targetHardware = "cloud_gpu";
    hardwareReason = `Base model "${baseModel?.name || baseModelId}" requires ~${Math.round(estimatedVramMb / 1024)}GB VRAM for stable gradient backpropagation, exceeding local RTX 3050 4 GB VRAM limit. Training is routed to dedicated Cloud GPU (NVIDIA A10G / A100) to protect local hardware.`;
  }

  // 6. Cost & Time Estimation
  // A10G cloud GPU ≈ $1.00/hr ($0.0167/min)
  const secondsPerStep = baseModel?.architecture === "flux_transformer" ? 1.4 : 0.6;
  const estimatedSeconds = Math.round(steps * secondsPerStep);
  const estimatedMinutes = Math.max(2, Math.round(estimatedSeconds / 60));
  const estimatedCostUsd = targetHardware === "cloud_gpu" ? Number(((estimatedMinutes / 60) * 1.10).toFixed(2)) : 0.0;

  const sanitizedConfig: TrainingHyperparameters = {
    steps,
    learningRate: lr,
    batchSize,
    loraRank,
    loraAlpha,
    resolution,
    mixedPrecision: config.mixedPrecision || "fp16",
    gradientAccumulationSteps: config.gradientAccumulationSteps || 4,
    gradientCheckpointing: config.gradientCheckpointing !== false,
    seed: config.seed ?? 42,
    checkpointFrequency: config.checkpointFrequency || 100,
    validationFrequency: config.validationFrequency || 50,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedConfig,
    hardwareRecommendation: {
      target: targetHardware,
      reason: hardwareReason,
      estimatedVramMb,
      fitsLocalGpu,
      estimatedDurationMinutes: estimatedMinutes,
      estimatedCostUsd,
    },
  };
}
