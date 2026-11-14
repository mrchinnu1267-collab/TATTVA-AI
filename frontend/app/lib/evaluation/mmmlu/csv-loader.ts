/**
 * TATTVA AI - MMMLU CSV Dataset Loader & Validator
 * OpenAI MMMLU (Hindi - HI-IN) Dataset Parser
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  MMMLUQuestion,
  DatasetValidationReport,
  OptionLetter,
} from "./types";

export class MMMLUCSVLoader {
  private static instance: MMMLUCSVLoader;
  private cachedDatasets: Map<
    string,
    { questions: MMMLUQuestion[]; report: DatasetValidationReport }
  > = new Map();
  private datasetPathMap: Map<string, string> = new Map();

  public static getInstance(): MMMLUCSVLoader {
    if (!MMMLUCSVLoader.instance) {
      MMMLUCSVLoader.instance = new MMMLUCSVLoader();
    }
    return MMMLUCSVLoader.instance;
  }

  /**
   * Resolves the absolute path to MMMLU dataset CSV files across monorepo environments
   * Defaults to canonical 456-question sample initially as requested
   */
  public resolveDatasetPath(targetDataset: string = "sample"): string {
    const isFull =
      targetDataset === "full" ||
      targetDataset === "mmlu_HI-IN.csv" ||
      targetDataset === "all";

    const key = isFull ? "full" : "sample";
    if (this.datasetPathMap.has(key)) {
      const p = this.datasetPathMap.get(key)!;
      if (fs.existsSync(p)) return p;
    }

    const preferredFilename = isFull
      ? "mmlu_HI-IN.csv"
      : "MMMLU_HI-IN_456_question_sample.csv";

    const fallbackFilename = isFull
      ? "MMMLU_HI-IN_456_question_sample.csv"
      : "mmlu_HI-IN.csv";

    const candidatePaths = [
      path.join(process.cwd(), "datasets", "MMMLU", preferredFilename),
      path.resolve(process.cwd(), "..", "datasets", "MMMLU", preferredFilename),
      ...(process.env.MMMLU_DATASET_PATH ? [process.env.MMMLU_DATASET_PATH] : []),
      path.join(process.cwd(), "datasets", "MMMLU", fallbackFilename),
      path.resolve(process.cwd(), "..", "datasets", "MMMLU", fallbackFilename),
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p)) {
          this.datasetPathMap.set(key, p);
          return p;
        }
      } catch {
        // Ignore filesystem check errors
      }
    }

    throw new Error(
      `MMMLU dataset file '${preferredFilename}' could not be located in datasets/MMMLU/.`
    );
  }

  /**
   * Robust RFC-4180 compliant CSV parser supporting multi-line strings, quoted commas, and Hindi UTF-8
   */
  public parseRFC4180CSV(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;

    const len = csvText.length;
    for (let i = 0; i < len; i++) {
      const char = csvText[i];
      const nextChar = i + 1 < len ? csvText[i + 1] : "";

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ",") {
          currentRow.push(currentField);
          currentField = "";
        } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = "";
          if (char === "\r") i++; // skip \n
        } else if (char === "\r") {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = "";
        } else {
          currentField += char;
        }
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows;
  }

  /**
   * Loads and validates the MMMLU Hindi dataset with in-memory caching
   */
  public loadAndValidateDataset(
    datasetPreference: string = "sample",
    forceReload: boolean = false
  ): {
    questions: MMMLUQuestion[];
    report: DatasetValidationReport;
  } {
    const isFull =
      datasetPreference === "full" ||
      datasetPreference === "mmlu_HI-IN.csv" ||
      datasetPreference === "all";
    const cacheKey = isFull ? "full" : "sample";

    if (!forceReload && this.cachedDatasets.has(cacheKey)) {
      return this.cachedDatasets.get(cacheKey)!;
    }

    const filePath = this.resolveDatasetPath(datasetPreference);
    const rawContent = fs.readFileSync(filePath, { encoding: "utf8" });
    const rawRows = this.parseRFC4180CSV(rawContent);

    if (rawRows.length < 2) {
      throw new Error("MMMLU dataset CSV is empty or missing data rows.");
    }

    const header = rawRows[0].map((h) => h.trim().toLowerCase());
    
    // Validate required column schema (Question, A, B, C, D, Answer, Subject)
    const colIdx = {
      question: header.findIndex((h) => h === "question"),
      a: header.findIndex((h) => h === "a"),
      b: header.findIndex((h) => h === "b"),
      c: header.findIndex((h) => h === "c"),
      d: header.findIndex((h) => h === "d"),
      answer: header.findIndex((h) => h === "answer"),
      subject: header.findIndex((h) => h === "subject"),
    };

    const errors: string[] = [];
    if (colIdx.question === -1) errors.push("Missing required column: 'Question'");
    if (colIdx.a === -1) errors.push("Missing required column: 'A'");
    if (colIdx.b === -1) errors.push("Missing required column: 'B'");
    if (colIdx.c === -1) errors.push("Missing required column: 'C'");
    if (colIdx.d === -1) errors.push("Missing required column: 'D'");
    if (colIdx.answer === -1) errors.push("Missing required column: 'Answer'");
    if (colIdx.subject === -1) errors.push("Missing required column: 'Subject'");

    if (errors.length > 0) {
      throw new Error(`MMMLU dataset schema validation failed: ${errors.join(", ")}`);
    }

    const validQuestions: MMMLUQuestion[] = [];
    let invalidRows = 0;
    let missingQuestions = 0;
    let missingOptions = 0;
    let invalidAnswers = 0;
    const subjectCounts: Record<string, number> = {};

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length < 7) {
        if (row && row.join("").trim() === "") continue; // skip blank line
        invalidRows++;
        continue;
      }

      const questionText = (row[colIdx.question] || "").trim();
      const optA = (row[colIdx.a] || "").trim();
      const optB = (row[colIdx.b] || "").trim();
      const optC = (row[colIdx.c] || "").trim();
      const optD = (row[colIdx.d] || "").trim();
      const rawAns = (row[colIdx.answer] || "").trim().toUpperCase();
      const subjectText = (row[colIdx.subject] || "").trim() || "general";

      if (!questionText) {
        missingQuestions++;
        invalidRows++;
        continue;
      }

      if (!optA || !optB || !optC || !optD) {
        missingOptions++;
        invalidRows++;
        continue;
      }

      if (rawAns !== "A" && rawAns !== "B" && rawAns !== "C" && rawAns !== "D") {
        invalidAnswers++;
        invalidRows++;
        continue;
      }

      const q: MMMLUQuestion = {
        id: i,
        question: questionText,
        options: {
          A: optA,
          B: optB,
          C: optC,
          D: optD,
        },
        answer: rawAns as OptionLetter,
        subject: subjectText,
      };

      validQuestions.push(q);
      subjectCounts[subjectText] = (subjectCounts[subjectText] || 0) + 1;
    }

    const subjects = Object.entries(subjectCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const report: DatasetValidationReport = {
      isValid: validQuestions.length > 0 && errors.length === 0,
      totalRows: rawRows.length - 1,
      validQuestions: validQuestions.length,
      invalidRows,
      missingQuestions,
      missingOptions,
      invalidAnswers,
      subjects,
      errors,
    };

    const output = { questions: validQuestions, report };
    this.cachedDatasets.set(cacheKey, output);

    return output;
  }

  /**
   * Deterministic seeded PRNG (Mulberry32) for reproducible evaluations
   */
  private createPRNG(seed: number): () => number {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Selects an evaluation question sample based on subject, size, and optional seed
   * Defaults to the canonical 456-question sample
   */
  public selectQuestions(
    sampleSize: any = 25,
    subjectFilter?: string,
    seed?: number,
    datasetPreference: string = "sample"
  ): MMMLUQuestion[] {
    const { questions } = this.loadAndValidateDataset(datasetPreference);

    // 1. Filter by subject if specified and not "all"
    let filtered = questions;
    if (subjectFilter && subjectFilter !== "all") {
      const target = subjectFilter.trim().toLowerCase();
      filtered = questions.filter((q) => q.subject.toLowerCase() === target);
      if (filtered.length === 0) {
        throw new Error(`No questions found for subject: '${subjectFilter}'.`);
      }
    }

    // 2. Full dataset requested
    if (sampleSize === "all") {
      return [...filtered];
    }

    const targetCount = Math.min(Number(sampleSize) || 25, filtered.length);

    // 3. Deterministic sampling if seed provided
    if (typeof seed === "number") {
      const rng = this.createPRNG(seed);
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, targetCount);
    }

    // 4. Default even-spread stratified sample across the subject or dataset
    if (targetCount >= filtered.length) {
      return [...filtered];
    }

    const step = filtered.length / targetCount;
    const sampled: MMMLUQuestion[] = [];
    for (let i = 0; i < targetCount; i++) {
      const idx = Math.floor(i * step);
      sampled.push(filtered[idx]);
    }
    return sampled;
  }
}

export const mmmluCSVLoader = MMMLUCSVLoader.getInstance();
