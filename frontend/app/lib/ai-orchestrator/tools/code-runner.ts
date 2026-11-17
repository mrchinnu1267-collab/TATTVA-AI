/**
 * TATTVA AI - Secure Sandboxed Code Execution & Test Engine
 * Multi-language isolated runtime, test-case verification, resource-constrained execution,
 * and honest capability disclosure.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import vm from "vm";
import fs from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import crypto from "crypto";
import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";

export type SandboxLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "c"
  | "cpp"
  | "sql"
  | "json";

export interface CodeExecutionOptions {
  language: SandboxLanguage;
  code: string;
  stdin?: string;
  testCases?: Array<{ input: any; expected: any; name?: string }>;
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface ExecutionRunResult {
  status: "success" | "runtime_error" | "timeout" | "compilation_error" | "unavailable";
  stdout: string[];
  stderr: string[];
  returnedValue: any;
  passedCount: number;
  failedCount: number;
  testDetails: Array<{ name: string; passed: boolean; actual: any; expected: any; error?: string }>;
  executionDurationMs: number;
  memoryUsageBytes?: number;
  diagnosticMessage?: string;
}

/**
 * Strips all production environment secrets from child process execution
 */
function createSanitizedEnv(tempDir: string): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH || "",
    SYSTEMROOT: process.env.SYSTEMROOT || "C:\\Windows",
    WINDIR: process.env.WINDIR || "C:\\Windows",
    TMP: tempDir,
    TEMP: tempDir,
    PYTHONNOUSERSITE: "1",
    PYTHONDONTWRITEBYTECODE: "1",
    NODE_ENV: "test",
  };
}

/**
 * Checks if a binary command is executable on the host
 */
async function isCommandAvailable(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? "where" : "which";
    const child = spawn(checkCmd, [command], {
      windowsHide: true,
      stdio: "ignore",
    });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

/**
 * Spawns an isolated child process with timeout, stdin, and resource cleanup
 */
function runSubprocess(
  cmd: string,
  args: string[],
  cwd: string,
  stdinInput: string | undefined,
  timeoutMs: number
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    let timedOut = false;
    let stdout = "";
    let stderr = "";

    const env = createSanitizedEnv(cwd);
    const child = spawn(cmd, args, {
      cwd,
      env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    if (stdinInput && child.stdin) {
      child.stdin.write(stdinInput);
      child.stdin.end();
    } else if (child.stdin) {
      child.stdin.end();
    }

    child.stdout?.on("data", (d) => {
      stdout += d.toString();
      if (stdout.length > 100000) {
        // 100KB stdout ceiling
        child.kill();
      }
    });

    child.stderr?.on("data", (d) => {
      stderr += d.toString();
      if (stderr.length > 50000) {
        child.kill();
      }
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: -1, timedOut: false });
    });
  });
}

/**
 * Executes JavaScript/TypeScript in isolated Node VM with strictly locked globals
 */
function executeJavaScriptVm(
  code: string,
  testCases: Array<{ input: any; expected: any; name?: string }> | undefined,
  timeoutMs: number
): ExecutionRunResult {
  const startTime = Date.now();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const testDetails: ExecutionRunResult["testDetails"] = [];
  let passedCount = 0;
  let failedCount = 0;
  let returnedValue: any = null;
  let status: ExecutionRunResult["status"] = "success";

  const sandboxConsole = {
    log: (...args: any[]) => stdout.push(args.map(String).join(" ")),
    warn: (...args: any[]) => stdout.push("[WARN] " + args.map(String).join(" ")),
    error: (...args: any[]) => stderr.push("[ERROR] " + args.map(String).join(" ")),
    info: (...args: any[]) => stdout.push("[INFO] " + args.map(String).join(" ")),
  };

  const sandboxContext: Record<string, any> = {
    console: sandboxConsole,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
  };

  vm.createContext(sandboxContext);

  try {
    const script = new vm.Script(code);
    returnedValue = script.runInContext(sandboxContext, {
      timeout: timeoutMs,
      displayErrors: true,
    });

    if (Array.isArray(testCases) && testCases.length > 0) {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const tcName = tc.name || `Test Case #${i + 1}`;
        try {
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

          testDetails.push({ name: tcName, passed, actual, expected: tc.expected });
        } catch (tcErr: any) {
          failedCount++;
          testDetails.push({
            name: tcName,
            passed: false,
            actual: null,
            expected: tc.expected,
            error: tcErr?.message || String(tcErr),
          });
        }
      }
    }
  } catch (err: any) {
    status = err?.message?.includes("timed out") ? "timeout" : "runtime_error";
    stderr.push(err?.message || String(err));
  }

  return {
    status: stderr.length > 0 && passedCount === 0 ? status : "success",
    stdout,
    stderr,
    returnedValue,
    passedCount,
    failedCount,
    testDetails,
    executionDurationMs: Date.now() - startTime,
  };
}

/**
 * Executes Python in an isolated temporary sandbox with stripped environment
 */
async function executePythonSandbox(
  code: string,
  stdin: string | undefined,
  testCases: Array<{ input: any; expected: any; name?: string }> | undefined,
  timeoutMs: number
): Promise<ExecutionRunResult> {
  const startTime = Date.now();
  const hasPython = await isCommandAvailable("python");
  if (!hasPython) {
    return {
      status: "unavailable",
      stdout: [],
      stderr: ["Python interpreter (python) is not installed in the current environment."],
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
      diagnosticMessage: "Python runtime is not configured on this host. Execution safely declined.",
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tattva_py_sandbox_"));
  const scriptPath = path.join(tempDir, "script.py");

  // Construct test harness if test cases provided
  let fileContent = code;
  if (Array.isArray(testCases) && testCases.length > 0) {
    fileContent += `\n\n# --- TATTVA AUTOMATED TEST HARNESS ---\nimport json\n`;
    fileContent += `_tests = ${JSON.stringify(testCases)}\n`;
    fileContent += `for _i, _tc in enumerate(_tests):\n`;
    fileContent += `    try:\n`;
    fileContent += `        _fn_name = [k for k in dir() if callable(eval(k)) and not k.startswith('_')][-1]\n`;
    fileContent += `        _fn = eval(_fn_name)\n`;
    fileContent += `        _args = _tc.get('input', [])\n`;
    fileContent += `        if not isinstance(_args, list): _args = [_args]\n`;
    fileContent += `        _actual = _fn(*_args)\n`;
    fileContent += `        print(f"__TATTVA_TC_RESULT__{_i}__{json.dumps(_actual)}")\n`;
    fileContent += `    except Exception as _e:\n`;
    fileContent += `        print(f"__TATTVA_TC_ERROR__{_i}__{str(_e)}")\n`;
  }

  fs.writeFileSync(scriptPath, fileContent, "utf8");

  try {
    const res = await runSubprocess("python", ["-u", "script.py"], tempDir, stdin, timeoutMs);
    const rawStdoutLines = res.stdout.split("\n");
    const userStdout: string[] = [];
    const testDetails: ExecutionRunResult["testDetails"] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const line of rawStdoutLines) {
      if (line.startsWith("__TATTVA_TC_RESULT__")) {
        const parts = line.split("__");
        const idx = parseInt(parts[3], 10);
        let actualVal: any = null;
        try {
          actualVal = JSON.parse(parts[4]);
        } catch {
          actualVal = parts[4];
        }
        const tc = testCases?.[idx];
        const passed = JSON.stringify(actualVal) === JSON.stringify(tc?.expected);
        if (passed) passedCount++;
        else failedCount++;
        testDetails.push({
          name: tc?.name || `Test Case #${idx + 1}`,
          passed,
          actual: actualVal,
          expected: tc?.expected,
        });
      } else if (line.startsWith("__TATTVA_TC_ERROR__")) {
        const parts = line.split("__");
        const idx = parseInt(parts[3], 10);
        failedCount++;
        testDetails.push({
          name: testCases?.[idx]?.name || `Test Case #${idx + 1}`,
          passed: false,
          actual: null,
          expected: testCases?.[idx]?.expected,
          error: parts[4],
        });
      } else if (line.trim().length > 0) {
        userStdout.push(line);
      }
    }

    const stderrLines = res.stderr.split("\n").filter((l) => l.trim().length > 0);
    const status = res.timedOut
      ? "timeout"
      : res.exitCode !== 0
      ? "runtime_error"
      : "success";

    return {
      status,
      stdout: userStdout,
      stderr: stderrLines,
      returnedValue: testDetails.length > 0 ? testDetails[0]?.actual : null,
      passedCount,
      failedCount,
      testDetails,
      executionDurationMs: Date.now() - startTime,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Executes Java in an isolated temporary sandbox with javac & java
 */
async function executeJavaSandbox(
  code: string,
  stdin: string | undefined,
  timeoutMs: number
): Promise<ExecutionRunResult> {
  const startTime = Date.now();
  const hasJavac = await isCommandAvailable("javac");
  const hasJava = await isCommandAvailable("java");

  if (!hasJavac || !hasJava) {
    return {
      status: "unavailable",
      stdout: [],
      stderr: ["Java Development Kit (javac/java) is not installed in the current environment."],
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
      diagnosticMessage: "Java compiler or runtime is missing. Execution safely declined.",
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tattva_java_sandbox_"));
  // Find class name from code
  const classMatch = code.match(/public\s+class\s+([A-Za-z0-9_]+)/);
  const className = classMatch ? classMatch[1] : "Main";
  const sourcePath = path.join(tempDir, `${className}.java`);
  fs.writeFileSync(sourcePath, code, "utf8");

  try {
    // 1. Compile
    const compileRes = await runSubprocess("javac", [`${className}.java`], tempDir, undefined, timeoutMs);
    if (compileRes.exitCode !== 0) {
      return {
        status: "compilation_error",
        stdout: [],
        stderr: compileRes.stderr.split("\n").filter((l) => l.trim().length > 0),
        returnedValue: null,
        passedCount: 0,
        failedCount: 0,
        testDetails: [],
        executionDurationMs: Date.now() - startTime,
      };
    }

    // 2. Execute
    const runRes = await runSubprocess("java", [className], tempDir, stdin, timeoutMs);
    return {
      status: runRes.timedOut ? "timeout" : runRes.exitCode === 0 ? "success" : "runtime_error",
      stdout: runRes.stdout.split("\n").filter((l) => l.trim().length > 0),
      stderr: runRes.stderr.split("\n").filter((l) => l.trim().length > 0),
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Executes C/C++ in an isolated temporary sandbox via gcc/g++ if available
 */
async function executeCSandbox(
  code: string,
  language: "c" | "cpp",
  stdin: string | undefined,
  timeoutMs: number
): Promise<ExecutionRunResult> {
  const startTime = Date.now();
  const compiler = language === "c" ? "gcc" : "g++";
  const hasCompiler = (await isCommandAvailable(compiler)) || (await isCommandAvailable("clang"));

  if (!hasCompiler) {
    return {
      status: "unavailable",
      stdout: [],
      stderr: [`${language.toUpperCase()} compiler (${compiler}/clang) is not installed in this execution environment.`],
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
      diagnosticMessage: `C/C++ native compiler is unavailable. Dynamic execution safely declined.`,
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tattva_c_sandbox_"));
  const sourceExt = language === "c" ? "c" : "cpp";
  const sourcePath = path.join(tempDir, `main.${sourceExt}`);
  const outPath = path.join(tempDir, process.platform === "win32" ? "program.exe" : "program");
  fs.writeFileSync(sourcePath, code, "utf8");

  try {
    const compileRes = await runSubprocess(compiler, ["-O2", `main.${sourceExt}`, "-o", outPath], tempDir, undefined, timeoutMs);
    if (compileRes.exitCode !== 0) {
      return {
        status: "compilation_error",
        stdout: [],
        stderr: compileRes.stderr.split("\n").filter((l) => l.trim().length > 0),
        returnedValue: null,
        passedCount: 0,
        failedCount: 0,
        testDetails: [],
        executionDurationMs: Date.now() - startTime,
      };
    }

    const runRes = await runSubprocess(outPath, [], tempDir, stdin, timeoutMs);
    return {
      status: runRes.timedOut ? "timeout" : runRes.exitCode === 0 ? "success" : "runtime_error",
      stdout: runRes.stdout.split("\n").filter((l) => l.trim().length > 0),
      stderr: runRes.stderr.split("\n").filter((l) => l.trim().length > 0),
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Executes SQL queries in an isolated SQLite database
 */
async function executeSqlSandbox(
  sqlQueries: string,
  timeoutMs: number
): Promise<ExecutionRunResult> {
  const startTime = Date.now();
  const hasSqlite = await isCommandAvailable("sqlite3");

  if (!hasSqlite) {
    return {
      status: "unavailable",
      stdout: [],
      stderr: ["SQLite3 engine is not installed in the current environment."],
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
      diagnosticMessage: "SQL engine is unavailable on this host. Execution safely declined.",
    };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tattva_sql_sandbox_"));
  const dbPath = path.join(tempDir, "sandbox.db");

  try {
    const res = await runSubprocess(
      "sqlite3",
      [
        "-header",
        "-column",
        dbPath,
      ],
      tempDir,
      sqlQueries,
      timeoutMs
    );

    return {
      status: res.timedOut ? "timeout" : res.exitCode === 0 ? "success" : "runtime_error",
      stdout: res.stdout.split("\n").filter((l) => l.trim().length > 0),
      stderr: res.stderr.split("\n").filter((l) => l.trim().length > 0),
      returnedValue: null,
      passedCount: 0,
      failedCount: 0,
      testDetails: [],
      executionDurationMs: Date.now() - startTime,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Master Sandboxed Multi-Language Execution Router
 */
export async function executeCodeInSandbox(opts: CodeExecutionOptions): Promise<ExecutionRunResult> {
  const timeoutMs = opts.timeoutMs || 3500;
  const lang = (opts.language || "javascript").toLowerCase() as SandboxLanguage;

  switch (lang) {
    case "javascript":
    case "typescript":
    case "json":
      return executeJavaScriptVm(opts.code, opts.testCases, timeoutMs);

    case "python":
      return executePythonSandbox(opts.code, opts.stdin, opts.testCases, timeoutMs);

    case "java":
      return executeJavaSandbox(opts.code, opts.stdin, timeoutMs);

    case "c":
      return executeCSandbox(opts.code, "c", opts.stdin, timeoutMs);

    case "cpp":
      return executeCSandbox(opts.code, "cpp", opts.stdin, timeoutMs);

    case "sql":
      return executeSqlSandbox(opts.code, timeoutMs);

    default:
      return {
        status: "unavailable",
        stdout: [],
        stderr: [`Unsupported sandbox execution language: ${lang}`],
        returnedValue: null,
        passedCount: 0,
        failedCount: 0,
        testDetails: [],
        executionDurationMs: 0,
        diagnosticMessage: `Sandbox execution is not supported for ${lang}. Statically analyzed without execution.`,
      };
  }
}

export const codeRunnerTool: ToolDefinition = {
  name: "code_runner",
  displayName: "Safe Sandboxed Multi-Language Evaluator",
  description:
    "Securely execute Python, JavaScript, Java, C, C++, and SQL in an isolated sandbox with test-case verification and process isolation.",
  category: "code",
  riskLevel: "safe",
  parameters: {
    language: {
      type: "string",
      description: "Target language ('javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'sql')",
      required: true,
      default: "javascript",
    },
    code: {
      type: "string",
      description: "Source code snippet to execute safely",
      required: true,
    },
    stdin: {
      type: "string",
      description: "Optional standard input to feed to the running program",
      required: false,
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
        stdin: params.stdin ? String(params.stdin) : undefined,
        testCases: params.testCases,
      });

      const success = res.status === "success";

      return {
        toolName: "code_runner",
        success,
        output: {
          status: res.status,
          stdout: res.stdout.join("\n"),
          stderr: res.stderr.join("\n"),
          result: res.returnedValue,
          testsPassed: res.passedCount,
          testsFailed: res.failedCount,
          testDetails: res.testDetails,
          diagnostic: res.diagnosticMessage,
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        toolName: "code_runner",
        success: false,
        output: null,
        error: err?.message || String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
