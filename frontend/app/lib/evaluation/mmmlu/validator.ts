/**
 * TATTVA AI - MMMLU Dataset Loader and Validation Engine
 * Robust RFC-4180 parser, Unicode integrity checker, schema validator & statistical reporter
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import fs from "fs";
import path from "path";
import {
  MMMLUQuestion,
  OptionLetter,
  DetailedDatasetValidationReport,
  ValidationErrorRecord,
  AnswerDistribution,
  UnicodeIntegrityReport,
} from "./types";

export interface ValidatorOptions {
  datasetPath?: string;
  reportOutputDir?: string;
  allowDuplicates?: boolean;
}

export class MMMLUDatasetValidator {
  private static instance: MMMLUDatasetValidator;

  public static getInstance(): MMMLUDatasetValidator {
    if (!MMMLUDatasetValidator.instance) {
      MMMLUDatasetValidator.instance = new MMMLUDatasetValidator();
    }
    return MMMLUDatasetValidator.instance;
  }

  /**
   * Reliably resolves the dataset path across monorepo root and frontend workspace
   */
  public resolveDatasetPath(customPathOrFilename?: string): string {
    const defaultFilenames = [
      "MMMLU_HI-IN_456_question_sample.csv",
      "mmlu_HI-IN.csv",
    ];

    const targets = customPathOrFilename
      ? [customPathOrFilename]
      : [
          process.env.MMMLU_DATASET_PATH,
          ...defaultFilenames,
        ].filter(Boolean) as string[];

    const searchBases = [
      process.cwd(),
      path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".."),
      path.resolve(/*turbopackIgnore: true*/ process.cwd(), "frontend"),
      path.resolve(/*turbopackIgnore: true*/ __dirname, "../../../.."),
      path.resolve(/*turbopackIgnore: true*/ __dirname, "../../.."),
    ];

    for (const target of targets) {
      // 1. Direct path check
      if (fs.existsSync(target) && fs.statSync(target).isFile()) {
        return path.resolve(target);
      }

      // 2. Search under candidate bases
      for (const base of searchBases) {
        const candidatePaths = [
          path.resolve(base, target),
          path.resolve(base, "datasets", "MMMLU", target),
          path.resolve(base, "frontend", "datasets", "MMMLU", target),
        ];

        for (const cand of candidatePaths) {
          try {
            if (fs.existsSync(/*turbopackIgnore: true*/ cand) && fs.statSync(/*turbopackIgnore: true*/ cand).isFile()) {
              return cand;
            }
          } catch {
            // Ignore filesystem errors during search
          }
        }
      }
    }

    throw new Error(
      `MMMLU dataset could not be located. Searched target(s): ${targets.join(
        ", "
      )} from cwd: ${process.cwd()}`
    );
  }

  /**
   * RFC-4180 compliant CSV parser supporting multi-line strings, escaped quotes, and Hindi UTF-8
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
   * Verifies Hindi Unicode integrity and detects replacement chars or null bytes
   */
  public checkUnicodeIntegrity(rawContent: string): UnicodeIntegrityReport {
    const hasReplacementChar = rawContent.includes("\uFFFD");
    const hasNullBytes = rawContent.includes("\0");
    const devanagariRegex = /[\u0900-\u097F]/;
    const nonAsciiDevanagariDetected = devanagariRegex.test(rawContent);

    const details: string[] = [];
    if (hasReplacementChar) {
      details.push("Found Unicode replacement character (U+FFFD), indicating decoding corruption.");
    }
    if (hasNullBytes) {
      details.push("Found null bytes (0x00) inside CSV text.");
    }
    if (nonAsciiDevanagariDetected) {
      details.push("Devanagari Hindi script (U+0900 - U+097F) successfully identified and verified.");
    }

    const passed = !hasReplacementChar && !hasNullBytes;

    return {
      passed,
      hasReplacementChar,
      hasNullBytes,
      nonAsciiDevanagariDetected,
      details,
    };
  }

  /**
   * Main dataset validation method
   */
  public validate(
    targetPathOrContent?: string,
    options: ValidatorOptions = {}
  ): {
    validQuestions: MMMLUQuestion[];
    report: DetailedDatasetValidationReport;
  } {
    let rawContent: string;
    let resolvedPath = "in-memory-buffer.csv";
    let fileSizeBytes = 0;

    // Check if input is direct raw content or file path
    if (targetPathOrContent && (targetPathOrContent.includes("\n") || targetPathOrContent.includes(","))) {
      rawContent = targetPathOrContent;
      fileSizeBytes = Buffer.byteLength(rawContent, "utf8");
    } else {
      resolvedPath = this.resolveDatasetPath(targetPathOrContent);
      const stat = fs.statSync(/*turbopackIgnore: true*/ resolvedPath);
      fileSizeBytes = stat.size;
      rawContent = fs.readFileSync(/*turbopackIgnore: true*/ resolvedPath, { encoding: "utf8" });
    }

    // Normalize Unicode to canonical NFC form
    const normalizedContent = rawContent.normalize("NFC");
    const unicodeIntegrity = this.checkUnicodeIntegrity(normalizedContent);

    const rawRows = this.parseRFC4180CSV(normalizedContent);
    if (rawRows.length < 2) {
      throw new Error("Dataset is empty or contains no data rows.");
    }

    // Map column header indices, dynamically handling the empty first index column
    const headerRow = rawRows[0];
    const cleanedHeaders = headerRow.map((h) => h.trim().toLowerCase());

    const findCol = (name: string): number => {
      return cleanedHeaders.findIndex((h) => h === name.toLowerCase());
    };

    const colIdx = {
      unnamed: cleanedHeaders.findIndex(
        (h) => h === "unnamed: 0" || h === "" || h === "index" || h === "id"
      ),
      question: findCol("question"),
      a: findCol("a"),
      b: findCol("b"),
      c: findCol("c"),
      d: findCol("d"),
      answer: findCol("answer"),
      subject: findCol("subject"),
    };

    const requiredHeaders = ["question", "a", "b", "c", "d", "answer", "subject"];
    const missingHeaders: string[] = [];
    for (const h of requiredHeaders) {
      if ((colIdx as Record<string, number>)[h] === -1) {
        missingHeaders.push(h);
      }
    }

    if (missingHeaders.length > 0) {
      throw new Error(
        `MMMLU dataset schema validation failed. Missing required column(s): ${missingHeaders.join(
          ", "
        )}. Detected columns: [${cleanedHeaders.join(", ")}]`
      );
    }

    const validQuestions: MMMLUQuestion[] = [];
    const errors: ValidationErrorRecord[] = [];
    const warnings: string[] = [];
    const seenQuestions = new Map<string, number>(); // normalized question -> first row index
    let duplicateRecords = 0;

    const subjectsBreakdown: Record<string, number> = {};
    const answerCounts: Record<OptionLetter, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
    };

    const expectedCols = Math.max(
      colIdx.question,
      colIdx.a,
      colIdx.b,
      colIdx.c,
      colIdx.d,
      colIdx.answer,
      colIdx.subject
    ) + 1;

    const dataRowCount = rawRows.length - 1;

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      const rowIndex = r; // 1-based data row index

      // Skip blank rows at the end of file
      if (!row || row.join("").trim() === "") {
        continue;
      }

      // Check row length
      if (row.length < expectedCols) {
        errors.push({
          rowIndex,
          questionPreview: row.slice(0, 2).join(" ").substring(0, 60),
          errorType: "malformed_row",
          message: `Row column count (${row.length}) is less than expected minimum (${expectedCols})`,
        });
        continue;
      }

      const rawQ = (row[colIdx.question] || "").trim();
      const rawA = (row[colIdx.a] || "").trim();
      const rawB = (row[colIdx.b] || "").trim();
      const rawC = (row[colIdx.c] || "").trim();
      const rawD = (row[colIdx.d] || "").trim();
      const rawAns = (row[colIdx.answer] || "").trim().toUpperCase();
      const rawSub = (row[colIdx.subject] || "").trim();

      const preview = rawQ.length > 0 ? rawQ.substring(0, 60) : `[Empty Row ${rowIndex}]`;

      // 1. Missing Question
      if (!rawQ) {
        errors.push({
          rowIndex,
          questionPreview: preview,
          errorType: "missing_question",
          message: "Question field is empty or missing.",
          field: "Question",
        });
        continue;
      }

      // 2. Missing Options
      if (!rawA || !rawB || !rawC || !rawD) {
        const missingOpts: string[] = [];
        if (!rawA) missingOpts.push("A");
        if (!rawB) missingOpts.push("B");
        if (!rawC) missingOpts.push("C");
        if (!rawD) missingOpts.push("D");

        errors.push({
          rowIndex,
          questionPreview: preview,
          errorType: "missing_option",
          message: `Missing option(s): ${missingOpts.join(", ")}`,
          field: missingOpts.join(","),
        });
        continue;
      }

      // 3. Invalid Answer
      if (rawAns !== "A" && rawAns !== "B" && rawAns !== "C" && rawAns !== "D") {
        errors.push({
          rowIndex,
          questionPreview: preview,
          errorType: "invalid_answer",
          message: `Answer '${rawAns}' is invalid; must strictly be A, B, C, or D.`,
          field: "Answer",
          rawAnswer: rawAns,
        });
        continue;
      }

      // 4. Empty Subject
      if (!rawSub) {
        errors.push({
          rowIndex,
          questionPreview: preview,
          errorType: "empty_subject",
          message: "Subject field is empty.",
          field: "Subject",
        });
        continue;
      }

      // 5. Duplicate Question Detection
      const normalizedQ = rawQ.toLowerCase().replace(/\s+/g, " ").trim();
      if (seenQuestions.has(normalizedQ)) {
        duplicateRecords++;
        const firstRow = seenQuestions.get(normalizedQ);
        warnings.push(
          `Row ${rowIndex} is a duplicate of question first seen at Row ${firstRow}: "${preview}"`
        );
      } else {
        seenQuestions.set(normalizedQ, rowIndex);
      }

      // 6. Valid Question Registration
      const validQuestion: MMMLUQuestion = {
        id: validQuestions.length + 1,
        question: rawQ,
        options: {
          A: rawA,
          B: rawB,
          C: rawC,
          D: rawD,
        },
        answer: rawAns as OptionLetter,
        subject: rawSub,
      };

      validQuestions.push(validQuestion);
      subjectsBreakdown[rawSub] = (subjectsBreakdown[rawSub] || 0) + 1;
      answerCounts[rawAns as OptionLetter]++;
    }

    const totalValid = validQuestions.length;
    const totalInvalid = errors.length;

    const answerDistribution: AnswerDistribution = {
      A: {
        count: answerCounts.A,
        percentage: totalValid > 0 ? Number(((answerCounts.A / totalValid) * 100).toFixed(2)) : 0,
      },
      B: {
        count: answerCounts.B,
        percentage: totalValid > 0 ? Number(((answerCounts.B / totalValid) * 100).toFixed(2)) : 0,
      },
      C: {
        count: answerCounts.C,
        percentage: totalValid > 0 ? Number(((answerCounts.C / totalValid) * 100).toFixed(2)) : 0,
      },
      D: {
        count: answerCounts.D,
        percentage: totalValid > 0 ? Number(((answerCounts.D / totalValid) * 100).toFixed(2)) : 0,
      },
    };

    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const report: DetailedDatasetValidationReport = {
      datasetFile: path.basename(resolvedPath),
      datasetPath: resolvedPath,
      fileSizeBytes,
      fileSizeFormatted: formatBytes(fileSizeBytes),
      validatedAt: new Date().toISOString(),
      isValid: totalInvalid === 0 && totalValid > 0 && unicodeIntegrity.passed,
      totalRecords: dataRowCount,
      validRecords: totalValid,
      invalidRecords: totalInvalid,
      duplicateRecords,
      totalSubjects: Object.keys(subjectsBreakdown).length,
      subjectsBreakdown,
      answerDistribution,
      errors,
      warnings,
      unicodeIntegrity,
    };

    return { validQuestions, report };
  }

  /**
   * Writes the detailed validation report to JSON file
   */
  public writeReportToFile(
    report: DetailedDatasetValidationReport,
    customReportPath?: string
  ): string {
    const targetLocations = [
      path.resolve(process.cwd(), "datasets", "MMMLU", "reports", "validation-report.json"),
      path.resolve(process.cwd(), "..", "datasets", "MMMLU", "reports", "validation-report.json"),
    ];

    if (customReportPath) {
      targetLocations.unshift(path.resolve(customReportPath));
    }

    const jsonStr = JSON.stringify(report, null, 2);
    let primaryPath = targetLocations[0];

    for (const loc of targetLocations) {
      try {
        const dir = path.dirname(loc);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(loc, jsonStr, { encoding: "utf8" });
        if (!primaryPath) primaryPath = loc;
      } catch {
        // Ignore failure on alternate location
      }
    }

    return primaryPath;
  }

  /**
   * Formats a clean, readable terminal report
   */
  public formatTerminalReport(report: DetailedDatasetValidationReport): string {
    const divider = "=".repeat(64);
    const subDivider = "-".repeat(64);

    const lines: string[] = [
      divider,
      "📊 TATTVA AI — OPENAI MMMLU HINDI DATASET VALIDATION REPORT",
      divider,
      `📁 Dataset File     : ${report.datasetFile}`,
      `📍 Resolved Path   : ${report.datasetPath}`,
      `📦 File Size       : ${report.fileSizeFormatted} (${report.fileSizeBytes.toLocaleString()} bytes)`,
      `⏰ Validated At    : ${report.validatedAt}`,
      `🛡️ Validation Status: ${report.isValid ? "✅ PASSED (100% VALID)" : "⚠️ ISSUES DETECTED"}`,
      subDivider,
      "📈 DATASET SUMMARY STATISTICS",
      subDivider,
      `  • Total Records in CSV : ${report.totalRecords.toLocaleString()}`,
      `  • Valid Questions      : ${report.validRecords.toLocaleString()} (${(
        (report.validRecords / Math.max(1, report.totalRecords)) *
        100
      ).toFixed(2)}%)`,
      `  • Invalid Records      : ${report.invalidRecords.toLocaleString()}`,
      `  • Duplicate Questions  : ${report.duplicateRecords.toLocaleString()}`,
      `  • Academic Subjects    : ${report.totalSubjects}`,
      subDivider,
      "🔤 ANSWER OPTION DISTRIBUTION",
      subDivider,
      `  [A] : ${report.answerDistribution.A.count.toString().padStart(4, " ")} (${report.answerDistribution.A.percentage.toFixed(2)}%)`,
      `  [B] : ${report.answerDistribution.B.count.toString().padStart(4, " ")} (${report.answerDistribution.B.percentage.toFixed(2)}%)`,
      `  [C] : ${report.answerDistribution.C.count.toString().padStart(4, " ")} (${report.answerDistribution.C.percentage.toFixed(2)}%)`,
      `  [D] : ${report.answerDistribution.D.count.toString().padStart(4, " ")} (${report.answerDistribution.D.percentage.toFixed(2)}%)`,
      subDivider,
      "🌐 UNICODE & ENCODING INTEGRITY",
      subDivider,
      `  • Unicode Canonical Form : NFC Normalized`,
      `  • Replacement (U+FFFD)   : ${report.unicodeIntegrity.hasReplacementChar ? "❌ FOUND (CORRUPT)" : "✅ Clean (None detected)"}`,
      `  • Null Bytes (0x00)      : ${report.unicodeIntegrity.hasNullBytes ? "❌ FOUND (CORRUPT)" : "✅ Clean (None detected)"}`,
      `  • Hindi Devanagari Block : ${report.unicodeIntegrity.nonAsciiDevanagariDetected ? "✅ Confirmed Present" : "⚠️ None detected"}`,
      subDivider,
      "📚 SUBJECT BREAKDOWN (Top 10)",
      subDivider,
    ];

    const sortedSubjects = Object.entries(report.subjectsBreakdown)
      .sort((a, b) => b[1] - a[1]);

    const top10 = sortedSubjects.slice(0, 10);
    for (const [subj, count] of top10) {
      const pct = ((count / Math.max(1, report.validRecords)) * 100).toFixed(1);
      lines.push(`  • ${subj.padEnd(28, " ")} : ${count.toString().padStart(4, " ")} (${pct}%)`);
    }

    if (sortedSubjects.length > 10) {
      lines.push(`  ... and ${sortedSubjects.length - 10} additional subjects`);
    }

    if (report.errors.length > 0) {
      lines.push(subDivider);
      lines.push(`❌ DETECTED ERRORS (${report.errors.length})`);
      lines.push(subDivider);
      for (const err of report.errors.slice(0, 5)) {
        lines.push(`  [Row ${err.rowIndex}] ${err.errorType}: ${err.message} (${err.questionPreview})`);
      }
      if (report.errors.length > 5) {
        lines.push(`  ... and ${report.errors.length - 5} more error records`);
      }
    }

    if (report.warnings.length > 0) {
      lines.push(subDivider);
      lines.push(`⚠️ WARNINGS (${report.warnings.length})`);
      lines.push(subDivider);
      for (const w of report.warnings.slice(0, 5)) {
        lines.push(`  • ${w}`);
      }
      if (report.warnings.length > 5) {
        lines.push(`  ... and ${report.warnings.length - 5} more duplicate warnings`);
      }
    }

    lines.push(divider);
    return lines.join("\n");
  }
}

export const mmmluValidator = MMMLUDatasetValidator.getInstance();
