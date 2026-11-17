/**
 * TATTVA AI - Sandbox Terminal Command Validator & Controlled Executor
 * Whitelists developer commands, blocks destructive operations,
 * and supervises child processes with bounded timeouts.
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const WHITELISTED_BINARY_COMMANDS = new Set([
  "npm",
  "npx",
  "pnpm",
  "node",
  "python",
  "py",
  "git",
  "tsc",
  "vitest",
  "jest",
  "cargo",
  "flutter",
  "gradle",
  "gradlew",
  "pip",
  "echo",
  "cat",
  "dir",
  "ls",
  "powershell",
]);

const DANGEROUS_PATTERNS = [
  /rmdir\s+\/s\s+\/q\s+[c-zC-Z]:\\?/i,
  /del\s+\/f\s+\/s\s+\/q\s+[c-zC-Z]:\\?/i,
  /format\s+[c-zC-Z]:/i,
  /drop\s+database/i,
  /truncate\s+table/i,
  /mkfs/i,
  /:(){ :\|:& };:/, // Fork bomb
  />\s*\/dev\/sd[a-z]/i,
  /curl\s+.*\|\s*(ba)?sh/i,
  /wget\s+.*\|\s*(ba)?sh/i,
  /Invoke-WebRequest\s+.*\|\s*iex/i,
  /iex\s*\(New-Object/i,
];

export interface CommandValidationResult {
  isAllowed: boolean;
  sanitizedCommand: string;
  binary: string;
  requiresHumanApproval: boolean;
  error?: string;
}

/**
 * Validates a terminal command line before execution.
 */
export function validateCommand(commandLine: string): CommandValidationResult {
  const trimmed = commandLine.trim();
  if (!trimmed) {
    return { isAllowed: false, sanitizedCommand: "", binary: "", requiresHumanApproval: false, error: "Empty command." };
  }

  // Check destructive patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        isAllowed: false,
        sanitizedCommand: trimmed,
        binary: "",
        requiresHumanApproval: false,
        error: `Security violation: Command matched dangerous destruction pattern (${pattern}).`,
      };
    }
  }

  // Extract binary name
  const parts = trimmed.split(/\s+/);
  const binary = parts[0].toLowerCase().replace(/\.(exe|cmd|bat)$/, "");

  if (!WHITELISTED_BINARY_COMMANDS.has(binary)) {
    return {
      isAllowed: false,
      sanitizedCommand: trimmed,
      binary,
      requiresHumanApproval: true,
      error: `Command binary "${binary}" is not in the authorized developer whitelist.`,
    };
  }

  // Check if command is high-impact (e.g. git reset --hard, npm publish, git push --force)
  const isHighImpact = /git\s+(push\s+--force|reset\s+--hard)|npm\s+publish/i.test(trimmed);

  return {
    isAllowed: true,
    sanitizedCommand: trimmed,
    binary,
    requiresHumanApproval: isHighImpact,
  };
}

/**
 * Executes an authorized command with a bounded execution timeout.
 */
export async function executeSandboxCommand(
  commandLine: string,
  cwd: string = process.cwd(),
  timeoutMs: number = 60_000
): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
  const validation = validateCommand(commandLine);
  if (!validation.isAllowed) {
    throw new Error(validation.error || "Command rejected by sandbox security guard.");
  }

  const started = Date.now();
  try {
    const { stdout, stderr } = await execAsync(commandLine, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 5 * 1024 * 1024, // 5MB max output buffer
      env: {
        ...process.env,
        CI: "true",
      },
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
      durationMs: Date.now() - started,
    };
  } catch (err: any) {
    return {
      stdout: err?.stdout ? String(err.stdout).trim() : "",
      stderr: err?.stderr ? String(err.stderr).trim() : err?.message || "Execution error",
      exitCode: err?.code || 1,
      durationMs: Date.now() - started,
    };
  }
}
