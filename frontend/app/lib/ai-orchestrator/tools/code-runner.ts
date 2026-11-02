/**
 * TATTVA AI - Sandboxed Code Execution & Test Engine
 * Safe script validation, test-case verification, and isolated runtime
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import vm from "vm";
import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";

export interface CodeExecutionOptions {
  language: "javascript" | "typescript" | "python" | "json";
  code: string;
  testCases?: Array<{ input: any; expected: any; name?: string }>;
  timeoutMs?: number;
}

export interface ExecutionRunResult {
  stdout: string[];
  stderr: string[];
  returnedValue: any;
  passedCount: number;
  failedCount: number;
  testDetails: Array<{ name: string; passed: boolean; actual: any; expected: any; error?: string }>;
  executionDurationMs: number;
}

/**
 * Executes code within an isolated Node VM sandbox with strictly locked globals
 */
export async function executeCodeInSandbox(opts: CodeExecutionOptions): Promise<ExecutionRunResult> {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const testDetails: ExecutionRunResult["testDetails"] = [];
  let passedCount = 0;
  let failedCount = 0;
  let returnedValue: any = null;

  const timeoutMs = opts.timeoutMs || 2500;

  // Custom sandbox console
  const sandboxConsole = {
    log: (...args: any[]) => stdout.push(args.map(String).join(" ")),
    warn: (...args: any[]) => stdout.push("[WARN] " + args.map(String).join(" ")),
    error: (...args: any[]) => stderr.push("[ERROR] " + args.map(String).join(" ")),
    info: (...args: any[]) => stdout.push("[INFO] " + args.map(String).join(" ")),
  };

  // Safe Math, Array, Object, String utilities
  const sandboxContext: Record<string, any> = {
    console: sandboxConsole,
    Math: Math,
    Date: Date,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    RegExp: RegExp,
    Map: Map,
    Set: Set,
  };

  vm.createContext(sandboxContext);

  try {
    // If language is Python-like syntax, transform basic math/logic to JS for rapid node evaluation if pure calculation
    let executableCode = opts.code;
    if (opts.language === "python") {
      // Basic translation for math/algorithmic expressions
      executableCode = executableCode
        .replace(/def\s+([a-zA-Z0-9_]+)\(([^)]*)\):/g, "function $1($2) {")
        .replace(/print\((.*)\)/g, "console.log($1)")
        .replace(/True/g, "true")
        .replace(/False/g, "false")
        .replace(/None/g, "null");
    }

    const script = new vm.Script(executableCode);
    returnedValue = script.runInContext(sandboxContext, {
      timeout: timeoutMs,
      displayErrors: true,
    });

    // Run test cases if provided
    if (Array.isArray(opts.testCases) && opts.testCases.length > 0) {
      for (let i = 0; i < opts.testCases.length; i++) {
        const tc = opts.testCases[i];
        const tcName = tc.name || `Test Case #${i + 1}`;
        try {
          // If returned value is a function, invoke with input
          let actual: any;
          if (typeof returnedValue === "function") {
            const args = Array.isArray(tc.input) ? tc.input : [tc.input];
            actual = returnedValue(...args);
          } else {
            actual = returnedValue;
          }

          const passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
          if (passed) passedCount++;
          else failedCount++;

          testDetails.push({
            name: tcName,
            passed,
            actual,
            expected: tc.expected,
          });
        } catch (tcErr) {
          failedCount++;
          testDetails.push({
            name: tcName,
            passed: false,
            actual: null,
            expected: tc.expected,
            error: tcErr instanceof Error ? tcErr.message : String(tcErr),
          });
        }
      }
    }
  } catch (err) {
    stderr.push(err instanceof Error ? err.message : String(err));
  }

  return {
    stdout,
    stderr,
    returnedValue,
    passedCount,
    failedCount,
    testDetails,
    executionDurationMs: Date.now() - startTime,
  };
}

export const codeRunnerTool: ToolDefinition = {
  name: "code_runner",
  displayName: "Safe Sandboxed Code & Test Evaluator",
  description: "Execute algorithmic code, verify unit tests, calculate numerical solutions, and capture errors in an isolated sandbox.",
  category: "code",
  riskLevel: "safe",
  parameters: {
    language: {
      type: "string",
      description: "Programming language ('javascript', 'typescript', 'python')",
      required: true,
      default: "javascript",
    },
    code: {
      type: "string",
      description: "Source code snippet to execute and evaluate",
      required: true,
    },
    testCases: {
      type: "array",
      description: "Optional array of { input, expected, name } objects for automated testing",
      required: false,
    },
  },
  execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    try {
      const res = await executeCodeInSandbox({
        language: params.language || "javascript",
        code: String(params.code || ""),
        testCases: params.testCases,
      });

      const success = res.stderr.length === 0;

      return {
        toolName: "code_runner",
        success,
        output: {
          stdout: res.stdout.join("\n"),
          stderr: res.stderr.join("\n"),
          result: res.returnedValue,
          testsPassed: res.passedCount,
          testsFailed: res.failedCount,
          testDetails: res.testDetails,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        toolName: "code_runner",
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
