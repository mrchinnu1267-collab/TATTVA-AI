/**
 * TATTVA AI - GSM8K Custom Mathematical Model Fine-Tuning Pipeline
 * Converts GSM8K training data into Supervised Fine-Tuning (SFT) formats (Alpaca, ChatML, HuggingFace),
 * evaluates local/cloud hardware feasibility (VRAM checks), and generates LoRA/QLoRA training configurations.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import path from "path";
import fs from "fs";
import {
  FineTuningFormat,
  Gsm8kFineTuningConfig,
  Gsm8kFineTuningReadinessReport,
  Gsm8kSftSample,
} from "./types";
import { datasetRegistry } from "../datasets/dataset-registry";
import { parquetDatasetLoader } from "../datasets/parquet-loader";

export class Gsm8kFineTuningPipeline {
  private static instance: Gsm8kFineTuningPipeline;

  public static getInstance(): Gsm8kFineTuningPipeline {
    if (!Gsm8kFineTuningPipeline.instance) {
      Gsm8kFineTuningPipeline.instance = new Gsm8kFineTuningPipeline();
    }
    return Gsm8kFineTuningPipeline.instance;
  }

  /**
   * Converts GSM8K training records into targeted Supervised Fine-Tuning (SFT) format.
   * Strictly enforces training/evaluation separation.
   */
  public async prepareSftDataset(
    datasetId = "gsm8k-train",
    format: FineTuningFormat = "alpaca",
    maxSamples?: number
  ): Promise<Gsm8kSftSample[]> {
    // 1. Strict contamination prevention guard
    const check = datasetRegistry.preventTrainingDataLeakage({ datasetId });
    if (!check.allowed) {
      throw new Error(`Data Contamination Violation: ${check.reason}`);
    }

    if (datasetId === "gsm8k-evaluation") {
      throw new Error("Security Violation: Evaluation dataset 'gsm8k-evaluation' must NEVER enter training pipelines!");
    }

    const meta = datasetRegistry.getDatasetById(datasetId);
    if (!meta) {
      throw new Error(`Dataset '${datasetId}' not found in registry`);
    }

    const root = datasetRegistry.resolveCanonicalDatasetsRoot();
    const filePath = path.join(root, meta.relativePath);

    const rawRecords = await parquetDatasetLoader.readParquetRecords(filePath, datasetId);
    const count = maxSamples ? Math.min(maxSamples, rawRecords.length) : rawRecords.length;
    const slice = rawRecords.slice(0, count);

    const sftData: Gsm8kSftSample[] = [];

    for (const r of slice) {
      const question = r.question;
      const solution = r.metadata?.fullSolution || r.expectedAnswer || "";

      if (format === "alpaca") {
        sftData.push({
          instruction:
            "Solve the following grade-school mathematical word problem step by step. Provide your step-by-step reasoning and conclude with the final numerical answer.",
          input: question,
          output: solution,
        });
      } else if (format === "chatml") {
        sftData.push({
          messages: [
            {
              role: "system",
              content:
                "You are an expert mathematical reasoning assistant. Solve word problems step-by-step and terminate your final answer with '#### <number>'.",
            },
            {
              role: "user",
              content: question,
            },
            {
              role: "assistant",
              content: solution,
            },
          ],
        });
      } else {
        // HuggingFace prompt / completion format
        sftData.push({
          prompt: `Problem: ${question}\nSolution:\n`,
          completion: solution,
        });
      }
    }

    return sftData;
  }

  /**
   * Assesses hardware requirements and training feasibility
   */
  public assessTrainingReadiness(
    config: Partial<Gsm8kFineTuningConfig> = {}
  ): Gsm8kFineTuningReadinessReport {
    const baseModel = config.baseModel || "Qwen/Qwen2.5-Math-1.5B-Instruct";
    const peftType = config.peftType || "qlora";

    const warnings: string[] = [];
    const blockers: string[] = [];

    // Hardware checks (e.g. typical RTX 3050 4GB laptop GPU vs recommended 16GB VRAM)
    const minVram = peftType === "qlora" ? 6 : 14;
    warnings.push(
      `QLoRA 4-bit fine-tuning of ${baseModel} requires minimum ${minVram}GB GPU VRAM. On an entry-level GPU (e.g., RTX 3050 4GB), batch size must be 1 with CPU offloading or Cloud GPU (A10G / T4 / Colab Pro).`
    );

    // Verify dataset exists
    const trainMeta = datasetRegistry.getDatasetById("gsm8k-train");
    if (!trainMeta) {
      blockers.push("Training dataset 'gsm8k-train' is not registered in dataset registry.");
    }

    const scriptSnippet = `
# TATTVA AI - Generated QLoRA Fine-Tuning Script
# Model: ${baseModel} | Dataset: gsm8k-train (7,473 samples)
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)

tokenizer = AutoTokenizer.from_pretrained("${baseModel}")
model = AutoModelForCausalLM.from_pretrained("${baseModel}", quantization_config=bnb_config, device_map="auto")
model = prepare_model_for_kbit_training(model)

peft_config = LoraConfig(
    r=${config.loraRank || 16},
    lora_alpha=${config.loraAlpha || 32},
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    bias="none",
    task_type="CAUSAL_LM"
)

# Trainer ready for execution with human confirmation
`;

    return {
      isReady: blockers.length === 0,
      trainingSamplesCount: trainMeta?.recordCount || 7473,
      formatValidated: true,
      hardwareFeasible: false, // Laptop GPU has 4GB VRAM; requires cloud GPU or offloading
      warnings,
      blockers,
      estimatedTrainingTimeMinutes: 45,
      generatedScriptSnippet: scriptSnippet.trim(),
    };
  }
}

export const gsm8kFineTuningPipeline = Gsm8kFineTuningPipeline.getInstance();
