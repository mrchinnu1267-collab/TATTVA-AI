/**
 * TATTVA AI - Python Office Bridge
 * Connects Node.js document pipeline to native python-pptx and python-docx engines.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";

export function getPythonEngineScript(): string {
  const candidates = [
    path.resolve(process.cwd(), "app/lib/document-engine/python_office_engine.py"),
    path.resolve(process.cwd(), "frontend/app/lib/document-engine/python_office_engine.py"),
    path.resolve(__dirname, "python_office_engine.py"),
    path.resolve(__dirname, "../lib/document-engine/python_office_engine.py"),
    path.resolve(__dirname, "../../lib/document-engine/python_office_engine.py"),
    path.resolve(__dirname, "../../../app/lib/document-engine/python_office_engine.py"),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
    } catch {
      // ignore
    }
  }
  return candidates[0];
}

// Detect python command ("py" on Windows, or "python" / "python3")
let cachedPythonCmd: string | null = null;

export function getPythonCommand(): string | null {
  if (cachedPythonCmd) return cachedPythonCmd;

  const candidates = ["py", "python", "python3"];
  for (const cmd of candidates) {
    try {
      const res = spawnSync(/*turbopackIgnore: true*/ cmd, ["-c", "import pptx, docx; print('OK')"], {
        encoding: "utf8",
        timeout: 4000,
        shell: false,
      });
      if (res.status === 0 && res.stdout.includes("OK")) {
        cachedPythonCmd = cmd;
        return cmd;
      }
    } catch {
      // Continue checking next candidate
    }
  }
  return null;
}

export interface PythonOfficeResult {
  success: boolean;
  format?: string;
  buffer?: Buffer;
  slideCount?: number;
  paragraphCount?: number;
  sizeBytes?: number;
  error?: string;
}

/**
 * Execute an action on python_office_engine.py with JSON payload via stdin
 */
export function executePythonOffice(action: string, payload: any): PythonOfficeResult | null {
  const pyCmd = getPythonCommand();
  if (!pyCmd) {
    return null; // Python or python-pptx/docx not available, fall back to pure TypeScript
  }

  try {
    const pythonScript = getPythonEngineScript();
    const inputJson = JSON.stringify({ action, payload });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [pythonScript], {
      input: inputJson,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024, // 50MB
      timeout: 15000,
      shell: false,
    });

    if (proc.status !== 0 || !proc.stdout) {
      console.warn("[Python Office Bridge] Process exited with status:", proc.status, proc.stderr);
      return null;
    }

    const output = JSON.parse(proc.stdout.trim());
    if (!output.success || !output.base64) {
      return { success: false, error: output.error || "Generation failed in Python engine" };
    }

    const buffer = Buffer.from(output.base64, "base64");
    return {
      success: true,
      format: output.format,
      buffer,
      slideCount: output.slideCount,
      paragraphCount: output.paragraphCount,
      sizeBytes: buffer.length,
    };
  } catch (err: any) {
    console.warn("[Python Office Bridge] Error invoking python office engine:", err.message);
    return null;
  }
}

/**
 * Validate a PPTX buffer using python-pptx
 */
export function validatePptxWithPython(buffer: Buffer): { valid: boolean; slideCount?: number; error?: string } {
  const pyCmd = getPythonCommand();
  if (!pyCmd) return { valid: true }; // Skip if Python not installed

  try {
    const pythonScript = getPythonEngineScript();
    const inputJson = JSON.stringify({
      action: "validate_pptx",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [pythonScript], {
      input: inputJson,
      encoding: "utf8",
      timeout: 10000,
      shell: false,
    });
    if (proc.status === 0 && proc.stdout) {
      const parsed = JSON.parse(proc.stdout.trim());
      return { valid: Boolean(parsed.valid), slideCount: parsed.slideCount, error: parsed.error };
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}

/**
 * Validate a DOCX buffer using python-docx
 */
export function validateDocxWithPython(buffer: Buffer): { valid: boolean; paragraphCount?: number; error?: string } {
  const pyCmd = getPythonCommand();
  if (!pyCmd) return { valid: true }; // Skip if Python not installed

  try {
    const pythonScript = getPythonEngineScript();
    const inputJson = JSON.stringify({
      action: "validate_docx",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [pythonScript], {
      input: inputJson,
      encoding: "utf8",
      timeout: 10000,
      shell: false,
    });
    if (proc.status === 0 && proc.stdout) {
      const parsed = JSON.parse(proc.stdout.trim());
      return { valid: Boolean(parsed.valid), paragraphCount: parsed.paragraphCount, error: parsed.error };
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}

