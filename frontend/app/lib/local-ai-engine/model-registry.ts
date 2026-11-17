/**
 * TATTVA AI - Local Model Registry & Storage Manager
 * Discovers, validates, and manages GGUF open-weight models.
 * Strictly verifies storage space before downloading and tracks loaded memory state.
 */

import fs from "fs";
import path from "path";
import { detectSystemHardware } from "./hardware-detector";
import type { ModelSpec } from "./types";

export const LOCAL_MODELS_DIR = path.resolve(process.cwd(), ".tattva_vault", "models");

// Verified Curated Open-Weight Coding Models Catalog (GGUF Quantized)
export const CURATED_LOCAL_MODELS: ModelSpec[] = [
  {
    id: "qwen2.5-coder-1.5b-q4",
    name: "Qwen 2.5 Coder 1.5B Instruct (Q4_K_M)",
    family: "qwen",
    parameterCount: "1.5B",
    quantization: "Q4_K_M",
    format: "GGUF",
    fileSizeBytes: 986_000_000,
    fileSizeGB: 0.98,
    minVramGB: 1.4,
    recommendedContext: 8192,
    defaultGpuLayers: 28,
    fileName: "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
    downloadUrl: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
    isDownloaded: false,
    isLoaded: false,
    contextWindow: 8192,
    description: "Ultra-fast lightweight coding model. Fits 100% into RTX 3050 4GB VRAM with ~50+ tokens/sec.",
    codingBenchmarkScore: 82.4,
  },
  {
    id: "qwen2.5-coder-3b-q4",
    name: "Qwen 2.5 Coder 3B Instruct (Q4_K_M)",
    family: "qwen",
    parameterCount: "3B",
    quantization: "Q4_K_M",
    format: "GGUF",
    fileSizeBytes: 2_020_000_000,
    fileSizeGB: 2.02,
    minVramGB: 2.6,
    recommendedContext: 8192,
    defaultGpuLayers: 36,
    fileName: "qwen2.5-coder-3b-instruct-q4_k_m.gguf",
    downloadUrl: "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf",
    isDownloaded: false,
    isLoaded: false,
    contextWindow: 8192,
    description: "Optimal balance of reasoning and memory efficiency. Fully accelerated on RTX 3050 GPU.",
    codingBenchmarkScore: 88.2,
  },
  {
    id: "deepseek-coder-1.3b-q4",
    name: "DeepSeek Coder 1.3B Instruct (Q4_K_M)",
    family: "deepseek",
    parameterCount: "1.3B",
    quantization: "Q4_K_M",
    format: "GGUF",
    fileSizeBytes: 874_000_000,
    fileSizeGB: 0.87,
    minVramGB: 1.2,
    recommendedContext: 4096,
    defaultGpuLayers: 24,
    fileName: "deepseek-coder-1.3b-instruct.Q4_K_M.gguf",
    downloadUrl: "https://huggingface.co/TheBloke/deepseek-coder-1.3b-instruct-GGUF/resolve/main/deepseek-coder-1.3b-instruct.Q4_K_M.gguf",
    isDownloaded: false,
    isLoaded: false,
    contextWindow: 4096,
    description: "High speed specialized code completion and debugging model with minimal footprint.",
    codingBenchmarkScore: 79.5,
  },
  {
    id: "phi-3.5-mini-instruct-q4",
    name: "Phi-3.5 Mini 3.8B Instruct (Q4_K_M)",
    family: "phi",
    parameterCount: "3.8B",
    quantization: "Q4_K_M",
    format: "GGUF",
    fileSizeBytes: 2_250_000_000,
    fileSizeGB: 2.25,
    minVramGB: 2.9,
    recommendedContext: 4096,
    defaultGpuLayers: 32,
    fileName: "Phi-3.5-mini-instruct-Q4_K_M.gguf",
    downloadUrl: "https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf",
    isDownloaded: false,
    isLoaded: false,
    contextWindow: 4096,
    description: "Compact high-reasoning model optimized for complex multi-step code synthesis and architecture.",
    codingBenchmarkScore: 85.9,
  },
  {
    id: "qwen2.5-coder-7b-q4",
    name: "Qwen 2.5 Coder 7B Instruct (Q4_K_M)",
    family: "qwen",
    parameterCount: "7B",
    quantization: "Q4_K_M",
    format: "GGUF",
    fileSizeBytes: 4_480_000_000,
    fileSizeGB: 4.48,
    minVramGB: 3.5, // Hybrid offload
    recommendedContext: 4096,
    defaultGpuLayers: 20, // 20 layers in GPU, remainder in CPU
    fileName: "qwen2.5-coder-7b-instruct-q4_k_m.gguf",
    downloadUrl: "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf",
    isDownloaded: false,
    isLoaded: false,
    contextWindow: 4096,
    description: "State-of-the-art coding powerhouse. Uses hybrid GPU layer offload + CPU system RAM.",
    codingBenchmarkScore: 92.7,
  },
];

let activeLoadedModelId: string | null = null;

export function ensureModelsDir(): void {
  try {
    if (!fs.existsSync(LOCAL_MODELS_DIR)) {
      fs.mkdirSync(LOCAL_MODELS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[ModelRegistry] Failed to create models dir:", err);
  }
}

/**
 * Lists all registered models with live on-disk detection status.
 */
export function listLocalModels(): ModelSpec[] {
  ensureModelsDir();
  return CURATED_LOCAL_MODELS.map((model) => {
    const targetPath = path.join(LOCAL_MODELS_DIR, model.fileName);
    const exists = fs.existsSync(targetPath);
    let isLoaded = activeLoadedModelId === model.id;
    return {
      ...model,
      localPath: exists ? targetPath : undefined,
      isDownloaded: exists,
      isLoaded,
    };
  });
}

/**
 * Gets a model specification by its ID.
 */
export function getModelById(id: string): ModelSpec | null {
  const models = listLocalModels();
  return models.find((m) => m.id === id) || null;
}

/**
 * Validates available disk storage before downloading any model.
 * Enforces a safety margin: requires at least (modelSize + 5GB) free space.
 */
export function validateStorageForDownload(modelId: string): {
  canDownload: boolean;
  requiredGB: number;
  availableGB: number;
  error?: string;
} {
  const model = getModelById(modelId);
  if (!model) {
    return { canDownload: false, requiredGB: 0, availableGB: 0, error: `Model "${modelId}" not found in registry.` };
  }

  const hardware = detectSystemHardware();
  const safetyBufferGB = 5.0; // Reserve 5GB for OS and project builds
  const totalRequiredGB = model.fileSizeGB + safetyBufferGB;

  if (hardware.diskFreeGB < totalRequiredGB) {
    return {
      canDownload: false,
      requiredGB: totalRequiredGB,
      availableGB: hardware.diskFreeGB,
      error: `Insufficient disk space. Model requires ${model.fileSizeGB.toFixed(1)} GB (+ 5.0 GB safety margin = ${totalRequiredGB.toFixed(1)} GB), but only ${hardware.diskFreeGB.toFixed(1)} GB is free on drive C:.`,
    };
  }

  return {
    canDownload: true,
    requiredGB: totalRequiredGB,
    availableGB: hardware.diskFreeGB,
  };
}

/**
 * Sets the active loaded model in memory.
 */
export function setActiveLoadedModel(modelId: string | null): void {
  activeLoadedModelId = modelId;
}

/**
 * Gets the currently active model ID.
 */
export function getActiveLoadedModelId(): string | null {
  return activeLoadedModelId;
}
