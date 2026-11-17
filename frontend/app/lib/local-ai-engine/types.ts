/**
 * TATTVA AI - Local AI Engine Type Definitions
 * Strict type safety for hardware assessment, GGUF model registry,
 * offline inference, and performance telemetry.
 */

export interface HardwareSpecs {
  gpuName: string;
  vramBytes: number;
  vramGB: number;
  totalRamBytes: number;
  totalRamGB: number;
  freeRamBytes: number;
  freeRamGB: number;
  cpuModel: string;
  cpuThreads: number;
  diskFreeBytes: number;
  diskFreeGB: number;
  hasDedicatedNvidiaGpu: boolean;
  computeCapability?: string;
  recommendedModelTier: "1.5B" | "3B" | "7B" | "CPU_ONLY";
  maxGpuLayersRecommended: number;
}

export type ModelQuantization = "Q4_K_M" | "Q5_K_M" | "Q8_0" | "F16";
export type ModelFormat = "GGUF";

export interface ModelSpec {
  id: string;
  name: string;
  family: "qwen" | "deepseek" | "phi" | "llama" | "mistral";
  parameterCount: string;
  quantization: ModelQuantization;
  format: ModelFormat;
  fileSizeBytes: number;
  fileSizeGB: number;
  minVramGB: number;
  recommendedContext: number;
  defaultGpuLayers: number;
  downloadUrl?: string;
  fileName: string;
  localPath?: string;
  isDownloaded: boolean;
  isLoaded: boolean;
  loadedLayersOnGpu?: number;
  contextWindow: number;
  description: string;
  codingBenchmarkScore: number; // 0-100 on HumanEval / SWE-bench verified tasks
}

export interface InferenceOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
  stream?: boolean;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export interface InferenceMetrics {
  totalLatencyMs: number;
  timeToFirstTokenMs: number;
  promptEvaluationLatencyMs: number;
  tokensPerSecond: number;
  promptTokens: number;
  completionTokens: number;
  hardwareUsed: "NVIDIA_GPU" | "CPU_AVX2" | "HYBRID_GPU_CPU";
  vramUsedMB?: number;
  ramUsedMB?: number;
}

export interface InferenceResult {
  text: string;
  metrics: InferenceMetrics;
  modelId: string;
  finishReason: "stop" | "length" | "cancelled" | "error";
}

export interface ModelBenchmarkResult {
  modelId: string;
  testName: string;
  category: "function_generation" | "api_route" | "schema_design" | "debugging" | "test_synthesis";
  passed: boolean;
  tokensPerSecond: number;
  latencyMs: number;
  vramAllocatedMB: number;
  ramAllocatedMB: number;
  codeOutput: string;
  error?: string;
}

export interface LocalEngineStatus {
  isOperational: boolean;
  activeModelId: string | null;
  activeModelName: string | null;
  runtime: "llama.cpp" | "embedded_runtime" | "standby";
  hardware: HardwareSpecs;
  endpoint: string;
  loadedAt?: string;
  totalInferencesServed: number;
  averageTokensPerSecond: number;
}
