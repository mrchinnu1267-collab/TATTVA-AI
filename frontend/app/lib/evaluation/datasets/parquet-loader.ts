/**
 * TATTVA AI - Parquet Dataset Loader & Schema Normalizer
 * Pure JavaScript Parquet parsing using hyparquet with snappy decompression
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { parquetMetadata, parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { UniversalQuestionRecord } from "./types";

export interface Gsm8kParsedAnswer {
  fullSolution: string;
  finalNumericAnswer: string;
  calculationSteps: string[];
}

export class ParquetDatasetLoader {
  private static instance: ParquetDatasetLoader;

  public static getInstance(): ParquetDatasetLoader {
    if (!ParquetDatasetLoader.instance) {
      ParquetDatasetLoader.instance = new ParquetDatasetLoader();
    }
    return ParquetDatasetLoader.instance;
  }

  /**
   * Parses the GSM8K answer string extracting calculation steps and final answer
   * GSM8K format: "... <<16-3-4=9>>9 ... \n#### 18"
   */
  public parseGsm8kAnswer(rawAnswer: string): Gsm8kParsedAnswer {
    if (!rawAnswer || typeof rawAnswer !== "string") {
      return { fullSolution: "", finalNumericAnswer: "", calculationSteps: [] };
    }

    const normalized = rawAnswer.normalize("NFC").trim();
    const finalAnswerMatch = normalized.match(/####\s*(-?[\d,]+(?:\.\d+)?)/);
    const finalNumericAnswer = finalAnswerMatch ? finalAnswerMatch[1].replace(/,/g, "") : "";

    const stepMatches = [...normalized.matchAll(/<<([^>]+)>>/g)].map((m) => m[1]);

    return {
      fullSolution: normalized,
      finalNumericAnswer,
      calculationSteps: stepMatches,
    };
  }

  /**
   * Reads and inspects Parquet file metadata
   */
  public inspectParquetFile(filePath: string): {
    numRows: number;
    columns: Array<{ name: string; type: string }>;
    fileSizeBytes: number;
  } {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Parquet file not found at: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const metadata = parquetMetadata(arrayBuffer);

    const columns = metadata.schema
      .filter((s) => s.name && s.name !== "schema")
      .map((s) => ({
        name: s.name,
        type: String(s.type || s.converted_type || "UNKNOWN"),
      }));

    return {
      numRows: Number(metadata.num_rows),
      columns,
      fileSizeBytes: buffer.length,
    };
  }

  /**
   * Reads Parquet records asynchronously using hyparquet
   */
  public async readParquetRecords(
    filePath: string,
    datasetId = "gsm8k"
  ): Promise<UniversalQuestionRecord[]> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Parquet file not found at: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const rawRows = await parquetReadObjects({
      file: arrayBuffer,
      compressors,
    });

    const records: UniversalQuestionRecord[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i] as any;
      const question = typeof row.question === "string" ? row.question.normalize("NFC").trim() : "";
      const rawAnswer = typeof row.answer === "string" ? row.answer.normalize("NFC").trim() : "";
      const parsedAns = this.parseGsm8kAnswer(rawAnswer);

      records.push({
        id: `${datasetId}_${i + 1}`,
        question,
        expectedAnswer: parsedAns.finalNumericAnswer || rawAnswer,
        subject: "mathematics",
        language: "en-US",
        metadata: {
          fullSolution: parsedAns.fullSolution,
          calculationSteps: parsedAns.calculationSteps,
          finalNumericAnswer: parsedAns.finalNumericAnswer,
          rowIndex: i,
          sourceFormat: "parquet",
        },
      });
    }

    return records;
  }

  /**
   * Reads Parquet records synchronously via node worker invocation
   */
  public readParquetRecordsSync(
    filePath: string,
    datasetId = "gsm8k"
  ): UniversalQuestionRecord[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Parquet file not found at: ${filePath}`);
    }

    // Execute lightweight Node inline reader script
    const script = `
      const fs = require('fs');
      const { parquetReadObjects } = require('hyparquet');
      const { compressors } = require('hyparquet-compressors');

      const filePath = process.argv[1];
      const buffer = fs.readFileSync(filePath);
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      parquetReadObjects({ file: arrayBuffer, compressors }).then((rows) => {
        process.stdout.write(JSON.stringify(rows));
      }).catch((err) => {
        process.stderr.write(String(err));
        process.exit(1);
      });
    `;

    try {
      const rawOutput = execFileSync(process.execPath, ["-e", script, filePath], {
        maxBuffer: 100 * 1024 * 1024,
        encoding: "utf8",
        cwd: path.resolve(__dirname, "../../../../.."),
      });

      const rawRows = JSON.parse(rawOutput) as any[];
      const records: UniversalQuestionRecord[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const question = typeof row.question === "string" ? row.question.normalize("NFC").trim() : "";
        const rawAnswer = typeof row.answer === "string" ? row.answer.normalize("NFC").trim() : "";
        const parsedAns = this.parseGsm8kAnswer(rawAnswer);

        records.push({
          id: `${datasetId}_${i + 1}`,
          question,
          expectedAnswer: parsedAns.finalNumericAnswer || rawAnswer,
          subject: "mathematics",
          language: "en-US",
          metadata: {
            fullSolution: parsedAns.fullSolution,
            calculationSteps: parsedAns.calculationSteps,
            finalNumericAnswer: parsedAns.finalNumericAnswer,
            rowIndex: i,
            sourceFormat: "parquet",
          },
        });
      }

      return records;
    } catch (err: any) {
      throw new Error(`Failed to synchronously read Parquet file '${filePath}': ${err.message}`);
    }
  }

  /**
   * Double-blind evaluation safety guard: Strips expected answers and solutions
   * so evaluation questions can be safely passed to models without data leakage.
   */
  public maskEvaluationAnswers(record: UniversalQuestionRecord): UniversalQuestionRecord {
    return {
      id: record.id,
      question: record.question,
      subject: record.subject,
      language: record.language,
      expectedAnswer: "[PROTECTED_EVALUATION_ANSWER]",
      metadata: {
        ...record.metadata,
        fullSolution: "[PROTECTED]",
        calculationSteps: [],
        finalNumericAnswer: "[PROTECTED]",
        isMaskedForEvaluation: true,
      },
    };
  }
}

export const parquetDatasetLoader = ParquetDatasetLoader.getInstance();
