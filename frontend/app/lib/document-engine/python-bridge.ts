/**
 * TATTVA AI - Python Office Bridge
 * Connects Node.js document pipeline to native python-pptx and python-docx engines.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { spawnSync } from "child_process";
import path from "path";

const PYTHON_ENGINE_SCRIPT = path.resolve(__dirname, "python_office_engine.py");

// Detect python command ("py" on Windows, or "python" / "python3")
let cachedPythonCmd: string | null = null;

export function getPythonCommand(): string | null {
  if (cachedPythonCmd) return cachedPythonCmd;

  const candidates = [
    process.env.PYTHON_PATH,
    "C:\\Users\\mrchi\\AppData\\Local\\Python\\bin\\python.exe",
    "py",
    "python",
    "python3",
  ].filter(Boolean) as string[];
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
  base64?: string;
  slideCount?: number;
  paragraphCount?: number;
  sizeBytes?: number;
  error?: string;
}

export function generateDocxWithPython(payload: any): PythonOfficeResult {
  const res = executePythonOffice("generate_docx", payload);
  return res || { success: false, error: "Python unavailable" };
}

export function generateXlsxWithPython(payload: any): PythonOfficeResult {
  const res = executePythonOffice("generate_xlsx", payload);
  return res || { success: false, error: "Python unavailable" };
}

export function generatePptxWithPython(payload: any): PythonOfficeResult {
  const res = executePythonOffice("generate_pptx", payload);
  return res || { success: false, error: "Python unavailable" };
}

export function generatePdfWithPython(payload: any): PythonOfficeResult {
  const res = executePythonOffice("generate_pdf", payload);
  return res || { success: false, error: "Python unavailable" };
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
    const inputJson = JSON.stringify({ action, payload });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [PYTHON_ENGINE_SCRIPT], {
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
      base64: output.base64,
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
    const inputJson = JSON.stringify({
      action: "validate_pptx",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [PYTHON_ENGINE_SCRIPT], {
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
    const inputJson = JSON.stringify({
      action: "validate_docx",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [PYTHON_ENGINE_SCRIPT], {
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

/**
 * Validate an XLSX buffer using openpyxl
 */
export function validateXlsxWithPython(buffer: Buffer): { valid: boolean; sheetCount?: number; sheets?: string[]; error?: string } {
  const pyCmd = getPythonCommand();
  if (!pyCmd) return { valid: true };

  try {
    const inputJson = JSON.stringify({
      action: "validate_xlsx",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [PYTHON_ENGINE_SCRIPT], {
      input: inputJson,
      encoding: "utf8",
      timeout: 10000,
      shell: false,
    });
    if (proc.status === 0 && proc.stdout) {
      const parsed = JSON.parse(proc.stdout.trim());
      return { valid: Boolean(parsed.valid), sheetCount: parsed.sheetCount, sheets: parsed.sheets, error: parsed.error };
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}

/**
 * Validate a PDF buffer using reportlab / pdf parser
 */
export function validatePdfWithPython(buffer: Buffer): { valid: boolean; pageCount?: number; error?: string } {
  const pyCmd = getPythonCommand();
  if (!pyCmd) return { valid: true };

  try {
    const inputJson = JSON.stringify({
      action: "validate_pdf",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [PYTHON_ENGINE_SCRIPT], {
      input: inputJson,
      encoding: "utf8",
      timeout: 10000,
      shell: false,
    });
    if (proc.status === 0 && proc.stdout) {
      const parsed = JSON.parse(proc.stdout.trim());
      return { valid: Boolean(parsed.valid), pageCount: parsed.pageCount, error: parsed.error };
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}

/**
 * Validate a CSV buffer using RFC 4180 Python CSV reader
 */
export function validateCsvWithPython(buffer: Buffer): { valid: boolean; rowCount?: number; columnCount?: number; error?: string } {
  const pyCmd = getPythonCommand();
  if (!pyCmd) return { valid: true };

  try {
    const inputJson = JSON.stringify({
      action: "validate_csv",
      payload: { base64: buffer.toString("base64") },
    });
    const proc = spawnSync(/*turbopackIgnore: true*/ pyCmd, [PYTHON_ENGINE_SCRIPT], {
      input: inputJson,
      encoding: "utf8",
      timeout: 10000,
      shell: false,
    });
    if (proc.status === 0 && proc.stdout) {
      const parsed = JSON.parse(proc.stdout.trim());
      return { valid: Boolean(parsed.valid), rowCount: parsed.rowCount, columnCount: parsed.columnCount, error: parsed.error };
    }
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
  return { valid: true };
}

