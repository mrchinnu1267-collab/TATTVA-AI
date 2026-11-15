/**
 * TATTVA AI - Custom Model Development & Fine-Tuning Types (Phase 19)
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ChatMLMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TrainingExample {
  id: string;
  messages: ChatMLMessage[];
  language: "en" | "te" | "hi" | "mixed";
  domain: string;
  qualityScore: number; // 0 - 100
  tokenCount: number;
}

export interface LoRAConfig {
  r: number; // rank e.g. 16, 32, 64
  loraAlpha: number; // e.g. 32, 64
  targetModules: string[]; // ["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
  loraDropout: number;
  bias: "none" | "all" | "lora_only";
  taskType: "CAUSAL_LM";
}

export interface TrainingSpecification {
  modelName: string;
  baseModel: string; // e.g., "meta-llama/Llama-3.2-3B", "Qwen/Qwen2.5-3B-Instruct"
  parameterScale: "1B" | "3B" | "7B";
  quantization: "4bit" | "8bit" | "none";
  lora: LoRAConfig;
  batchSize: number;
  gradientAccumulationSteps: number;
  learningRate: number;
  warmupRatio: number;
  epochs: number;
  maxSeqLength: number;
  estimatedVRAMGb: number;
}

export interface ModelCheckpoint {
  version: string;
  name: string;
  baseModel: string;
  checkpointUri: string;
  format: "gguf" | "safetensors" | "onnx" | "awq";
  quantizationTier: "Q4_K_M" | "Q8_0" | "FP16" | "AWQ_4BIT";
  parameters: string;
  indicLanguageSupport: string[];
  benchmarks: {
    mmmluHindiAccuracy: number;
    mmmluTeluguAccuracy: number;
    codingAccuracy: number;
    inferenceLatencyMs: number;
  };
  deploymentTargets: Array<"vllm" | "ollama" | "webgpu" | "onnx_mobile">;
  createdAt: number;
}
