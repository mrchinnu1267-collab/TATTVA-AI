/**
 * TATTVA AI - Custom Foundation Model Fine-Tuning Engine
 * Architected for Supervised Fine-Tuning (SFT), LoRA, and QLoRA on open-weight models.
 * Calculates exact hardware feasibility against available GPU VRAM (RTX 3050 4GB),
 * generates production-ready training scripts (PyTorch / TRL SFTTrainer), and enforces
 * strict human-in-the-loop approval before executing compute jobs.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  FineTuningJobSpec,
  HardwareFeasibility,
  TrainingHyperparameters,
  TrainingMethod,
} from "./types";
import { universalTrainingPipeline } from "../pipeline/universal-training-pipeline";
import { FineTuningFormat } from "../pipeline/types";

export class TattvaFineTuningEngine {
  private static instance: TattvaFineTuningEngine;
  private readonly HOST_GPU_VRAM_MB = 4096; // 4 GB GDDR6 on RTX 3050 Laptop
  private jobsVaultPath: string;

  private constructor() {
    this.jobsVaultPath = path.resolve(process.cwd(), ".tattva_secure_vault", "finetuning_jobs.json");
    const dir = path.dirname(this.jobsVaultPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  public static getInstance(): TattvaFineTuningEngine {
    if (!TattvaFineTuningEngine.instance) {
      TattvaFineTuningEngine.instance = new TattvaFineTuningEngine();
    }
    return TattvaFineTuningEngine.instance;
  }

  /**
   * Assesses VRAM requirements for target model architecture
   */
  public evaluateHardwareFeasibility(
    baseModelId: string,
    method: TrainingMethod,
    seqLength = 1536
  ): HardwareFeasibility {
    const idLower = baseModelId.toLowerCase();
    let paramCountBillion = 1.5;
    if (idLower.includes("0.5b")) paramCountBillion = 0.5;
    else if (idLower.includes("1.5b") || idLower.includes("1b")) paramCountBillion = 1.5;
    else if (idLower.includes("3b")) paramCountBillion = 3.0;
    else if (idLower.includes("7b") || idLower.includes("8b")) paramCountBillion = 7.5;

    let bytesPerParam = 2.0; // FP16
    if (method === "qlora") bytesPerParam = 0.5; // 4-bit NF4
    else if (method === "lora") bytesPerParam = 2.0; // 16-bit LoRA
    else if (method === "full_sft") bytesPerParam = 4.0; // FP32 optimizer states

    const baseWeightsMb = paramCountBillion * 1000 * bytesPerParam;
    const loraWeightsMb = method !== "full_sft" ? 35 : 0;
    const optimizerMb = method === "qlora" ? 25 : paramCountBillion * 1000 * 4;
    const activationMb = (seqLength / 2048) * 1600; // Gradient checkpointed
    const cudaOverheadMb = 400;

    const estimatedPeakVramMb = Math.round(
      baseWeightsMb + loraWeightsMb + optimizerMb + activationMb + cudaOverheadMb
    );

    const headroomMb = this.HOST_GPU_VRAM_MB - estimatedPeakVramMb;
    const isFeasibleLocally = estimatedPeakVramMb <= this.HOST_GPU_VRAM_MB;

    let targetDevice: "cuda" | "cpu" | "cloud_required" = "cuda";
    let warningMessage: string | undefined;

    if (!isFeasibleLocally) {
      targetDevice = "cloud_required";
      warningMessage = `Model requires ~${(estimatedPeakVramMb / 1024).toFixed(1)} GB VRAM, which exceeds local GPU capacity (4.0 GB). Train on Cloud A100/H100 or reduce model size.`;
    } else if (headroomMb < 300) {
      warningMessage = `Tight VRAM budget: Only ${headroomMb} MB headroom. Ensure batch size remains 1 with gradient accumulation.`;
    }

    return {
      totalGpuVramMb: this.HOST_GPU_VRAM_MB,
      estimatedPeakVramMb,
      isFeasibleLocally,
      headroomMb,
      targetDevice,
      warningMessage,
    };
  }

  /**
   * Generates default optimal hyperparameters for target architecture
   */
  public getDefaultHyperparameters(
    method: TrainingMethod = "qlora"
  ): TrainingHyperparameters {
    return {
      method,
      learningRate: method === "qlora" ? 2e-4 : 5e-5,
      batchSize: 1,
      gradientAccumulationSteps: 8, // Effective batch size = 8
      numEpochs: 3,
      warmupRatio: 0.05,
      weightDecay: 0.01,
      maxSeqLength: 1536,
      optim: "paged_adamw_8bit",
      fp16: false,
      bf16: true,
      gradientCheckpointing: true,
      loggingSteps: 5,
      saveSteps: 50,
      lora: {
        r: 16,
        loraAlpha: 32,
        loraDropout: 0.05,
        targetModules: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias: "none",
        taskType: "CAUSAL_LM",
      },
    };
  }

  /**
   * Configures a new fine-tuning job with datasets, scripts, and safety gates
   */
  public async configureFineTuningJob(params: {
    jobName: string;
    baseModelId: string;
    datasetId: string;
    datasetFormat?: FineTuningFormat;
    method?: TrainingMethod;
    customHyperparameters?: Partial<TrainingHyperparameters>;
  }): Promise<FineTuningJobSpec> {
    const {
      jobName,
      baseModelId,
      datasetId,
      datasetFormat = "chatml",
      method = "qlora",
    } = params;

    const jobId = `tattva_ft_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const targetModelVersion = `1.0.0-${jobName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    // 1. Ingest & export SFT dataset through universal pipeline
    const sftExport = await universalTrainingPipeline.prepareAndExportSftDataset({
      datasetId,
      format: datasetFormat,
      validationRatio: 0.1,
    });

    // 2. Hardware evaluation
    const hardwareFeasibility = this.evaluateHardwareFeasibility(baseModelId, method);

    // 3. Hyperparameters
    const defaultParams = this.getDefaultHyperparameters(method);
    const hyperparameters: TrainingHyperparameters = {
      ...defaultParams,
      ...(params.customHyperparameters || {}),
      lora: {
        ...defaultParams.lora,
        ...(params.customHyperparameters?.lora || {}),
      },
    };

    // 4. Job directories
    const vaultDir = path.resolve(process.cwd(), ".tattva_secure_vault", "finetuning_jobs", jobId);
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

    const outputAdapterDir = path.join(vaultDir, "adapters");
    if (!fs.existsSync(outputAdapterDir)) fs.mkdirSync(outputAdapterDir, { recursive: true });

    // 5. Generate Standalone Python SFT Training Script
    const trainingScriptPath = path.join(vaultDir, "train_sft.py");
    const scriptContent = this.generatePythonTrainingScript({
      jobId,
      baseModelId,
      sftTrainPath: sftExport.trainFilePath,
      sftValPath: sftExport.valFilePath,
      outputAdapterDir,
      hyperparameters,
      datasetFormat,
    });
    fs.writeFileSync(trainingScriptPath, scriptContent, "utf8");

    // 6. Job Specification
    const configFilePath = path.join(vaultDir, "job_spec.json");
    const jobSpec: FineTuningJobSpec = {
      jobId,
      jobName,
      baseModelId,
      targetModelVersion,
      datasetId,
      datasetFormat: datasetFormat as any,
      hyperparameters,
      hardwareFeasibility,
      trainingScriptPath,
      configFilePath,
      outputAdapterDir,
      requiresHumanApproval: true, // Strict human-in-the-loop gate
      approvalGranted: false, // Default false: requires explicit approval
      status: "configured",
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(configFilePath, JSON.stringify(jobSpec, null, 2), "utf8");
    this.saveJobToVault(jobSpec);

    return jobSpec;
  }

  /**
   * Generates production-ready PyTorch / Hugging Face TRL SFT script
   */
  private generatePythonTrainingScript(opts: {
    jobId: string;
    baseModelId: string;
    sftTrainPath: string;
    sftValPath?: string;
    outputAdapterDir: string;
    hyperparameters: TrainingHyperparameters;
    datasetFormat: string;
  }): string {
    const { baseModelId, sftTrainPath, sftValPath, outputAdapterDir, hyperparameters } = opts;
    const lora = hyperparameters.lora;

    return `"""
TATTVA AI - Supervised Fine-Tuning (SFT) Execution Script
Job ID: ${opts.jobId}
Base Model: ${baseModelId}
Method: ${hyperparameters.method.toUpperCase()}
Generated on: ${new Date().toISOString()}
"""

import os
import sys
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

def main():
    print("====================================================================")
    print("  TATTVA AI - CUSTOM MODEL SUPERVISED FINE-TUNING EXECUTION")
    print("====================================================================")
    print(f"Base Model:       ${baseModelId}")
    print(f"Training Method:  ${hyperparameters.method.toUpperCase()}")
    print(f"Output Directory: ${outputAdapterDir}")
    print("--------------------------------------------------------------------")

    # 1. Quantization Configuration (4-bit NormalFloat NF4 for QLoRA)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # 2. Tokenizer & Model Loading
    print("Loading base tokenizer and model weights...")
    tokenizer = AutoTokenizer.from_pretrained("${baseModelId}", trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        "${baseModelId}",
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )

    model = prepare_model_for_kbit_training(model)

    # 3. LoRA Configuration
    peft_config = LoraConfig(
        r=${lora.r},
        lora_alpha=${lora.loraAlpha},
        lora_dropout=${lora.loraDropout},
        target_modules=${JSON.stringify(lora.targetModules)},
        bias="${lora.bias}",
        task_type="${lora.taskType}",
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    # 4. Ingest Datasets
    print("Loading prepared SFT datasets...")
    train_dataset = load_dataset("json", data_files="${sftTrainPath.replace(/\\/g, "/")}", split="train")
    ${sftValPath ? `val_dataset = load_dataset("json", data_files="${sftValPath.replace(/\\/g, "/")}", split="train")` : `val_dataset = None`}

    # 5. Training Arguments
    training_args = TrainingArguments(
        output_dir="${outputAdapterDir.replace(/\\/g, "/")}",
        per_device_train_batch_size=${hyperparameters.batchSize},
        gradient_accumulation_steps=${hyperparameters.gradientAccumulationSteps},
        learning_rate=${hyperparameters.learningRate},
        num_train_epochs=${hyperparameters.numEpochs},
        warmup_ratio=${hyperparameters.warmupRatio},
        weight_decay=${hyperparameters.weightDecay},
        optim="${hyperparameters.optim}",
        bf16=${hyperparameters.bf16},
        fp16=${hyperparameters.fp16},
        gradient_checkpointing=${hyperparameters.gradientCheckpointing},
        logging_steps=${hyperparameters.loggingSteps},
        save_strategy="steps",
        save_steps=${hyperparameters.saveSteps},
        evaluation_strategy="steps" if val_dataset else "no",
        eval_steps=${hyperparameters.saveSteps} if val_dataset else None,
        report_to="none",
    )

    # 6. SFT Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        peft_config=peft_config,
        max_seq_length=${hyperparameters.maxSeqLength},
        tokenizer=tokenizer,
        args=training_args,
    )

    print("Beginning fine-tuning execution...")
    trainer.train()

    print("Saving fine-tuned LoRA adapters to disk...")
    trainer.model.save_pretrained("${outputAdapterDir.replace(/\\/g, "/")}")
    tokenizer.save_pretrained("${outputAdapterDir.replace(/\\/g, "/")}")
    print("✅ Training complete. Adapters successfully persisted.")

if __name__ == "__main__":
    main()
`;
  }

  /**
   * Persists job to secure vault history
   */
  private saveJobToVault(job: FineTuningJobSpec) {
    let jobs: FineTuningJobSpec[] = [];
    if (fs.existsSync(this.jobsVaultPath)) {
      try {
        jobs = JSON.parse(fs.readFileSync(this.jobsVaultPath, "utf8"));
      } catch {}
    }
    const idx = jobs.findIndex((j) => j.jobId === job.jobId);
    if (idx >= 0) jobs[idx] = job;
    else jobs.push(job);
    fs.writeFileSync(this.jobsVaultPath, JSON.stringify(jobs, null, 2), "utf8");
  }

  /**
   * Human Approval Gate: Authorizes execution of an expensive compute job
   */
  public grantHumanApproval(jobId: string, authorizedBy = "human_operator"): FineTuningJobSpec {
    let jobs: FineTuningJobSpec[] = [];
    if (fs.existsSync(this.jobsVaultPath)) {
      jobs = JSON.parse(fs.readFileSync(this.jobsVaultPath, "utf8"));
    }
    const job = jobs.find((j) => j.jobId === jobId);
    if (!job) throw new Error(`Job '${jobId}' not found`);

    job.approvalGranted = true;
    job.status = "approved";
    this.saveJobToVault(job);
    return job;
  }

  /**
   * Lists all configured fine-tuning jobs
   */
  public listJobs(): FineTuningJobSpec[] {
    if (!fs.existsSync(this.jobsVaultPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(this.jobsVaultPath, "utf8"));
    } catch {
      return [];
    }
  }
}

export const tattvaFineTuningEngine = TattvaFineTuningEngine.getInstance();
