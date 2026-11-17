/**
 * TATTVA AI - Sandbox Path Guard & Directory Security Enforcer
 * Enforces strict boundary isolation: prevents path traversal,
 * blocks sensitive system paths, and prevents access to credentials.
 */

import path from "path";

const RESTRICTED_SYSTEM_ROOTS = [
  "c:\\windows",
  "c:\\program files",
  "c:\\program files (x86)",
  "c:\\users\\mrchi\\appdata\\local\\microsoft",
  "/etc",
  "/bin",
  "/usr",
  "/var",
];

const BLOCKED_FILE_PATTERNS = [
  /^\.env(\.local|\.production|\.development)?$/i,
  /^id_rsa/i,
  /^credentials\.json$/i,
  /\.pem$/i,
  /\.key$/i,
];

/**
 * Validates whether a file path is safe to access within the allowed workspace.
 */
export function validateSafePath(
  targetPath: string,
  allowedRoot: string = process.cwd()
): { isSafe: boolean; resolvedPath: string; error?: string } {
  try {
    const resolvedTarget = path.resolve(allowedRoot, targetPath);
    const resolvedRoot = path.resolve(allowedRoot);

    // 1. Boundary check: must be inside allowedRoot
    const rel = path.relative(resolvedRoot, resolvedTarget);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return {
        isSafe: false,
        resolvedPath: resolvedTarget,
        error: `Access denied: Path "${targetPath}" escapes allowed workspace boundary (${resolvedRoot}).`,
      };
    }

    // 2. System roots check
    const lower = resolvedTarget.toLowerCase();
    for (const sysRoot of RESTRICTED_SYSTEM_ROOTS) {
      if (lower.startsWith(sysRoot)) {
        return {
          isSafe: false,
          resolvedPath: resolvedTarget,
          error: `Access denied: System root "${sysRoot}" is strictly protected.`,
        };
      }
    }

    // 3. Sensitive file check
    const baseName = path.basename(resolvedTarget);
    for (const pattern of BLOCKED_FILE_PATTERNS) {
      if (pattern.test(baseName)) {
        return {
          isSafe: false,
          resolvedPath: resolvedTarget,
          error: `Access denied: Modification of sensitive credential file "${baseName}" is blocked.`,
        };
      }
    }

    return { isSafe: true, resolvedPath: resolvedTarget };
  } catch (err: any) {
    return {
      isSafe: false,
      resolvedPath: targetPath,
      error: `Invalid path resolution: ${err?.message}`,
    };
  }
}
