/**
 * TATTVA AI - Fine-Tuning Specifications & VRAM Estimator (Phase 19)
 * Generates optimal LoRA / QLoRA configurations and hardware requirements
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { TrainingSpecification, LoRAConfig } from "./types";

export class TrainingConfigurator {
  private static instance: TrainingConfigurator;

  public static getInstance(): TrainingConfigurator {
    if (!TrainingConfigurator.instance) {
      TrainingConfigurator.instance = new TrainingConfigurator();
    }
    return TrainingConfigurator.instance;
  }

  /**
   * Generates production QLoRA training parameters for TATTVA SLM
   */
  public generateSpecification(
    scale: "1B" | "3B" | "7B",
    customBaseModel?: string
  ): TrainingSpecification {
    const defaultBases = {
      "1B": "meta-llama/Llama-3.2-1B-Instruct",
      "3B": "meta-llama/Llama-3.2-3B-Instruct",
      "7B": "Qwen/Qwen2.5-7B-Instruct",
    };

    const lora: LoRAConfig = {
      r: scale === "7B" ? 64 : 32,
      loraAlpha: scale === "7B" ? 64 : 32,
      targetModules: [
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
      ],
      loraDropout: 0.05,
      bias: "none",
      taskType: "CAUSAL_LM",
    };

    const vramEstimates = {
      "1B": 6.5,  // Fits easily on RTX 3060 / 4060 (8GB - 12GB)
      "3B": 10.5, // Fits on RTX 4070 / 3080 (12GB - 16GB)
      "7B": 18.0, // Fits on RTX 3090 / 4090 / A10G (24GB)
    };

    return {
      modelName: `TATTVA-SLM-${scale}-Indic`,
      baseModel: customBaseModel || defaultBases[scale],
      parameterScale: scale,
      quantization: "4bit",
      lora,
      batchSize: scale === "7B" ? 2 : 4,
      gradientAccumulationSteps: scale === "7B" ? 8 : 4,
      learningRate: 2e-4,
      warmupRatio: 0.03,
      epochs: 3,
      maxSeqLength: 4096,
      estimatedVRAMGb: vramEstimates[scale],
    };
  }

  /**
   * Generates executable Unsloth/HuggingFace Python script template
   */
  public generatePythonTrainingScript(spec: TrainingSpecification): string {
    return `# TATTVA AI - Fine-Tuning Script (${spec.modelName})
# Engineered by kotapati Gowtham Chowdary

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

max_seq_length = ${spec.maxSeqLength}
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="${spec.baseModel}",
    max_seq_length=max_seq_length,
    load_in_4bit=${spec.quantization === "4bit" ? "True" : "False"},
)

model = FastLanguageModel.get_peft_model(
    model,
    r=${spec.lora.r},
    target_modules=${JSON.stringify(spec.lora.targetModules)},
    lora_alpha=${spec.lora.loraAlpha},
    lora_dropout=${spec.lora.loraDropout},
    bias="${spec.lora.bias}",
)

training_args = TrainingArguments(
    per_device_train_batch_size=${spec.batchSize},
    gradient_accumulation_steps=${spec.gradientAccumulationSteps},
    warmup_ratio=${spec.warmupRatio},
    num_train_epochs=${spec.epochs},
    learning_rate=${spec.learningRate},
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=10,
    output_dir="./tattva_checkpoints",
)
`;
  }
}

export const trainingConfigurator = TrainingConfigurator.getInstance();
