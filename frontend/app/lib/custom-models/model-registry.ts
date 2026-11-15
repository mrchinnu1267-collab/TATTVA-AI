/**
 * TATTVA AI - Model Registry & Checkpoint Directory (Phase 19)
 * Tracks custom model weights, quantizations, benchmark ratings, and serving targets
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ModelCheckpoint } from "./types";

export class ModelRegistry {
  private static instance: ModelRegistry;
  private checkpoints: Map<string, ModelCheckpoint> = new Map();

  private constructor() {
    this.seedDefaultModels();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  private seedDefaultModels() {
    this.registerModel({
      version: "1.0.0",
      name: "TATTVA-SLM-1B-Indic-Instruct",
      baseModel: "meta-llama/Llama-3.2-1B-Instruct",
      checkpointUri: "hf://tattva-ai/tattva-slm-1b-indic-q4",
      format: "gguf",
      quantizationTier: "Q4_K_M",
      parameters: "1.23B",
      indicLanguageSupport: ["Telugu", "Hindi", "Tamil", "English"],
      benchmarks: {
        mmmluHindiAccuracy: 64.2,
        mmmluTeluguAccuracy: 61.8,
        codingAccuracy: 58.4,
        inferenceLatencyMs: 42,
      },
      deploymentTargets: ["ollama", "webgpu", "onnx_mobile"],
      createdAt: Date.now() - 86400000 * 5,
    });

    this.registerModel({
      version: "1.2.0",
      name: "TATTVA-SLM-3B-Indic-Enterprise",
      baseModel: "meta-llama/Llama-3.2-3B-Instruct",
      checkpointUri: "hf://tattva-ai/tattva-slm-3b-indic-q4",
      format: "gguf",
      quantizationTier: "Q4_K_M",
      parameters: "3.21B",
      indicLanguageSupport: ["Telugu", "Hindi", "Tamil", "Kannada", "English"],
      benchmarks: {
        mmmluHindiAccuracy: 76.5,
        mmmluTeluguAccuracy: 73.4,
        codingAccuracy: 71.0,
        inferenceLatencyMs: 85,
      },
      deploymentTargets: ["vllm", "ollama"],
      createdAt: Date.now() - 86400000 * 2,
    });
  }

  public registerModel(checkpoint: ModelCheckpoint) {
    this.checkpoints.set(checkpoint.name, checkpoint);
  }

  public getModel(name: string): ModelCheckpoint | undefined {
    return this.checkpoints.get(name);
  }

  public listModels(): ModelCheckpoint[] {
    return Array.from(this.checkpoints.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getServingConfig(name: string, target: "vllm" | "ollama" | "webgpu" | "onnx_mobile") {
    const model = this.getModel(name);
    if (!model) return null;

    if (target === "ollama") {
      return {
        modelfile: `FROM ${model.checkpointUri}\nPARAMETER temperature 0.3\nPARAMETER stop <|im_end|>\nSYSTEM "You are TATTVA SLM, an efficient Indic AI assistant."`,
        template: "ChatML",
      };
    }

    if (target === "vllm") {
      return {
        command: `python -m vllm.entrypoints.openai.api_server --model ${model.checkpointUri} --gpu-memory-utilization 0.90 --max-model-len 4096`,
        port: 8000,
      };
    }

    return {
      runtime: target,
      checkpointUri: model.checkpointUri,
      quantization: model.quantizationTier,
    };
  }
}

export const modelRegistry = ModelRegistry.getInstance();
