/**
 * TATTVA AI - Universal Centralized Training Data Pipeline
 * Ingests registered training datasets across Mathematics, Conversations, Instruction,
 * Multilingual, Coding, and Tool-Use. Enforces strict test contamination prevention,
 * performs deduplication, quality filtering, and exports to Alpaca, ChatML, and HuggingFace formats.
 *
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { datasetRegistry } from "../../evaluation/datasets/dataset-registry";
import { parquetDatasetLoader } from "../../evaluation/datasets/parquet-loader";
import {
  AlpacaSample,
  ChatMLSample,
  DataContaminationViolation,
  FineTuningFormat,
  HuggingFaceRow,
  SftExportResult,
  SftRecord,
  UniversalTrainingDatasetConfig,
} from "./types";

export class UniversalTrainingPipeline {
  private static instance: UniversalTrainingPipeline;

  public static getInstance(): UniversalTrainingPipeline {
    if (!UniversalTrainingPipeline.instance) {
      UniversalTrainingPipeline.instance = new UniversalTrainingPipeline();
    }
    return UniversalTrainingPipeline.instance;
  }

  /**
   * Generates a deterministic pseudo-random float between 0 and 1
   */
  private mulberry32(seed: number): () => number {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Core pipeline: Prepares, validates, and exports an SFT dataset
   */
  public async prepareAndExportSftDataset(
    config: UniversalTrainingDatasetConfig
  ): Promise<SftExportResult> {
    const { datasetId, format, validationRatio = 0.1, deduplicate = true, qualityFilter = true } = config;

    // 1. Strict Contamination Prevention Guard
    const leakageCheck = datasetRegistry.preventTrainingDataLeakage({ datasetId });
    if (!leakageCheck.allowed) {
      throw new DataContaminationViolation(leakageCheck.reason || "Unauthorized dataset in training pipeline");
    }

    const meta = datasetRegistry.getDatasetById(datasetId);
    if (!meta) {
      throw new Error(`Dataset '${datasetId}' not found in centralized manifest`);
    }

    if (meta.datasetType === "evaluation") {
      throw new DataContaminationViolation(
        `Evaluation dataset '${datasetId}' is strictly barred from training pipelines to prevent benchmark contamination.`
      );
    }

    // 2. Resolve dataset path and ingest raw records
    const root = datasetRegistry.resolveCanonicalDatasetsRoot();
    const rawFilePath = path.join(root, meta.relativePath);

    if (!fs.existsSync(rawFilePath)) {
      throw new Error(`Dataset source file does not exist at: ${rawFilePath}`);
    }

    let rawItems: any[] = [];
    if (meta.format === "parquet") {
      rawItems = await parquetDatasetLoader.readParquetRecords(rawFilePath, datasetId);
    } else if (meta.format === "jsonl") {
      const content = fs.readFileSync(rawFilePath, "utf8");
      rawItems = content
        .trim()
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l));
    } else if (meta.format === "json") {
      const content = fs.readFileSync(rawFilePath, "utf8");
      const parsed = JSON.parse(content);
      rawItems = Array.isArray(parsed) ? parsed : parsed.questions || parsed.data || [];
    } else {
      throw new Error(`Unsupported source format '${meta.format}' for dataset '${datasetId}'`);
    }

    const totalRecordsLoaded = rawItems.length;

    // 3. Deduplication & Quality Filtering
    const seenHashes = new Set<string>();
    let duplicateCount = 0;
    let filteredCount = 0;
    const cleanItems: any[] = [];

    for (const item of rawItems) {
      // Extract main input string for hashing and quality check
      const queryStr =
        item.question ||
        item.instruction ||
        item.userQuery ||
        (item.messages && item.messages[0]?.content) ||
        "";

      const answerStr =
        item.answer ||
        item.expectedResponse ||
        item.expectedAnswer ||
        (item.messages && item.messages[item.messages.length - 1]?.content) ||
        (item.expectedCalls && JSON.stringify(item.expectedCalls)) ||
        "";

      // Quality checks
      if (qualityFilter) {
        if (!queryStr || queryStr.trim().length < 3) {
          filteredCount++;
          continue;
        }
        if (!answerStr || answerStr.trim().length < 1) {
          filteredCount++;
          continue;
        }
      }

      // Deduplication check
      if (deduplicate) {
        const hash = crypto.createHash("sha256").update(queryStr.trim().toLowerCase(), "utf8").digest("hex");
        if (seenHashes.has(hash)) {
          duplicateCount++;
          continue;
        }
        seenHashes.add(hash);
      }

      cleanItems.push(item);
    }

    // 4. Sample limit constraint
    const maxCount = config.maxSamples ? Math.min(config.maxSamples, cleanItems.length) : cleanItems.length;
    const selectedItems = cleanItems.slice(0, maxCount);

    // 5. Transform into Target Fine-Tuning Format
    const sftRecords: SftRecord[] = [];
    for (const item of selectedItems) {
      const formatted = this.formatToSft(item, format, meta.categories);
      if (formatted) sftRecords.push(formatted);
    }

    // 6. Partition into Train and Validation Splits
    const prng = this.mulberry32(config.seed !== undefined ? config.seed : 42);
    // Shuffle indices with deterministic PRNG
    const indices = Array.from({ length: sftRecords.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const valSize =
      validationRatio > 0 && sftRecords.length > 1
        ? Math.max(1, Math.floor(sftRecords.length * validationRatio))
        : 0;
    const valIndices = new Set(indices.slice(0, valSize));

    const trainRecords: SftRecord[] = [];
    const valRecords: SftRecord[] = [];

    for (let i = 0; i < sftRecords.length; i++) {
      if (valIndices.has(i)) {
        valRecords.push(sftRecords[i]);
      } else {
        trainRecords.push(sftRecords[i]);
      }
    }

    // 7. Write exported files to output directory
    const outputDir =
      config.exportOutputDir ||
      path.resolve(process.cwd(), ".tattva_secure_vault", "sft_exports", datasetId);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const trainFilename = `${datasetId}_train_${format}.jsonl`;
    const trainFilePath = path.join(outputDir, trainFilename);
    const trainContent = trainRecords.map((r) => JSON.stringify(r)).join("\n") + "\n";
    fs.writeFileSync(trainFilePath, trainContent, "utf8");

    let valFilePath: string | undefined;
    if (valRecords.length > 0) {
      const valFilename = `${datasetId}_val_${format}.jsonl`;
      valFilePath = path.join(outputDir, valFilename);
      const valContent = valRecords.map((r) => JSON.stringify(r)).join("\n") + "\n";
      fs.writeFileSync(valFilePath, valContent, "utf8");
    }

    const checksum = crypto.createHash("sha256").update(trainContent, "utf8").digest("hex");

    return {
      datasetId,
      format,
      totalRecordsLoaded,
      totalCleanRecords: selectedItems.length,
      duplicateCount,
      filteredCount,
      trainCount: trainRecords.length,
      valCount: valRecords.length,
      trainFilePath,
      valFilePath,
      sha256Checksum: checksum,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Normalizes an item into Alpaca, ChatML, or HuggingFace format
   */
  private formatToSft(item: any, format: FineTuningFormat, categories: string[]): SftRecord | null {
    // 1. GSM8K Parquet schema
    if (item.question && (item.expectedAnswer || item.answer)) {
      const question = item.question;
      const solution = item.metadata?.fullSolution || item.answer || item.expectedAnswer || "";

      if (format === "alpaca") {
        return {
          instruction:
            "Solve the following mathematical word problem step by step. Conclude with the final numerical answer.",
          input: question,
          output: solution,
        };
      } else if (format === "chatml") {
        return {
          messages: [
            {
              role: "system",
              content:
                "You are an expert mathematical reasoning assistant. Solve problems step-by-step and terminate with '#### <number>'.",
            },
            { role: "user", content: question },
            { role: "assistant", content: solution },
          ],
        };
      } else {
        return { prompt: question, completion: solution };
      }
    }

    // 2. Multi-turn Conversational schema (messages: [{role, content}])
    if (item.messages && Array.isArray(item.messages)) {
      if (format === "chatml") {
        return { messages: item.messages };
      } else if (format === "alpaca") {
        const userMsgs = item.messages.filter((m: any) => m.role === "user");
        const asstMsgs = item.messages.filter((m: any) => m.role === "assistant");
        const instruction = userMsgs[0]?.content || "";
        const output = asstMsgs[asstMsgs.length - 1]?.content || "";
        return { instruction, output };
      } else {
        const fullPrompt = item.messages.map((m: any) => `${m.role}: ${m.content}`).join("\n\n");
        return { prompt: fullPrompt, completion: "" };
      }
    }

    // 3. Instruction schema (instruction, expectedResponse)
    if (item.instruction && item.expectedResponse) {
      if (format === "alpaca") {
        return {
          instruction: item.instruction,
          output: item.expectedResponse,
        };
      } else if (format === "chatml") {
        return {
          messages: [
            { role: "system", content: "You are a precise, helpful AI assistant that strictly follows all instructions." },
            { role: "user", content: item.instruction },
            { role: "assistant", content: item.expectedResponse },
          ],
        };
      } else {
        return { prompt: item.instruction, completion: item.expectedResponse };
      }
    }

    // 4. Tool-Use schema (tools, userQuery, expectedCalls)
    if (item.tools && item.userQuery && item.expectedCalls) {
      const toolDefStr = JSON.stringify(item.tools, null, 2);
      const callsStr = JSON.stringify(item.expectedCalls, null, 2);

      if (format === "chatml") {
        return {
          messages: [
            {
              role: "system",
              content: `You are an AI assistant equipped with authorized external tools:\n${toolDefStr}\nRespond with JSON array of tool calls.`,
            },
            { role: "user", content: item.userQuery },
            { role: "assistant", content: callsStr },
          ],
          tools: item.tools,
        };
      } else if (format === "alpaca") {
        return {
          instruction: `Select and invoke the appropriate tools to answer the user query based on the following tool definitions:\n${toolDefStr}`,
          input: item.userQuery,
          output: callsStr,
        };
      } else {
        return {
          prompt: `Tools:\n${toolDefStr}\nQuery:\n${item.userQuery}`,
          completion: callsStr,
        };
      }
    }

    return null;
  }
}

export const universalTrainingPipeline = UniversalTrainingPipeline.getInstance();
