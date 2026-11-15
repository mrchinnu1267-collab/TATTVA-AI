/**
 * TATTVA AI - Result Verification Engine (Phase 36)
 * Validates generated artifacts, file formats, calculations, completeness, and detects failed actions
 * Strictly prevents hallucinated claims of completion
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface VerificationCheck {
  item: string;
  category: "file_existence" | "format_validity" | "code_completeness" | "calculation_accuracy" | "content_integrity";
  passed: boolean;
  details: string;
  error?: string;
}

export interface VerificationReport {
  isFullyVerified: boolean;
  completionScore: number; // 0 - 100
  completedTasks: string[];
  incompleteTasks: string[];
  failedActions: string[];
  verifiedFiles: Array<{
    filename: string;
    format: string;
    sizeBytes: number;
    isValidFormat: boolean;
  }>;
  checks: VerificationCheck[];
  summary: string;
}

export class ResultVerifier {
  private static instance: ResultVerifier;

  public static getInstance(): ResultVerifier {
    if (!ResultVerifier.instance) {
      ResultVerifier.instance = new ResultVerifier();
    }
    return ResultVerifier.instance;
  }

  /**
   * Verifies an array of generated files for existence, format validity, and non-empty size
   */
  public verifyFiles(
    files: Array<{ filename: string; format: string; content?: string | Buffer; sizeBytes?: number }>
  ): VerificationReport {
    const checks: VerificationCheck[] = [];
    const verifiedFiles: VerificationReport["verifiedFiles"] = [];
    const completedTasks: string[] = [];
    const incompleteTasks: string[] = [];
    const failedActions: string[] = [];

    for (const f of files) {
      const size = f.sizeBytes || (typeof f.content === "string" ? Buffer.byteLength(f.content) : f.content?.length || 0);
      const exists = size > 0;
      
      checks.push({
        item: f.filename,
        category: "file_existence",
        passed: exists,
        details: exists ? `File ${f.filename} exists (${size} bytes)` : `File ${f.filename} is empty or missing`,
      });

      // Format validation
      const ext = f.filename.split(".").pop()?.toLowerCase();
      const formatValid = Boolean(ext && ["java", "sql", "docx", "pptx", "xlsx", "pdf", "csv", "py", "ts", "json", "md"].includes(ext));

      checks.push({
        item: f.filename,
        category: "format_validity",
        passed: formatValid,
        details: formatValid ? `Valid expected extension .${ext}` : `Unsupported or malformed format extension .${ext}`,
      });

      // Completeness check
      let isComplete = true;
      if (typeof f.content === "string") {
        if (f.content.includes("// TODO") || f.content.includes("# TODO") || f.content.includes("[fill in]")) {
          isComplete = false;
          checks.push({
            item: f.filename,
            category: "code_completeness",
            passed: false,
            details: `Contains placeholder text or truncated TODO items`,
          });
        }
      }

      if (exists && formatValid && isComplete) {
        verifiedFiles.push({
          filename: f.filename,
          format: ext || f.format,
          sizeBytes: size,
          isValidFormat: true,
        });
        completedTasks.push(`Generate & verify ${f.filename}`);
      } else {
        incompleteTasks.push(`File ${f.filename} incomplete or invalid`);
        failedActions.push(`Failed verification for ${f.filename}`);
      }
    }

    const passedCount = checks.filter((c) => c.passed).length;
    const completionScore = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;
    const isFullyVerified = incompleteTasks.length === 0 && failedActions.length === 0 && checks.length > 0;

    return {
      isFullyVerified,
      completionScore,
      completedTasks,
      incompleteTasks,
      failedActions,
      verifiedFiles,
      checks,
      summary: isFullyVerified
        ? `All ${verifiedFiles.length} generated files verified with valid formats and complete content.`
        : `Verification detected ${incompleteTasks.length} incomplete files or failed validations (${completionScore}% complete).`,
    };
  }

  /**
   * Verifies numerical calculations against deterministic ground truth
   */
  public verifyCalculation(expression: string, claimedResult: number | string): VerificationCheck {
    try {
      const sanitized = expression.replace(/[^0-9\+\-\*\/\(\)\.\s\^]/g, "").replace(/\^/g, "**");
      // Safe deterministic arithmetic evaluation
      const computed = Function(`"use strict"; return (${sanitized});`)();
      const claimedNum = typeof claimedResult === "number" ? claimedResult : parseFloat(claimedResult);
      const isAccurate = Math.abs(computed - claimedNum) < 1e-4;

      return {
        item: expression,
        category: "calculation_accuracy",
        passed: isAccurate,
        details: isAccurate
          ? `Calculated result ${claimedNum} matches deterministic mathematical ground truth (${computed})`
          : `Calculation mismatch: claimed ${claimedNum}, actual computed ${computed}`,
      };
    } catch (err: any) {
      return {
        item: expression,
        category: "calculation_accuracy",
        passed: false,
        details: `Failed to evaluate expression: ${err.message}`,
        error: err.message,
      };
    }
  }

  /**
   * Produces an honest audit status report preventing fake claims of 100% completion
   */
  public buildAuditReport(
    planSteps: Array<{ title: string; status: string; output?: any }>,
    verification: VerificationReport
  ): {
    overallStatus: "completed" | "partially_completed" | "failed";
    completedSteps: string[];
    incompleteSteps: string[];
    unresolvedBlockers: string[];
  } {
    const completedSteps: string[] = [];
    const incompleteSteps: string[] = [];
    const unresolvedBlockers: string[] = [];

    for (const step of planSteps) {
      if (step.status === "completed" && (!step.output?.error || step.output?.degraded !== true)) {
        completedSteps.push(step.title);
      } else {
        incompleteSteps.push(step.title);
        if (step.output?.error) {
          unresolvedBlockers.push(`${step.title}: ${step.output.error}`);
        }
      }
    }

    // Add any incomplete verification tasks
    for (const inc of verification.incompleteTasks) {
      if (!incompleteSteps.includes(inc)) incompleteSteps.push(inc);
    }

    let overallStatus: "completed" | "partially_completed" | "failed" = "completed";
    if (incompleteSteps.length > 0 || !verification.isFullyVerified) {
      overallStatus = completedSteps.length > 0 ? "partially_completed" : "failed";
    }

    return {
      overallStatus,
      completedSteps,
      incompleteSteps,
      unresolvedBlockers,
    };
  }
}

export const resultVerifier = ResultVerifier.getInstance();
